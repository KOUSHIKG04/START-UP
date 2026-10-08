-- Disposable project only. Every fixture write is rolled back.
BEGIN;
DO $$
DECLARE patient_auth uuid := gen_random_uuid(); doctor_auth uuid := gen_random_uuid();
  other_auth uuid := gen_random_uuid(); facility_auth uuid := gen_random_uuid();
  patient_path text; doctor_path text; facility_path text; facility_id uuid;
  suffix bigint := floor(random() * 8000000000)::bigint + 1000000000;
  denied boolean;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at) VALUES
    (patient_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||suffix,now()),
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(suffix+1),now()),
    (other_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(suffix+2),now());
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES(facility_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'photo-facility-'||suffix||'@example.test',now());
  patient_path := patient_auth::text || '/' || gen_random_uuid()::text || '.jpg';
  doctor_path := doctor_auth::text || '/' || gen_random_uuid()::text || '.png';
  INSERT INTO storage.objects(bucket_id,name) VALUES
    ('patient-profile-photos',patient_path),('provider-profile-photos',doctor_path);

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  PERFORM public.complete_patient_profile(jsonb_build_object('full_name','Photo Fixture Patient',
    'age_years',29,'gender','Female','blood_group','O+'));
  IF public.can_upload_provider_photo() THEN RAISE EXCEPTION 'Patient may upload provider photos'; END IF;
  PERFORM public.set_my_profile_photo('patient',patient_path,NULL);
  IF public.get_my_patient_profile_detail()->>'profile_photo_path' IS DISTINCT FROM patient_path THEN
    RAISE EXCEPTION 'Patient photo was not saved'; END IF;

  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.complete_onboarding('doctor',jsonb_build_object('full_name','Photo Fixture Doctor',
    'registration_authority','Fixture Council','registration_number',doctor_auth::text,
    'practice_started_on','2020-01-01'));
  IF NOT public.can_upload_provider_photo() THEN RAISE EXCEPTION 'Doctor may not upload provider photos'; END IF;
  PERFORM public.set_my_profile_photo('doctor',doctor_path,NULL);
  IF public.get_my_doctor_profile()->>'profile_photo_path' IS DISTINCT FROM doctor_path THEN
    RAISE EXCEPTION 'Doctor photo was not saved'; END IF;

  PERFORM set_config('request.jwt.claim.sub',facility_auth::text,true);
  facility_id := public.register_my_care_facility(jsonb_build_object(
    'name','Photo Fixture Clinic','kind','clinic','address','Fixture Road, Bengaluru',
    'locality','Fixture Area','city','Bengaluru','state','Karnataka','pincode','560001',
    'offersBeds',false,'bedTypeCodes','[]'::jsonb,'latitude',12.97,'longitude',77.59));
  IF NOT public.can_upload_provider_photo() THEN RAISE EXCEPTION 'Facility owner may not upload provider photos'; END IF;
  EXECUTE 'RESET ROLE';
  facility_path := facility_auth::text || '/' || gen_random_uuid()::text || '.jpg';
  INSERT INTO storage.objects(bucket_id,name) VALUES('provider-profile-photos',facility_path);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',facility_auth::text,true);
  PERFORM public.set_my_profile_photo('facility',facility_path,facility_id);
  EXECUTE 'RESET ROLE';
  IF (SELECT logo_path FROM clinzo.facility WHERE id = facility_id) IS DISTINCT FROM facility_path THEN
    RAISE EXCEPTION 'Facility logo was not saved'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';

  PERFORM set_config('request.jwt.claim.sub',other_auth::text,true);
  denied := false;
  BEGIN
    PERFORM public.set_my_profile_photo('patient',patient_path,NULL);
  EXCEPTION WHEN SQLSTATE '22023' OR SQLSTATE '42501' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Another user attached a patient photo'; END IF;
  denied := false;
  BEGIN
    PERFORM public.set_my_profile_photo('doctor',doctor_path,NULL);
  EXCEPTION WHEN SQLSTATE '22023' OR SQLSTATE '42501' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Another user attached a doctor photo'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS profile_photos_smoke_passed;
ROLLBACK;
