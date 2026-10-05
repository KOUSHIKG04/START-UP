-- Disposable project only. All users, sessions and messages roll back.
BEGIN;
DO $$
<<smoke>>
DECLARE
  doctor_auth uuid := gen_random_uuid(); patient_auth uuid := gen_random_uuid(); stranger_auth uuid := gen_random_uuid();
  suffix text := replace(gen_random_uuid()::text,'-','');
  doctor_profile jsonb; patient_profile jsonb; practice_id uuid; patient_id uuid;
  online_session_id uuid; service_id uuid; slot jsonb; second_slot jsonb;
  clinic_session_id uuid; clinic_service_id uuid; clinic_slot jsonb; clinic_second_slot jsonb;
  clinic_appointment_id uuid; clinic_second_appointment_id uuid;
  appointment_id uuid; second_appointment_id uuid; second_version bigint; message_id uuid;
  starts_at timestamptz := date_trunc('minute',now()) + interval '10 minutes';
  clinic_starts_at timestamptz := (date_trunc('day',now() AT TIME ZONE 'UTC') + interval '2 days 10 hours') AT TIME ZONE 'UTC';
  context jsonb; listed jsonb; denied boolean := false;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at) VALUES
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(floor(random()*8000000000)::bigint+1000000000)::text,now()),
    (patient_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(floor(random()*8000000000)::bigint+1000000000)::text,now()),
    (stranger_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(floor(random()*8000000000)::bigint+1000000000)::text,now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  doctor_profile := public.complete_onboarding('solo_doctor',jsonb_build_object(
    'full_name','Online Fixture Doctor','registration_authority','Fixture Council',
    'registration_number',suffix,'practice_started_on','2020-01-01',
    'clinic_name','Online Fixture Clinic','address','123 Fixture Street','latitude',12.9,'longitude',77.5));
  practice_id := (public.list_my_practices()->0->>'practice_id')::uuid;
  EXECUTE 'RESET ROLE';
  PERFORM clinzo.record_manual_credential_review('doctor',(doctor_profile->'doctor'->>'id')::uuid,
    'verified','fixture-company','fixture-evidence');
  UPDATE clinzo.doctor SET booking_timezone=CASE
    WHEN extract(hour FROM starts_at AT TIME ZONE 'UTC') BETWEEN 1 AND 21
    THEN 'UTC' ELSE 'Asia/Kolkata' END
    WHERE id=(doctor_profile->'doctor'->>'id')::uuid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.save_my_schedule_preferences(practice_id,jsonb_build_object(
    'working_days',jsonb_build_array(1,2,3,4,5),'clinic_start','09:00','clinic_end','17:00',
    'slot_minutes',15,'online_daily_limit',2,'walkin_daily_limit',0,
    'auto_accept',false,'auto_accept_limit',0,'home_visits',false,
    'online_fee_minor',30000,'clinic_fee_minor',25000,'home_fee_minor',null),0);
  online_session_id := public.publish_online_session(practice_id,starts_at,starts_at+interval '30 minutes',15,30000,'INR');
  clinic_session_id := public.publish_clinic_session(practice_id,clinic_starts_at,clinic_starts_at+interval '30 minutes',15,25000,'INR');
  PERFORM public.set_clinic_auto_confirm_limit(clinic_session_id,1,1);
  EXECUTE 'RESET ROLE';
  service_id := (SELECT ps.id FROM clinzo.practice_service ps JOIN clinzo.session_service ss
    ON ss.practice_service_id=ps.id WHERE ss.session_id=online_session_id);
  clinic_service_id := (SELECT ps.id FROM clinzo.practice_service ps JOIN clinzo.session_service ss
    ON ss.practice_service_id=ps.id WHERE ss.session_id=clinic_session_id);
  IF NOT EXISTS(SELECT 1 FROM clinzo.practice_service WHERE id=service_id AND code LIKE 'online-%') THEN
    RAISE EXCEPTION 'Online service missing'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.set_clinic_auto_confirm_limit(online_session_id,1,1);
  BEGIN
    PERFORM public.publish_online_session(practice_id,starts_at+interval '30 minutes',
      starts_at+interval '45 minutes',15,30000,'INR');
  EXCEPTION WHEN SQLSTATE '22023' THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Online daily slot cap was bypassed'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  patient_profile := public.complete_onboarding('patient','{"full_name":"Online Fixture Patient"}'::jsonb);
  patient_id := (patient_profile->>'patient_id')::uuid;
  SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_clinic_slots(practice_id,service_id)) x LIMIT 1;
  IF slot IS NULL THEN RAISE EXCEPTION 'Online slot not discoverable'; END IF;
  appointment_id := public.book_clinic_appointment(patient_id,(slot->>'window_id')::uuid,service_id,
    'Online fixture consultation',gen_random_uuid());
  SELECT x INTO second_slot FROM jsonb_array_elements(public.list_practice_clinic_slots(practice_id,service_id)) x
    WHERE x->>'window_id' <> slot->>'window_id' LIMIT 1;
  IF second_slot IS NULL THEN RAISE EXCEPTION 'Second online time unavailable'; END IF;
  second_appointment_id := public.book_clinic_appointment(patient_id,(second_slot->>'window_id')::uuid,service_id,
    'Second online fixture consultation',gen_random_uuid());
  SELECT x INTO clinic_slot FROM jsonb_array_elements(public.list_practice_clinic_slots(practice_id,clinic_service_id)) x LIMIT 1;
  IF clinic_slot IS NULL THEN RAISE EXCEPTION 'Clinic slot not discoverable'; END IF;
  clinic_appointment_id := public.book_clinic_appointment(patient_id,(clinic_slot->>'window_id')::uuid,clinic_service_id,
    'Clinic fixture consultation',gen_random_uuid());
  SELECT x INTO clinic_second_slot FROM jsonb_array_elements(public.list_practice_clinic_slots(practice_id,clinic_service_id)) x
    WHERE x->>'window_id' <> clinic_slot->>'window_id' LIMIT 1;
  IF clinic_second_slot IS NULL THEN RAISE EXCEPTION 'Second clinic time unavailable'; END IF;
  clinic_second_appointment_id := public.book_clinic_appointment(patient_id,(clinic_second_slot->>'window_id')::uuid,clinic_service_id,
    'Second clinic fixture consultation',gen_random_uuid());
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=appointment_id AND visit_mode='online' AND status='confirmed') THEN
    RAISE EXCEPTION 'Online booking did not confirm'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=second_appointment_id AND visit_mode='online' AND status='pending') THEN
    RAISE EXCEPTION 'Second online booking should await doctor approval'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=clinic_appointment_id AND visit_mode='clinic' AND status='confirmed')
    OR NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=clinic_second_appointment_id AND visit_mode='clinic' AND status='pending') THEN
    RAISE EXCEPTION 'Clinic auto-confirm/request split is incorrect'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.domain_event WHERE aggregate_id=appointment_id AND event_type='appointment.requested')
    OR NOT EXISTS(SELECT 1 FROM clinzo.domain_event WHERE aggregate_id=appointment_id AND event_type='appointment.auto_confirmed')
    OR NOT EXISTS(SELECT 1 FROM clinzo.domain_event WHERE aggregate_id=second_appointment_id AND event_type='appointment.requested')
    OR EXISTS(SELECT 1 FROM clinzo.domain_event WHERE aggregate_id=second_appointment_id AND event_type='appointment.auto_confirmed') THEN
    RAISE EXCEPTION 'Auto-confirm/request event routing is incorrect'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.notification_intent WHERE safe_parameters->>'appointment_id'=appointment_id::text
      AND template_key='appointment.auto_confirmed')
    OR EXISTS(SELECT 1 FROM clinzo.notification_intent WHERE safe_parameters->>'appointment_id'=appointment_id::text
      AND template_key='appointment.requested')
    OR NOT EXISTS(SELECT 1 FROM clinzo.notification_intent WHERE safe_parameters->>'appointment_id'=second_appointment_id::text
      AND template_key='appointment.requested') THEN
    RAISE EXCEPTION 'Auto-confirm/request notifications are incorrect'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.notification_intent WHERE safe_parameters->>'appointment_id'=clinic_appointment_id::text
      AND template_key='appointment.auto_confirmed')
    OR EXISTS(SELECT 1 FROM clinzo.notification_intent WHERE safe_parameters->>'appointment_id'=clinic_appointment_id::text
      AND template_key='appointment.requested')
    OR NOT EXISTS(SELECT 1 FROM clinzo.notification_intent WHERE safe_parameters->>'appointment_id'=clinic_second_appointment_id::text
      AND template_key='appointment.requested') THEN
    RAISE EXCEPTION 'Clinic auto-confirm/request notifications are incorrect'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  context := public.get_online_join_context(appointment_id);
  IF context->>'role'<>'patient' THEN RAISE EXCEPTION 'Patient could not join'; END IF;
  message_id := public.send_online_message(appointment_id,gen_random_uuid(),'Ready for video');
  IF message_id IS NULL OR jsonb_array_length(public.list_online_messages(appointment_id))<>1 THEN
    RAISE EXCEPTION 'Patient chat failed'; END IF;
  listed := public.list_care_appointments(NULL);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(listed) x WHERE x->>'id'=appointment_id::text AND x->>'visit_mode'='online') THEN
    RAISE EXCEPTION 'Patient appointment mode missing'; END IF;
  PERFORM set_config('request.jwt.claim.sub',stranger_auth::text,true);
  IF public.get_online_join_context(appointment_id) IS NOT NULL THEN RAISE EXCEPTION 'Stranger could join'; END IF;
  denied := false;
  BEGIN PERFORM public.list_online_messages(appointment_id);
  EXCEPTION WHEN SQLSTATE '42501' THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Stranger could read chat'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  context := public.get_online_join_context(appointment_id);
  IF context->>'role'<>'doctor' THEN RAISE EXCEPTION 'Doctor could not join'; END IF;
  IF jsonb_array_length(public.list_online_messages(appointment_id))<>1 THEN
    RAISE EXCEPTION 'Doctor could not read patient chat'; END IF;
  EXECUTE 'RESET ROLE';
  SELECT row_version INTO second_version FROM clinzo.appointment WHERE id=second_appointment_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.transition_clinic_appointment(second_appointment_id,second_version,'approve');
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=second_appointment_id AND status='confirmed') THEN
    RAISE EXCEPTION 'Doctor could not accept the pending online request'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.start_online_appointment(appointment_id);
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.consultation c WHERE c.appointment_id=smoke.appointment_id AND c.status='active') THEN
    RAISE EXCEPTION 'Online consultation did not start'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.complete_online_appointment(appointment_id,'Fixture signed assessment');
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=appointment_id AND status='completed') THEN
    RAISE EXCEPTION 'Online consultation did not complete'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS online_consultation_smoke_passed;
ROLLBACK;
