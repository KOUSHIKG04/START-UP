-- Keep phone-only onboarding/booking untouched. Only the four care-operation
-- RPCs below accept a pre-provisioned verified email portal identity, and all
-- mutations still check can_manage_practice against active facility membership.
CREATE FUNCTION clinzo.require_care_actor() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.phone IS NOT NULL AND u.phone_confirmed_at IS NOT NULL) THEN
    RETURN clinzo.require_identity();
  END IF;
  RETURN clinzo.require_portal_identity();
END $$;
REVOKE ALL ON FUNCTION clinzo.require_care_actor() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.list_my_practices() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor();
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


CREATE OR REPLACE FUNCTION public.publish_clinic_session(p_practice_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,
  p_slot_minutes integer,p_fee_minor bigint,p_currency text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); d clinzo.doctor; sid uuid; service uuid; day_id uuid; slot_start timestamptz;
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


CREATE OR REPLACE FUNCTION public.list_clinic_appointments(p_practice_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor();
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


CREATE OR REPLACE FUNCTION public.transition_clinic_appointment(p_appointment_id uuid,p_expected_version bigint,p_action text,p_note text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); a clinzo.appointment; s clinzo.session; w clinzo.appointment_window;
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
  ELSIF p_action='call' AND manager AND a.status='confirmed' THEN
    SELECT * INTO q FROM clinzo.session_queue WHERE session_id=s.id FOR UPDATE;
    IF NOT EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=a.id AND state='waiting')
      OR EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE queue_id=q.id AND state IN ('called','in_service'))
      OR a.id IS DISTINCT FROM (SELECT next_entry.appointment_id FROM clinzo.queue_entry next_entry
        WHERE next_entry.queue_id=q.id AND next_entry.state='waiting'
        ORDER BY next_entry.priority DESC,next_entry.order_key,next_entry.ticket_number LIMIT 1) THEN
      RAISE EXCEPTION 'Only the next waiting patient can be called' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.queue_entry SET state='called',called_at=now() WHERE appointment_id=a.id;
    UPDATE clinzo.appointment SET updated_at=now() WHERE id=a.id;
  ELSIF p_action='hold' AND manager AND a.status='confirmed' THEN
    IF p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 1 AND 1000
      OR NOT EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=a.id AND state IN ('waiting','called')) THEN
      RAISE EXCEPTION 'Hold reason and a waiting or called patient required' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.queue_entry SET state='held',hold_reason=trim(p_note) WHERE appointment_id=a.id;
    UPDATE clinzo.appointment SET updated_at=now() WHERE id=a.id;
  ELSIF p_action='resume' AND manager AND a.status='confirmed' THEN
    IF NOT EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=a.id AND state='held') THEN
      RAISE EXCEPTION 'Only a held patient can return to the queue' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.queue_entry SET state='waiting',hold_reason=NULL WHERE appointment_id=a.id;
    UPDATE clinzo.appointment SET updated_at=now() WHERE id=a.id;
  ELSIF p_action='no_show' AND manager AND a.status='confirmed' THEN
    IF w.ends_at>now() OR NOT EXISTS(SELECT 1 FROM clinzo.queue_entry
      WHERE appointment_id=a.id AND state IN ('awaiting_arrival','waiting','called','held')) THEN
      RAISE EXCEPTION 'No-show can be recorded after the appointment window ends' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.queue_entry SET state='no_show' WHERE appointment_id=a.id;
    UPDATE clinzo.appointment SET status='no_show',capacity_released_at=now(),decision_by=actor WHERE id=a.id;
  ELSIF p_action='start' AND clinician AND a.status='confirmed' THEN
    IF s.state NOT IN ('published','open') OR (now() AT TIME ZONE s.timezone)::date <> (s.starts_at AT TIME ZONE s.timezone)::date
      OR NOT EXISTS(SELECT 1 FROM clinzo.appointment_checkin WHERE appointment_id=a.id)
      OR NOT EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=a.id AND state='called') THEN
      RAISE EXCEPTION 'Patient must be called from the queue on the session day' USING ERRCODE='22023'; END IF;
    UPDATE clinzo.queue_entry SET state='in_service' WHERE appointment_id=a.id;
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

