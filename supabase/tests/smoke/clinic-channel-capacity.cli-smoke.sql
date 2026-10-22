-- Run inside an outer transaction and ROLLBACK. Uses a managed existing practice
-- and transient verification patients/bookings; does not create Auth accounts.
DO $$
DECLARE practice uuid; actor uuid; identity_id uuid; day date; slot jsonb; view jsonb; settings jsonb; version_before bigint;
  patient uuid; appointment uuid; previous uuid; key uuid; denied boolean; patients_before bigint; records_before bigint;
BEGIN
  SELECT settings.doctor_facility_id INTO practice
  FROM clinzo.doctor_schedule_preferences settings
  WHERE EXISTS(SELECT 1 FROM clinzo.session s JOIN clinzo.appointment_window w ON w.session_id=s.id
    WHERE s.doctor_facility_id=settings.doctor_facility_id AND clinzo.service_mode_for_session(s.id)='clinic'
      AND w.starts_at>now()+interval '1 day' AND w.state='open' AND s.state IN ('published','open'))
  ORDER BY settings.walkin_daily_limit DESC LIMIT 1;
  IF practice IS NULL THEN RAISE EXCEPTION 'No published clinic fixture available'; END IF;
  SELECT u.id,i.id INTO actor,identity_id FROM auth.users u JOIN clinzo.identity i ON i.issuer='supabase' AND i.subject=u.id::text
    WHERE i.disabled_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<now())
      AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL)
      AND clinzo.can_manage_practice(i.id,practice) LIMIT 1;
  IF actor IS NULL THEN RAISE EXCEPTION 'No authorized reception identity available'; END IF;
  SELECT bd.local_date INTO day FROM clinzo.session s JOIN clinzo.doctor_booking_day bd ON bd.id=s.booking_day_id
    JOIN clinzo.appointment_window w ON w.session_id=s.id
    WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='clinic'
      AND w.starts_at>now()+interval '1 day' AND w.state='open' AND s.state IN ('published','open')
      AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.session booked ON booked.id=a.session_id
        WHERE booked.booking_day_id=s.booking_day_id AND booked.doctor_facility_id=practice)
    GROUP BY bd.local_date HAVING count(*)>=8 ORDER BY bd.local_date LIMIT 1;
  IF day IS NULL THEN RAISE EXCEPTION 'No empty future clinic day for verification'; END IF;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  settings:=public.get_my_schedule_preferences(practice);
  version_before:=(settings->>'row_version')::bigint;
  settings:=public.save_my_schedule_preferences(practice,settings||jsonb_build_object(
    'walkin_daily_limit',5,'clinic_app_daily_limit',2,'clinic_walkin_daily_limit',3),version_before);
  IF settings->>'clinic_app_daily_limit'<>'2' OR settings->>'clinic_walkin_daily_limit'<>'3'
    OR (settings->>'row_version')::bigint<>version_before+1 THEN RAISE EXCEPTION 'Editable quota save or version increment failed'; END IF;
  denied:=false;
  BEGIN PERFORM public.save_my_schedule_preferences(practice,settings||jsonb_build_object('clinic_walkin_daily_limit',4),version_before+1);
    EXCEPTION WHEN invalid_parameter_value OR check_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid channel allocation accepted'; END IF;
  view:=public.get_portal_clinic_day(practice,day);
  IF view->>'app_remaining'<>'2' OR view->>'walkin_remaining'<>'3' THEN RAISE EXCEPTION 'Separate editable quotas not reflected'; END IF;
  IF jsonb_array_length(view->'slots')<=2 THEN RAISE EXCEPTION 'Reception cannot inspect full day'; END IF;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Clinic channel verification') RETURNING id INTO patient;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient,identity_id,'delegate',now());
  FOR n IN 1..2 LOOP
    view:=public.get_portal_clinic_day(practice,day);
    SELECT x INTO slot FROM jsonb_array_elements(view->'slots') x WHERE x->>'state'='open' LIMIT 1;
    appointment:=public.book_clinic_appointment(patient,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'',gen_random_uuid());
  END LOOP;
  view:=public.get_portal_clinic_day(practice,day);
  IF view->>'app_used'<>'2' OR view->>'app_remaining'<>'0' OR view->>'walkin_remaining'<>'3' THEN
    RAISE EXCEPTION 'App reservations consumed walk-in allocation'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) x
    WHERE ((x->>'starts_at')::timestamptz AT TIME ZONE (x->>'timezone'))::date=day) THEN
    RAISE EXCEPTION 'Patient app still offers exhausted app quota'; END IF;
  SELECT x INTO slot FROM jsonb_array_elements(view->'slots') x WHERE x->>'state'='open' LIMIT 1;
  denied:=false;
  BEGIN PERFORM public.book_clinic_appointment(patient,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'',gen_random_uuid());
    EXCEPTION WHEN check_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'App quota can be bypassed'; END IF;
  SELECT count(*) INTO patients_before FROM clinzo.patient;
  denied:=false;
  BEGIN PERFORM public.book_portal_walk_in_appointment(practice,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,
    'Reception future-day verification',NULL,'',gen_random_uuid(),29,'Other',true);
    EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied OR (SELECT count(*) FROM clinzo.patient)<>patients_before THEN RAISE EXCEPTION 'Invalid future check-in did not roll back registration'; END IF;
  FOR n IN 1..3 LOOP
    view:=public.get_portal_clinic_day(practice,day);
    SELECT x INTO slot FROM jsonb_array_elements(view->'slots') x WHERE x->>'state'='open' LIMIT 1;
    key:=gen_random_uuid();
    appointment:=public.book_portal_walk_in_appointment(practice,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,
      'Reception channel verification',NULL,'Verification only',key,29,'Other',false);
    previous:=public.book_portal_walk_in_appointment(practice,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,
      'Reception channel verification',NULL,'Verification only',key,29,'Other',false);
    IF appointment<>previous THEN RAISE EXCEPTION 'Reception idempotency failed'; END IF;
    IF NOT EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.patient p ON p.id=a.patient_id
      JOIN clinzo.queue_entry q ON q.appointment_id=a.id WHERE a.id=appointment AND a.source='reception_walk_in'
        AND p.reported_age_years=29 AND p.gender_identity='Other' AND q.state='awaiting_arrival') THEN
      RAISE EXCEPTION 'Reception demographics or shared queue entry missing'; END IF;
  END LOOP;
  view:=public.get_portal_clinic_day(practice,day);
  IF view->>'total_used'<>'5' OR view->>'walkin_used'<>'3' OR view->>'walkin_remaining'<>'0' THEN RAISE EXCEPTION 'Combined capacity incorrect'; END IF;
  SELECT x INTO slot FROM jsonb_array_elements(view->'slots') x WHERE x->>'state'='open' LIMIT 1;
  denied:=false;
  BEGIN PERFORM public.book_portal_walk_in_appointment(practice,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,
    'Excess reception verification',NULL,'',gen_random_uuid(),NULL,NULL,false);
    EXCEPTION WHEN check_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Reception or total quota can be bypassed'; END IF;
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  denied:=false;
  BEGIN PERFORM public.get_portal_clinic_day(practice,day); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unauthenticated capacity access allowed'; END IF;
END $$;
SELECT true AS clinic_channel_capacity_smoke_passed;
