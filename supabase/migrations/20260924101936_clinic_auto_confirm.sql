CREATE FUNCTION public.list_my_clinic_sessions(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor();
BEGIN
  IF NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(session_row)) FROM (
    SELECT s.id,s.starts_at,s.ends_at,s.timezone,s.hard_capacity,s.auto_confirm_limit,
      s.state,s.row_version::text AS row_version
    FROM clinzo.session s WHERE s.doctor_facility_id=p_practice_id AND s.ends_at>now()-interval '7 days'
    ORDER BY s.starts_at DESC LIMIT 100
  ) session_row),'[]'::jsonb);
END $$;

CREATE FUNCTION public.set_clinic_auto_confirm_limit(p_session_id uuid,p_expected_version bigint,p_limit integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); s clinzo.session;
BEGIN
  SELECT * INTO s FROM clinzo.session WHERE id=p_session_id FOR UPDATE;
  IF s.id IS NULL OR NOT clinzo.can_manage_practice(actor,s.doctor_facility_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  IF p_expected_version IS NULL OR s.row_version<>p_expected_version THEN
    RAISE EXCEPTION 'Session changed; refresh and retry' USING ERRCODE='40001'; END IF;
  IF p_limit IS NULL OR p_limit < 0 OR p_limit > s.hard_capacity OR s.ends_at<=now()
    OR s.state NOT IN ('published','open') THEN
    RAISE EXCEPTION 'Invalid auto-confirm limit' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.session SET auto_confirm_limit=p_limit WHERE id=s.id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','session.auto_confirm_limit_updated','session',s.id,gen_random_uuid(),'allowed',jsonb_build_object('limit',p_limit));
  RETURN s.id;
END $$;

CREATE OR REPLACE FUNCTION public.book_clinic_appointment(p_patient_id uuid,p_window_id uuid,p_practice_service_id uuid,
  p_reason text,p_idempotency_key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); s clinzo.session; w clinzo.appointment_window; ps clinzo.practice_service;
  d clinzo.doctor; f clinzo.facility; a_id uuid; old_id uuid; record clinzo.idempotency_record; fingerprint bytea; queue_row clinzo.session_queue;
BEGIN
  IF p_patient_id IS NULL OR p_window_id IS NULL OR p_practice_service_id IS NULL OR p_idempotency_key IS NULL
    OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid booking request' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    WHERE pa.patient_id=p_patient_id AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL) THEN
    RAISE EXCEPTION 'Patient access required' USING ERRCODE='42501'; END IF;
  fingerprint := sha256(convert_to(jsonb_build_array(p_patient_id,p_window_id,p_practice_service_id,trim(p_reason))::text,'UTF8'));
  SELECT * INTO record FROM clinzo.idempotency_record WHERE principal_scope=actor::text AND operation='clinic.book' AND key=p_idempotency_key::text;
  IF record.id IS NOT NULL THEN
    IF record.request_hash <> fingerprint THEN RAISE EXCEPTION 'Request key already used with different details' USING ERRCODE='22023'; END IF;
    RETURN record.resource_id;
  END IF;
  SELECT s0.* INTO s FROM clinzo.session s0 JOIN clinzo.appointment_window w0 ON w0.session_id=s0.id WHERE w0.id=p_window_id FOR UPDATE OF s0;
  SELECT * INTO w FROM clinzo.appointment_window WHERE id=p_window_id FOR UPDATE;
  SELECT ps0.* INTO ps FROM clinzo.practice_service ps0 JOIN clinzo.session_service ss ON ss.practice_service_id=ps0.id
    WHERE ps0.id=p_practice_service_id AND ss.session_id=s.id AND ps0.active;
  SELECT * INTO d FROM clinzo.doctor WHERE id=s.doctor_id;
  SELECT f0.* INTO f FROM clinzo.facility f0 JOIN clinzo.doctor_facility p ON p.facility_id=f0.id
    JOIN clinzo.organization o ON o.id=f0.organization_id WHERE p.id=s.doctor_facility_id AND p.active AND o.active;
  IF s.id IS NULL OR ps.id IS NULL OR f.id IS NULL OR NOT f.active OR NOT d.active OR d.credential_status<>'verified'
    OR s.state NOT IN ('published','open') OR w.state<>'open' OR w.starts_at<=now() THEN
    RAISE EXCEPTION 'Slot no longer available' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=d.id AND e.state='active'
    AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=s.doctor_facility_id) AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at) THEN
    RAISE EXCEPTION 'Doctor unavailable for this slot' USING ERRCODE='22023'; END IF;
  FOR old_id IN UPDATE clinzo.appointment SET status='rejected',decision_reason='Request expired',decision_by=NULL
    WHERE session_id=s.id AND status='pending' AND request_expires_at<=now() RETURNING id LOOP
    PERFORM clinzo.appointment_event(old_id,NULL,'expired');
  END LOOP;
  IF (SELECT count(*) FROM clinzo.appointment a WHERE a.session_id=s.id AND
    ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR a.status='pending')) >= s.hard_capacity
    OR (SELECT count(*) FROM clinzo.appointment a WHERE a.window_id=w.id AND
    ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR a.status='pending')) >= w.hard_capacity THEN
    RAISE EXCEPTION 'Slot is full; choose another time' USING ERRCODE='23514'; END IF;
  INSERT INTO clinzo.appointment(public_code,patient_id,session_id,window_id,practice_service_id,source,status,requested_by,
    request_expires_at,fee_minor,currency,doctor_name_snapshot,facility_name_snapshot,facility_address_snapshot,
    service_name_snapshot,doctor_registration_snapshot,reason,visit_mode)
    VALUES('APT-'||gen_random_uuid()::text,p_patient_id,s.id,w.id,ps.id,'patient_online','pending',actor,
    least(w.starts_at,now()+interval '24 hours'),ps.fee_minor,ps.currency,d.full_name,f.name,f.address,ps.name,d.registration_number,trim(p_reason),'clinic')
    RETURNING id INTO a_id;
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'clinic.book',p_idempotency_key::text,fingerprint,'appointment',a_id,'created',now()+interval '30 days');
  PERFORM clinzo.appointment_event(a_id,actor,'requested');
  IF s.auto_confirm_limit IS NOT NULL AND s.auto_confirm_limit > 0
    AND (SELECT count(*) FROM clinzo.appointment counted WHERE counted.session_id=s.id
      AND counted.confirmed_at IS NOT NULL AND counted.capacity_released_at IS NULL) < s.auto_confirm_limit THEN
    UPDATE clinzo.appointment SET status='confirmed',confirmed_at=now() WHERE id=a_id;
    INSERT INTO clinzo.session_queue(session_id) VALUES(s.id) ON CONFLICT(session_id) DO NOTHING;
    SELECT * INTO queue_row FROM clinzo.session_queue WHERE session_id=s.id FOR UPDATE;
    INSERT INTO clinzo.queue_entry(queue_id,appointment_id,ticket_number,state,order_key)
      VALUES(queue_row.id,a_id,queue_row.next_ticket,'awaiting_arrival',extract(epoch FROM w.starts_at)::bigint);
    UPDATE clinzo.session_queue SET next_ticket=next_ticket+1,queue_version=queue_version+1 WHERE id=queue_row.id;
    PERFORM clinzo.appointment_event(a_id,NULL,'auto_confirmed');
  END IF;
  RETURN a_id;
END $$;

REVOKE ALL ON FUNCTION public.list_my_clinic_sessions(uuid),public.set_clinic_auto_confirm_limit(uuid,bigint,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_my_clinic_sessions(uuid),public.set_clinic_auto_confirm_limit(uuid,bigint,integer) TO authenticated;

