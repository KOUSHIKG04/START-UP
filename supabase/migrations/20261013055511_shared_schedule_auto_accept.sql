-- One shared daily auto-accept budget across service modes. Count actual
-- auto-confirmed bookings, not allocations based on which slots were published first.
CREATE OR REPLACE FUNCTION public.book_clinic_appointment(p_patient_id uuid,p_window_id uuid,p_practice_service_id uuid,
  p_reason text,p_idempotency_key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); s clinzo.session; w clinzo.appointment_window; ps clinzo.practice_service;
  d clinzo.doctor; f clinzo.facility; a_id uuid; old_id uuid; record clinzo.idempotency_record; fingerprint bytea; queue_row clinzo.session_queue;
  prefs clinzo.doctor_schedule_preferences; shared_accept boolean; shared_limit int; shared_count int;
BEGIN
  IF p_patient_id IS NULL OR p_window_id IS NULL OR p_practice_service_id IS NULL OR p_idempotency_key IS NULL
    OR p_reason IS NULL OR length(trim(p_reason)) > 1000 THEN RAISE EXCEPTION 'Invalid booking request' USING ERRCODE='22023'; END IF;
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
  IF EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.patient_id=p_patient_id AND a.window_id=w.id
    AND a.status IN ('pending','confirmed','in_consultation','completed','no_show')) THEN
    RAISE EXCEPTION 'You already booked this time' USING ERRCODE='23505'; END IF;
  IF (SELECT count(*) FROM clinzo.appointment a WHERE a.session_id=s.id AND
    ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR a.status='pending')) >= s.hard_capacity
    OR (SELECT count(*) FROM clinzo.appointment a WHERE a.window_id=w.id AND
    ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR a.status='pending')) >= w.hard_capacity THEN
    RAISE EXCEPTION 'Slot is full; choose another time' USING ERRCODE='23514'; END IF;
  INSERT INTO clinzo.appointment(public_code,patient_id,session_id,window_id,practice_service_id,source,status,requested_by,
    request_expires_at,fee_minor,currency,doctor_name_snapshot,facility_name_snapshot,facility_address_snapshot,
    service_name_snapshot,doctor_registration_snapshot,reason,visit_mode)
    VALUES('APT-'||gen_random_uuid()::text,p_patient_id,s.id,w.id,ps.id,'patient_online','pending',actor,
    least(w.starts_at,now()+interval '24 hours'),ps.fee_minor,ps.currency,d.full_name,f.name,f.address,ps.name,d.registration_number,nullif(trim(p_reason),''),'clinic')
    RETURNING id INTO a_id;
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'clinic.book',p_idempotency_key::text,fingerprint,'appointment',a_id,'created',now()+interval '30 days');
  -- Serialize decisions across this doctor's sessions/modes for the booking day.
  PERFORM 1 FROM clinzo.doctor_booking_day WHERE id=s.booking_day_id FOR UPDATE;
  SELECT * INTO prefs FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=s.doctor_facility_id;
  IF prefs.doctor_facility_id IS NOT NULL THEN
    shared_accept:=prefs.auto_accept;
    shared_limit:=prefs.auto_accept_limit;
    SELECT count(*) INTO shared_count FROM clinzo.appointment counted
      JOIN clinzo.session counted_session ON counted_session.id=counted.session_id
      WHERE counted_session.booking_day_id=s.booking_day_id AND counted.confirmed_at IS NOT NULL AND counted.capacity_released_at IS NULL
        AND EXISTS(SELECT 1 FROM clinzo.domain_event e WHERE e.aggregate_id=counted.id AND e.event_type='appointment.auto_confirmed');
  ELSE
    -- Compatibility for older sessions created without schedule preferences.
    shared_accept:=coalesce(s.auto_confirm_limit,0)>0; shared_limit:=coalesce(s.auto_confirm_limit,0);
    SELECT count(*) INTO shared_count FROM clinzo.appointment counted WHERE counted.session_id=s.id
      AND counted.confirmed_at IS NOT NULL AND counted.capacity_released_at IS NULL;
  END IF;
  IF shared_accept AND shared_count<shared_limit THEN
    UPDATE clinzo.appointment SET status='confirmed',confirmed_at=now() WHERE id=a_id;
    INSERT INTO clinzo.session_queue(session_id) VALUES(s.id) ON CONFLICT(session_id) DO NOTHING;
    SELECT * INTO queue_row FROM clinzo.session_queue WHERE session_id=s.id FOR UPDATE;
    INSERT INTO clinzo.queue_entry(queue_id,appointment_id,ticket_number,state,order_key)
      VALUES(queue_row.id,a_id,queue_row.next_ticket,'awaiting_arrival',extract(epoch FROM w.starts_at)::bigint);
    UPDATE clinzo.session_queue SET next_ticket=next_ticket+1,queue_version=queue_version+1 WHERE id=queue_row.id;
    PERFORM clinzo.appointment_event(a_id,NULL,'auto_confirmed');
  ELSE
    PERFORM clinzo.appointment_event(a_id,actor,'requested');
  END IF;
  RETURN a_id;
END $$;

CREATE OR REPLACE FUNCTION public.publish_selected_doctor_slots(
  p_practice_id uuid, p_mode text, p_slot_starts timestamptz[],
  p_slot_minutes integer, p_fee_minor bigint, p_currency text
) RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  ordered_starts timestamptz[];
  published_ids uuid[] := '{}'::uuid[];
  group_start timestamptz;
  previous_start timestamptz;
  slot_start timestamptz;
BEGIN
  IF p_slot_starts IS NULL OR cardinality(p_slot_starts) NOT BETWEEN 1 AND 100
    OR p_slot_minutes IS NULL OR p_slot_minutes NOT BETWEEN 5 AND 120
    OR array_position(p_slot_starts,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Choose between 1 and 100 valid slots' USING ERRCODE='22023';
  END IF;

  SELECT array_agg(candidate ORDER BY candidate) INTO ordered_starts
    FROM unnest(p_slot_starts) AS slots(candidate);
  group_start := ordered_starts[1];
  previous_start := group_start;

  FOR slot_index IN 2..cardinality(ordered_starts) LOOP
    slot_start := ordered_starts[slot_index];
    IF slot_start <= previous_start THEN
      RAISE EXCEPTION 'Selected slots must be unique' USING ERRCODE='22023';
    END IF;
    IF slot_start < previous_start + make_interval(mins => p_slot_minutes) THEN
      RAISE EXCEPTION 'Selected slots cannot overlap' USING ERRCODE='22023';
    END IF;
    IF slot_start > previous_start + make_interval(mins => p_slot_minutes)
      OR slot_start + make_interval(mins => p_slot_minutes) > group_start + interval '8 hours' THEN
      published_ids := array_append(published_ids,
        public.publish_doctor_service_session(p_practice_id,p_mode,group_start,
          previous_start + make_interval(mins => p_slot_minutes),
          p_slot_minutes,p_fee_minor,p_currency));
      group_start := slot_start;
    END IF;
    previous_start := slot_start;
  END LOOP;

  published_ids := array_append(published_ids,
    public.publish_doctor_service_session(p_practice_id,p_mode,group_start,
      previous_start + make_interval(mins => p_slot_minutes),
      p_slot_minutes,p_fee_minor,p_currency));
  RETURN published_ids;
END $$;
