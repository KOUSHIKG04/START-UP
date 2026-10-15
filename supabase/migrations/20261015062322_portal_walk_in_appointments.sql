-- Reception may register a patient without an app account and reserve an
-- existing published clinic window. All rows commit or roll back together.
CREATE FUNCTION public.book_portal_walk_in_appointment(
  p_practice_id uuid, p_window_id uuid, p_practice_service_id uuid,
  p_patient_name text, p_patient_phone text, p_reason text, p_idempotency_key uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := clinzo.require_care_actor();
  s clinzo.session;
  w clinzo.appointment_window;
  ps clinzo.practice_service;
  d clinzo.doctor;
  f clinzo.facility;
  queue_row clinzo.session_queue;
  previous clinzo.idempotency_record;
  fingerprint bytea;
  patient_id uuid;
  appointment_id uuid;
  expired_id uuid;
BEGIN
  IF p_practice_id IS NULL OR p_window_id IS NULL OR p_practice_service_id IS NULL
    OR p_idempotency_key IS NULL OR p_patient_name IS NULL
    OR length(btrim(p_patient_name)) NOT BETWEEN 2 AND 160
    OR (p_patient_phone IS NOT NULL AND (length(btrim(p_patient_phone)) > 30
      OR btrim(p_patient_phone) !~ '^[+0-9() .-]+$'))
    OR (p_reason IS NOT NULL AND length(btrim(p_reason)) > 1000) THEN
    RAISE EXCEPTION 'Invalid walk-in booking details' USING ERRCODE='22023';
  END IF;
  IF NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501';
  END IF;

  -- Follow the same lock order as app bookings: session, then window.
  SELECT s0.* INTO s FROM clinzo.session s0
    JOIN clinzo.appointment_window w0 ON w0.session_id=s0.id
    WHERE w0.id=p_window_id AND s0.doctor_facility_id=p_practice_id FOR UPDATE OF s0;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Slot unavailable' USING ERRCODE='22023'; END IF;
  SELECT * INTO w FROM clinzo.appointment_window WHERE id=p_window_id FOR UPDATE;

  fingerprint := sha256(convert_to(jsonb_build_array(p_practice_id,p_window_id,
    p_practice_service_id,btrim(p_patient_name),nullif(btrim(p_patient_phone),''),
    nullif(btrim(p_reason),''))::text,'UTF8'));
  SELECT * INTO previous FROM clinzo.idempotency_record
    WHERE principal_scope=actor::text AND operation='clinic.walk_in'
      AND key=p_idempotency_key::text;
  IF previous.id IS NOT NULL THEN
    IF previous.request_hash <> fingerprint THEN
      RAISE EXCEPTION 'Request key already used with different details' USING ERRCODE='22023';
    END IF;
    RETURN previous.resource_id;
  END IF;

  SELECT ps0.* INTO ps FROM clinzo.practice_service ps0
    JOIN clinzo.session_service ss ON ss.practice_service_id=ps0.id
    WHERE ps0.id=p_practice_service_id AND ss.session_id=s.id AND ps0.active;
  SELECT * INTO d FROM clinzo.doctor WHERE id=s.doctor_id;
  SELECT f0.* INTO f FROM clinzo.facility f0
    JOIN clinzo.doctor_facility p ON p.facility_id=f0.id
    JOIN clinzo.organization o ON o.id=f0.organization_id
    WHERE p.id=p_practice_id AND p.active AND o.active;
  IF ps.id IS NULL OR f.id IS NULL OR NOT f.active OR f.verification_status <> 'verified'
    OR NOT d.active OR d.credential_status <> 'verified'
    OR ps.code LIKE 'online-%' OR ps.code LIKE 'home-%'
    OR s.state NOT IN ('published','open')
    OR w.state <> 'open' OR w.starts_at <= now() THEN
    RAISE EXCEPTION 'Published in-person slot unavailable' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM clinzo.schedule_exception e
    WHERE e.doctor_id=d.id AND e.state='active'
      AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p_practice_id)
      AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at) THEN
    RAISE EXCEPTION 'Doctor unavailable for this slot' USING ERRCODE='22023';
  END IF;

  FOR expired_id IN UPDATE clinzo.appointment
    SET status='rejected',decision_reason='Request expired',decision_by=NULL
    WHERE session_id=s.id AND status='pending' AND request_expires_at<=now()
    RETURNING id LOOP
    PERFORM clinzo.appointment_event(expired_id,NULL,'expired');
  END LOOP;
  IF (SELECT count(*) FROM clinzo.appointment a WHERE a.session_id=s.id
      AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL)
        OR a.status='pending')) >= s.hard_capacity
    OR (SELECT count(*) FROM clinzo.appointment a WHERE a.window_id=w.id
      AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL)
        OR a.status='pending')) >= w.hard_capacity THEN
    RAISE EXCEPTION 'Slot is full; choose another time' USING ERRCODE='23514';
  END IF;

  INSERT INTO clinzo.patient(public_code,full_name,contact_phone)
    VALUES('PAT-'||gen_random_uuid()::text,btrim(p_patient_name),nullif(btrim(p_patient_phone),''))
    RETURNING id INTO patient_id;
  INSERT INTO clinzo.appointment(public_code,patient_id,session_id,window_id,
    practice_service_id,source,status,requested_by,confirmed_at,fee_minor,currency,
    doctor_name_snapshot,facility_name_snapshot,facility_address_snapshot,
    service_name_snapshot,doctor_registration_snapshot,reason,visit_mode)
    VALUES('APT-'||gen_random_uuid()::text,patient_id,s.id,w.id,ps.id,
      'reception_walk_in','confirmed',actor,now(),ps.fee_minor,ps.currency,
      d.full_name,f.name,f.address,ps.name,d.registration_number,
      nullif(btrim(p_reason),''),'clinic') RETURNING id INTO appointment_id;
  INSERT INTO clinzo.session_queue(session_id) VALUES(s.id)
    ON CONFLICT(session_id) DO NOTHING;
  SELECT * INTO queue_row FROM clinzo.session_queue WHERE session_id=s.id FOR UPDATE;
  INSERT INTO clinzo.queue_entry(queue_id,appointment_id,ticket_number,state,order_key)
    VALUES(queue_row.id,appointment_id,queue_row.next_ticket,'awaiting_arrival',
      extract(epoch FROM w.starts_at)::bigint);
  UPDATE clinzo.session_queue SET next_ticket=next_ticket+1,queue_version=queue_version+1
    WHERE id=queue_row.id;
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,
    resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'clinic.walk_in',p_idempotency_key::text,fingerprint,
      'appointment',appointment_id,'created',now()+interval '30 days');
  PERFORM clinzo.appointment_event(appointment_id,actor,'staff_booked');
  RETURN appointment_id;
END $$;

REVOKE ALL ON FUNCTION public.book_portal_walk_in_appointment(uuid,uuid,uuid,text,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.book_portal_walk_in_appointment(uuid,uuid,uuid,text,text,text,uuid)
  TO authenticated;
