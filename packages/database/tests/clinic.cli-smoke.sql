-- Run only on an explicitly disposable, fully migrated Supabase project.
-- All fixture writes, including auth.users, are rolled back.
BEGIN;

DO $$
DECLARE
  doctor_auth uuid := gen_random_uuid();
  patient_auth uuid := gen_random_uuid();
  phone_suffix bigint := floor(random() * 8000000000)::bigint + 1000000000;
  doctor_profile jsonb;
  patient_profile jsonb;
  doctor_id uuid;
  patient_id uuid;
  practice_id uuid;
  slot jsonb;
  appointment_id uuid;
  booking_key uuid := gen_random_uuid();
  start_at timestamptz := date_trunc('minute', now()) + interval '1 hour';
  version bigint;
  view_row jsonb;
  denied boolean := false;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at)
  VALUES
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||phone_suffix,now()),
    (patient_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(phone_suffix+1),now());

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
  EXECUTE 'RESET ROLE';

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

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT public.complete_onboarding('patient','{"full_name":"CLI Fixture Patient"}'::jsonb) INTO patient_profile;
  patient_id := (patient_profile->>'patient_id')::uuid;
  IF patient_id IS NULL THEN RAISE EXCEPTION 'Patient onboarding failed'; END IF;
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

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  BEGIN
    PERFORM public.book_clinic_appointment(patient_id,(slot->>'window_id')::uuid,
      (slot->>'practice_service_id')::uuid,'Unauthorized booking',gen_random_uuid());
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Doctor could book for another patient'; END IF;

  SELECT (x->>'row_version')::bigint INTO version
    FROM jsonb_array_elements(public.list_clinic_appointments(practice_id)) x
    WHERE (x->>'id')::uuid=appointment_id;
  PERFORM public.transition_clinic_appointment(appointment_id,version,'approve');
  SELECT (x->>'row_version')::bigint INTO version
    FROM jsonb_array_elements(public.list_clinic_appointments(practice_id)) x
    WHERE (x->>'id')::uuid=appointment_id;
  PERFORM public.transition_clinic_appointment(appointment_id,version,'check_in');
  SELECT (x->>'row_version')::bigint INTO version
    FROM jsonb_array_elements(public.list_clinic_appointments(practice_id)) x
    WHERE (x->>'id')::uuid=appointment_id;
  PERFORM public.transition_clinic_appointment(appointment_id,version,'call');
  SELECT (x->>'row_version')::bigint INTO version
    FROM jsonb_array_elements(public.list_clinic_appointments(practice_id)) x
    WHERE (x->>'id')::uuid=appointment_id;
  PERFORM public.transition_clinic_appointment(appointment_id,version,'start');
  SELECT (x->>'row_version')::bigint INTO version
    FROM jsonb_array_elements(public.list_clinic_appointments(practice_id)) x
    WHERE (x->>'id')::uuid=appointment_id;
  PERFORM public.transition_clinic_appointment(appointment_id,version,'complete','Signed fixture assessment');
  SELECT x INTO view_row FROM jsonb_array_elements(public.list_clinic_appointments(practice_id)) x
    WHERE (x->>'id')::uuid=appointment_id;
  IF view_row->>'status' IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'Clinic appointment did not complete';
  END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT x INTO view_row FROM jsonb_array_elements(public.list_clinic_appointments()) x
    WHERE (x->>'id')::uuid=appointment_id;
  IF view_row->>'assessment' IS DISTINCT FROM 'Signed fixture assessment' THEN
    RAISE EXCEPTION 'Patient cannot see signed assessment';
  END IF;
  EXECUTE 'RESET ROLE';
END $$;

ROLLBACK;
SELECT true AS clinic_smoke_passed;
