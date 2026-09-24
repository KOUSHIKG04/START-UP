-- First clinic slice: one-off sessions, explicit approval, manual check-in,
-- queue, clinician-signed assessment. No prescriptions/payments/online visits.
CREATE FUNCTION public.list_my_practices() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT p.id AS practice_id,d.full_name AS doctor_name,f.name AS facility_name,
      d.credential_status='verified' AND d.active AS verified,
      d.identity_id=actor AS is_clinician
    FROM clinzo.doctor_facility p JOIN clinzo.doctor d ON d.id=p.doctor_id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE p.active AND f.active AND o.active AND (
      (d.identity_id=actor AND d.active) OR clinzo.can_manage_practice(actor,p.id))
    ORDER BY f.name,d.full_name LIMIT 100
  ) x),'[]'::jsonb);
END $$;

CREATE FUNCTION public.publish_clinic_session(p_practice_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,
  p_slot_minutes integer,p_fee_minor bigint,p_currency text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); d clinzo.doctor; sid uuid; service uuid; day_id uuid; slot_start timestamptz;
  n integer; existing clinzo.session;
BEGIN
  SELECT d0.* INTO d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id WHERE p.id=p_practice_id FOR UPDATE OF d0;
  IF NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) OR d.id IS NULL OR NOT d.active OR d.credential_status <> 'verified' THEN
    RAISE EXCEPTION 'Verified practice access required' USING ERRCODE='42501'; END IF;
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_slot_minutes IS NULL OR p_fee_minor IS NULL OR p_currency IS NULL
    OR p_starts_at <= now() OR p_starts_at > now()+interval '90 days' OR p_ends_at <= p_starts_at
    OR p_ends_at-p_starts_at > interval '8 hours' OR p_slot_minutes NOT BETWEEN 5 AND 120
    OR extract(epoch FROM p_ends_at-p_starts_at)::bigint % (p_slot_minutes*60) <> 0
    OR (p_starts_at AT TIME ZONE d.booking_timezone)::date <> (p_ends_at AT TIME ZONE d.booking_timezone)::date
    OR p_fee_minor NOT BETWEEN 0 AND 100000000 OR p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid session times, slot duration or fee' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing FROM clinzo.session WHERE doctor_facility_id=p_practice_id AND starts_at=p_starts_at;
  IF existing.id IS NOT NULL THEN
    IF existing.ends_at=p_ends_at AND existing.state IN ('open','published')
      AND EXISTS(SELECT 1 FROM clinzo.session_service ss JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
        WHERE ss.session_id=existing.id AND ps.fee_minor=p_fee_minor AND ps.currency=p_currency AND ps.duration_minutes=p_slot_minutes) THEN RETURN existing.id; END IF;
    RAISE EXCEPTION 'A different session already starts at this time' USING ERRCODE='23505';
  END IF;
  n := extract(epoch FROM p_ends_at-p_starts_at)::integer/(p_slot_minutes*60);
  INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone)
    VALUES(d.id,(p_starts_at AT TIME ZONE d.booking_timezone)::date,d.booking_timezone)
    ON CONFLICT(doctor_id,local_date) DO UPDATE SET timezone=excluded.timezone RETURNING id INTO day_id;
  INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
    VALUES(p_practice_id,d.id,day_id,p_starts_at,p_ends_at,d.booking_timezone,n,'published') RETURNING id INTO sid;
  INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
    VALUES(p_practice_id,'clinic-'||sid::text,'Clinic consultation',p_fee_minor,p_currency,p_slot_minutes) RETURNING id INTO service;
  INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(sid,service);
  slot_start := p_starts_at;
  WHILE slot_start < p_ends_at LOOP
    INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
      VALUES(sid,slot_start,slot_start+make_interval(mins=>p_slot_minutes),1,'open');
    slot_start := slot_start+make_interval(mins=>p_slot_minutes);
  END LOOP;
  INSERT INTO clinzo.session_queue(session_id) VALUES(sid);
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','session.published','session',sid,gen_random_uuid(),'allowed','{}');
  RETURN sid;
