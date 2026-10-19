-- Run only on an explicitly disposable, fully migrated Supabase project.
-- All fixture writes, including auth.users, are rolled back.
BEGIN;

DO $$
<<smoke>>
DECLARE
  doctor_auth uuid := gen_random_uuid();
  patient_auth uuid := gen_random_uuid();
  manager_auth uuid := gen_random_uuid();
  phone_suffix bigint := floor(random() * 8000000000)::bigint + 1000000000;
  doctor_profile jsonb;
  patient_profile jsonb;
  manager_profile jsonb;
  doctor_id uuid;
  patient_id uuid;
  practice_id uuid;
  practice_service_id uuid;
  reviewed_facility_id uuid;
  reviewed_link_id uuid;
  facility_id uuid;
  organization_id uuid;
  slot jsonb;
  appointment_id uuid;
  checkin_token text;
  booking_key uuid := gen_random_uuid();
  start_at timestamptz := date_trunc('minute', now()) + interval '1 hour';
  version bigint;
  view_row jsonb;
  denied boolean := false;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at)
  VALUES
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||phone_suffix,now()),
    (patient_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(phone_suffix+1),now()),
    (manager_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(phone_suffix+2),now());

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  SELECT public.complete_onboarding('solo_doctor',jsonb_build_object(
    'full_name','CLI Fixture Doctor','registration_authority','Fixture Council',
    'registration_number',doctor_auth::text,'practice_started_on','2020-01-01',
    'clinic_name','CLI Fixture Clinic','address','123 Fixture Street',
    'latitude',12.9,'longitude',77.5)) INTO doctor_profile;
  IF doctor_profile->'doctor'->>'status' IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Doctor onboarding did not produce pending credentials';
  END IF;
  doctor_id := (doctor_profile->'doctor'->>'id')::uuid;
  IF public.get_my_profile()->'doctor'->>'id' IS DISTINCT FROM doctor_id::text THEN
    RAISE EXCEPTION 'Doctor profile was not linked to Auth identity';
  END IF;
  PERFORM public.update_my_doctor_profile('CLI Fixture Doctor','Fixture physician about text',ARRAY['en','kn']);
  EXECUTE 'RESET ROLE';
  SELECT f.id INTO facility_id FROM clinzo.doctor_facility df
    JOIN clinzo.facility f ON f.id=df.facility_id WHERE df.doctor_id=smoke.doctor_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.update_my_owned_clinic_location(facility_id,jsonb_build_object(
    'name','CLI Fixture Clinic','address','123 Fixture Street, Test Locality, Bengaluru, Karnataka, 560001',
    'locality','Test Locality','city','Bengaluru','state','Karnataka','pincode','560001',
    'latitude',12.9,'longitude',77.5));
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility WHERE id=facility_id
      AND locality='Test Locality' AND city='Bengaluru' AND state='Karnataka' AND pincode='560001') THEN
    RAISE EXCEPTION 'Solo clinic address parts were not persisted'; END IF;

  PERFORM clinzo.record_manual_credential_review('doctor',doctor_id,
    'verified','cli-fixture-reviewer','cli-fixture-evidence');
  UPDATE clinzo.doctor SET booking_timezone =
    CASE WHEN extract(hour FROM now() AT TIME ZONE 'UTC') >= 22
      THEN 'Pacific/Honolulu' ELSE 'UTC' END
    WHERE id=doctor_id;

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  SELECT (p->>'practice_id')::uuid INTO practice_id
    FROM jsonb_array_elements(public.list_my_practices()) p LIMIT 1;
  IF practice_id IS NULL THEN RAISE EXCEPTION 'Solo practice missing'; END IF;
  PERFORM public.publish_clinic_session(practice_id,start_at,start_at+interval '30 minutes',30,50000,'INR');
  EXECUTE 'RESET ROLE';
  SELECT id INTO practice_service_id FROM clinzo.practice_service
    WHERE doctor_facility_id=practice_id LIMIT 1;
  IF public.get_public_practice_bio(practice_id,practice_service_id) IS DISTINCT FROM 'Fixture physician about text' THEN
    RAISE EXCEPTION 'Doctor About is not public for the verified practice'; END IF;
  SELECT x INTO view_row FROM jsonb_array_elements(public.search_public_practices(
    p_latitude=>12.9,p_longitude=>77.5,p_practice_id=>practice_id)) x LIMIT 1;
  IF view_row IS NULL OR (view_row->>'distance_meters')::integer <> 0
    OR view_row->'languages' IS DISTINCT FROM '["en", "kn"]'::jsonb
    OR view_row->>'address' NOT LIKE '%Bengaluru%' THEN
    RAISE EXCEPTION 'Practice location, languages or address not discoverable'; END IF;
  SELECT x INTO view_row FROM jsonb_array_elements(public.search_public_practices(
    p_latitude=>13.0,p_longitude=>77.5,p_practice_id=>practice_id)) x LIMIT 1;
  IF (view_row->>'distance_meters')::integer < 10000 THEN
    RAISE EXCEPTION 'Practice distance did not change with patient location'; END IF;

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT public.complete_onboarding('patient','{"full_name":"CLI Fixture Patient"}'::jsonb) INTO patient_profile;
  patient_id := (patient_profile->>'patient_id')::uuid;
  IF patient_id IS NULL THEN RAISE EXCEPTION 'Patient onboarding failed'; END IF;
  patient_id := public.add_my_family_profile(jsonb_build_object('full_name','Clinic Family Fixture','birth_date','2010-01-01',
    'gender','Female','blood_group','O+','relation','Daughter','phone','+919000000015','notify',false));
  BEGIN
    PERFORM public.update_my_owned_clinic_location(facility_id,jsonb_build_object(
      'name','Unauthorized Clinic','address','123 Fixture Street','locality','Test Locality',
      'city','Bengaluru','state','Karnataka','pincode','560001',
      'latitude',12.9,'longitude',77.5));
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Patient changed doctor-owned clinic location'; END IF;
  denied := false;
  SELECT x INTO slot FROM jsonb_array_elements(public.list_clinic_slots()) x
    WHERE (x->>'practice_id')::uuid=practice_id LIMIT 1;
  IF slot IS NULL THEN RAISE EXCEPTION 'Published slot not discoverable'; END IF;
  SELECT public.book_clinic_appointment(patient_id,(slot->>'window_id')::uuid,
    (slot->>'practice_service_id')::uuid,'Fixture consultation',booking_key) INTO appointment_id;
  IF appointment_id IS NULL OR public.book_clinic_appointment(patient_id,
    (slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,
    'Fixture consultation',booking_key) IS DISTINCT FROM appointment_id THEN
    RAISE EXCEPTION 'Booking or idempotent replay failed';
  END IF;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.notification_intent ni
    JOIN clinzo.domain_event e ON e.id=ni.event_id
    JOIN clinzo.doctor d ON d.identity_id=ni.recipient_id
    WHERE d.id=smoke.doctor_id AND e.aggregate_id=smoke.appointment_id
      AND e.event_type='appointment.requested') THEN
    RAISE EXCEPTION 'Doctor booking notification missing'; END IF;

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.list_clinic_appointments()) x
    WHERE x->>'id'=appointment_id::text AND x->>'patient_id'=patient_id::text) THEN
    RAISE EXCEPTION 'Family appointment not visible to creator'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS managed_family_booking_smoke_passed;
ROLLBACK;
