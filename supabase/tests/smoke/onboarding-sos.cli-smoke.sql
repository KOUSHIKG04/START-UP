-- Disposable project only. Auth, profiles, bookings and events all roll back.
BEGIN;
DO $$
DECLARE test_auth uuid := gen_random_uuid(); other_auth uuid := gen_random_uuid();
  invalid_auth uuid := gen_random_uuid(); email_auth uuid := gen_random_uuid();
  suffix bigint := floor(random()*8000000000)::bigint+1000000000;
  pid uuid; other_pid uuid; fixture_booking_id uuid; details jsonb; state jsonb; denied boolean;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at) VALUES
    (test_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||suffix,now()),
    (other_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(suffix+1),now()),
    (invalid_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(suffix+2),now());
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES(email_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'onboarding-sos-'||email_auth||'@example.test',now());
  UPDATE clinzo.mobile_email_dev_auth SET enabled = true WHERE singleton;
  details := jsonb_build_object('full_name','Emergency Fixture Patient','contact_phone','+91'||suffix,
    'pickup_latitude',12.97,'pickup_longitude',77.59,'pickup_address','Fixture emergency pickup',
    'summary','Emergency assistance required','idempotency_key',gen_random_uuid());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',test_auth::text,true);
  fixture_booking_id := public.request_onboarding_sos(details);
  state := public.get_my_profile();
  pid := (state->>'patient_id')::uuid;
  IF pid IS NULL OR (state->>'patient_profile_complete')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Emergency onboarding must leave normal profile incomplete';
  END IF;
  IF public.request_onboarding_sos(details) IS DISTINCT FROM fixture_booking_id THEN
    RAISE EXCEPTION 'SOS retry did not return the existing booking';
  END IF;
  denied := false;
  BEGIN
    PERFORM public.request_onboarding_sos(details || '{"contact_phone":"+919876543210"}'::jsonb);
  EXCEPTION WHEN SQLSTATE '22023' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Retry changed emergency details'; END IF;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS (SELECT 1 FROM clinzo.ambulance_booking b JOIN clinzo.emergency_case e ON e.booking_id=b.id
    WHERE b.id=fixture_booking_id AND b.patient_id=pid AND b.booking_type='sos' AND b.priority=100
      AND b.contact_phone_snapshot='+91'||suffix) THEN
    RAISE EXCEPTION 'SOS was not created with its actual contact phone and emergency case';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM clinzo.domain_event e WHERE e.aggregate_id=fixture_booking_id AND e.event_type='sos.requested') THEN
    RAISE EXCEPTION 'Existing SOS dispatch event was not emitted';
  END IF;
  IF (SELECT count(*) FROM clinzo.ambulance_booking b WHERE b.patient_id=pid) <> 1 THEN
    RAISE EXCEPTION 'SOS retry duplicated the booking';
  END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.complete_patient_profile(jsonb_build_object('full_name','Completed Fixture Patient',
    'age_years',29,'gender','Female','blood_group','O+'));
  state := public.get_my_profile();
  IF (state->>'patient_id')::uuid IS DISTINCT FROM pid OR (state->>'patient_profile_complete')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Full profile did not reuse the emergency patient';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',other_auth::text,true);
  PERFORM public.request_onboarding_sos(details || jsonb_build_object('full_name','Other Emergency Patient',
    'contact_phone','+91'||(suffix+1),'idempotency_key',gen_random_uuid()));
  other_pid := (public.get_my_profile()->>'patient_id')::uuid;
  IF other_pid IS NULL OR other_pid=pid THEN RAISE EXCEPTION 'Other account reused first patient'; END IF;
  PERFORM set_config('request.jwt.claim.sub',invalid_auth::text,true);
  denied := false;
  BEGIN
    PERFORM public.request_onboarding_sos(details || jsonb_build_object('pickup_latitude',999,'idempotency_key',gen_random_uuid()));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied := true;
  END;
  IF NOT denied OR public.get_my_profile() IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid SOS must not leave an emergency profile behind';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',email_auth::text,true);
  PERFORM public.request_onboarding_sos(details || jsonb_build_object('idempotency_key',gen_random_uuid()));
  IF (public.get_my_profile()->>'patient_profile_complete')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Disposable email-auth SOS incorrectly completed profile';
  END IF;
  PERFORM set_config('request.jwt.claim.sub','',true);
  denied := false;
  BEGIN
    PERFORM public.request_onboarding_sos(details);
  EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Unauthenticated SOS allowed'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS onboarding_sos_smoke_passed;