END $$;

CREATE FUNCTION public.list_clinic_slots(p_after timestamptz DEFAULT now(),p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_after IS NULL THEN RAISE EXCEPTION 'Invalid search' USING ERRCODE='22023'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT w.id AS window_id,ps.id AS practice_service_id,p.id AS practice_id,d.full_name AS doctor_name,
      f.name AS facility_name,f.address,w.starts_at,w.ends_at,s.timezone,ps.fee_minor::text,ps.currency
    FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    JOIN clinzo.session_service ss ON ss.session_id=s.id JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
    JOIN clinzo.doctor_facility p ON p.id=s.doctor_facility_id JOIN clinzo.doctor d ON d.id=s.doctor_id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE w.state='open' AND s.state IN ('published','open') AND w.starts_at > greatest(now(),p_after)
      AND ps.active AND p.active AND d.active AND d.credential_status='verified' AND f.active AND o.active
      AND NOT EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=d.id AND e.state='active'
        AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p.id) AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at)
      AND (SELECT count(*) FROM clinzo.appointment a WHERE a.window_id=w.id AND
        ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now()))) < w.hard_capacity
      AND (SELECT count(*) FROM clinzo.appointment a WHERE a.session_id=s.id AND
        ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now()))) < s.hard_capacity
    ORDER BY w.starts_at,w.id,ps.id LIMIT p_limit
  ) x),'[]'::jsonb);
END $$;

CREATE FUNCTION clinzo.appointment_event(p_id uuid,p_actor uuid,p_action text) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE a clinzo.appointment; request uuid := gen_random_uuid();
BEGIN
  SELECT * INTO STRICT a FROM clinzo.appointment WHERE id=p_id;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    VALUES('appointment.'||p_action,'appointment',a.id,a.row_version,p_actor,request,jsonb_build_object('status',a.status));
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(p_actor,CASE WHEN p_actor IS NULL THEN 'system' ELSE 'identity' END,
      'appointment.'||p_action,'appointment',a.id,request,'allowed','{}');
END $$;

CREATE FUNCTION public.book_clinic_appointment(p_patient_id uuid,p_window_id uuid,p_practice_service_id uuid,
  p_reason text,p_idempotency_key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); s clinzo.session; w clinzo.appointment_window; ps clinzo.practice_service;
  d clinzo.doctor; f clinzo.facility; a_id uuid; old_id uuid; record clinzo.idempotency_record; fingerprint bytea;
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
  RETURN a_id;
END $$;

CREATE FUNCTION public.list_clinic_appointments(p_practice_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF p_practice_id IS NOT NULL AND NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT a.id,a.public_code,a.status,a.row_version::text,a.patient_id,pat.full_name AS patient_name,
      a.doctor_name_snapshot AS doctor_name,a.facility_name_snapshot AS facility_name,
      CASE WHEN (d.identity_id=actor AND d.active AND d.credential_status='verified') OR EXISTS(
        SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor
          AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) THEN a.reason ELSE NULL END AS reason,
      a.fee_minor::text,a.currency,
      w.starts_at,w.ends_at,s.timezone,a.request_expires_at,a.decision_reason,q.state AS queue_state,q.ticket_number,
      (SELECT count(*) FROM clinzo.queue_entry ahead WHERE ahead.queue_id=q.queue_id AND ahead.id<>q.id AND ahead.state IN ('waiting','called','in_service')
        AND (ahead.state IN ('called','in_service') OR ahead.order_key<q.order_key))::integer AS ahead_count,
      d.identity_id=actor AND d.active AND d.credential_status='verified' AS can_consult,
      CASE WHEN (d.identity_id=actor AND d.active AND d.credential_status='verified') OR EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id
        AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) THEN
        (SELECT n.body FROM clinzo.clinical_note n JOIN clinzo.consultation c ON c.id=n.consultation_id
          WHERE c.appointment_id=a.id AND n.kind='assessment' ORDER BY n.signed_at DESC LIMIT 1) ELSE NULL END AS assessment
    FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id JOIN clinzo.doctor d ON d.id=s.doctor_id
    JOIN clinzo.appointment_window w ON w.id=a.window_id JOIN clinzo.patient pat ON pat.id=a.patient_id
    LEFT JOIN clinzo.queue_entry q ON q.appointment_id=a.id
    WHERE (p_practice_id IS NOT NULL AND s.doctor_facility_id=p_practice_id) OR
      (p_practice_id IS NULL AND EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor
        AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND pat.archived_at IS NULL))
    ORDER BY w.starts_at DESC,a.id LIMIT 100
  ) x),'[]'::jsonb);
END $$;

CREATE FUNCTION public.transition_clinic_appointment(p_appointment_id uuid,p_expected_version bigint,p_action text,p_note text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); a clinzo.appointment; s clinzo.session; w clinzo.appointment_window;
  clinician boolean; manager boolean; patient_actor boolean; q clinzo.session_queue; cid uuid;
BEGIN
  -- Session then appointment is the consistent lock order for capacity and queue changes.
  SELECT s0.* INTO s FROM clinzo.session s0 JOIN clinzo.appointment a0 ON a0.session_id=s0.id WHERE a0.id=p_appointment_id FOR UPDATE OF s0;
  SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
  manager := coalesce(clinzo.can_manage_practice(actor,s.doctor_facility_id),false);
  patient_actor := EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id WHERE pa.patient_id=a.patient_id
    AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL);
  IF a.id IS NULL OR NOT(manager OR patient_actor) THEN RAISE EXCEPTION 'Appointment access required' USING ERRCODE='42501'; END IF;
  IF p_expected_version IS NULL OR a.row_version <> p_expected_version THEN RAISE EXCEPTION 'Appointment changed; refresh and retry' USING ERRCODE='40001'; END IF;
  SELECT * INTO w FROM clinzo.appointment_window WHERE id=a.window_id;
  clinician := EXISTS(SELECT 1 FROM clinzo.doctor d WHERE d.id=s.doctor_id AND d.identity_id=actor AND d.active AND d.credential_status='verified');
  IF p_action='cancel' AND (manager OR patient_actor) AND a.status IN ('pending','confirmed') THEN
    IF NOT manager AND w.starts_at<=now() THEN RAISE EXCEPTION 'Contact the clinic to cancel after the appointment starts' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.appointment SET status='cancelled',capacity_released_at=CASE WHEN confirmed_at IS NOT NULL THEN now() END,
      decision_by=actor,decision_reason=nullif(trim(p_note),'') WHERE id=a.id;
    UPDATE clinzo.queue_entry SET state='cancelled' WHERE appointment_id=a.id;
  ELSIF p_action='approve' AND manager AND a.status='pending' THEN
    IF a.request_expires_at<=now() OR w.starts_at<=now() OR s.state NOT IN ('published','open') OR w.state<>'open'
      OR NOT EXISTS(SELECT 1 FROM clinzo.doctor d WHERE d.id=s.doctor_id AND d.active AND d.credential_status='verified') THEN
      RAISE EXCEPTION 'Request expired or practice unavailable' USING ERRCODE='22023'; END IF;
    IF EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=s.doctor_id AND e.state='active'
      AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=s.doctor_facility_id) AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at) THEN
      RAISE EXCEPTION 'Doctor unavailable for this slot' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.appointment SET status='confirmed',confirmed_at=now(),decision_by=actor WHERE id=a.id;
    SELECT * INTO q FROM clinzo.session_queue WHERE session_id=s.id FOR UPDATE;
    IF q.id IS NULL THEN INSERT INTO clinzo.session_queue(session_id) VALUES(s.id) RETURNING * INTO q; END IF;
    INSERT INTO clinzo.queue_entry(queue_id,appointment_id,ticket_number,state,order_key)
      VALUES(q.id,a.id,q.next_ticket,'awaiting_arrival',extract(epoch FROM w.starts_at)::bigint);
    UPDATE clinzo.session_queue SET next_ticket=next_ticket+1 WHERE id=q.id;
  ELSIF p_action='reject' AND manager AND a.status='pending' THEN
    IF p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Rejection reason required' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.appointment SET status='rejected',decision_by=actor,decision_reason=trim(p_note) WHERE id=a.id;
  ELSIF p_action='check_in' AND manager AND a.status='confirmed' THEN
    IF s.state NOT IN ('published','open') OR (now() AT TIME ZONE s.timezone)::date <> (s.starts_at AT TIME ZONE s.timezone)::date THEN
      RAISE EXCEPTION 'Check-in is available on the session day' USING ERRCODE='22023'; END IF;
    IF EXISTS(SELECT 1 FROM clinzo.appointment_checkin WHERE appointment_id=a.id) THEN RETURN a.id; END IF;
    INSERT INTO clinzo.appointment_checkin(appointment_id,checked_in_by,method,reason)
      VALUES(a.id,actor,'manual','Arrival confirmed in person by clinic');
    UPDATE clinzo.queue_entry SET state='waiting' WHERE appointment_id=a.id AND state='awaiting_arrival';
    UPDATE clinzo.appointment SET updated_at=now() WHERE id=a.id;
  ELSIF p_action='start' AND clinician AND a.status='confirmed' THEN
    IF s.state NOT IN ('published','open') OR (now() AT TIME ZONE s.timezone)::date <> (s.starts_at AT TIME ZONE s.timezone)::date
      OR NOT EXISTS(SELECT 1 FROM clinzo.appointment_checkin WHERE appointment_id=a.id)
      OR NOT EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=a.id AND state='waiting') THEN
      RAISE EXCEPTION 'Patient must be checked in and waiting on the session day' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.queue_entry SET state='in_service',called_at=now() WHERE appointment_id=a.id;
    INSERT INTO clinzo.consultation(appointment_id,patient_id,doctor_id,status,started_at) VALUES(a.id,a.patient_id,s.doctor_id,'active',now());
    UPDATE clinzo.appointment SET status='in_consultation' WHERE id=a.id;
  ELSIF p_action='complete' AND clinician AND a.status='in_consultation' THEN
    IF p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Signed assessment required' USING ERRCODE='22023'; END IF;
    SELECT id INTO cid FROM clinzo.consultation WHERE appointment_id=a.id AND status='active' FOR UPDATE;
    IF cid IS NULL THEN RAISE EXCEPTION 'Active consultation required' USING ERRCODE='22023'; END IF;
    INSERT INTO clinzo.clinical_note(consultation_id,author_id,kind,body,signed_at) VALUES(cid,actor,'assessment',trim(p_note),now());
    UPDATE clinzo.consultation SET status='signed',ended_at=now(),signed_at=now() WHERE id=cid;
    UPDATE clinzo.queue_entry SET state='completed' WHERE appointment_id=a.id;
    UPDATE clinzo.appointment SET status='completed' WHERE id=a.id;
  ELSE RAISE EXCEPTION 'This action is not permitted in the current state' USING ERRCODE='42501';
  END IF;
  UPDATE clinzo.session_queue SET queue_version=queue_version+1 WHERE session_id=s.id;
  PERFORM clinzo.appointment_event(a.id,actor,p_action);
  RETURN a.id;
END $$;

REVOKE ALL ON FUNCTION clinzo.appointment_event(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.list_my_practices(),public.publish_clinic_session(uuid,timestamptz,timestamptz,integer,bigint,text),
  public.list_clinic_slots(timestamptz,integer),public.book_clinic_appointment(uuid,uuid,uuid,text,uuid),
  public.list_clinic_appointments(uuid),public.transition_clinic_appointment(uuid,bigint,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_clinic_slots(timestamptz,integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_practices(),public.publish_clinic_session(uuid,timestamptz,timestamptz,integer,bigint,text),
  public.book_clinic_appointment(uuid,uuid,uuid,text,uuid),public.list_clinic_appointments(uuid),
  public.transition_clinic_appointment(uuid,bigint,text,text) TO authenticated;
