-- Exact-target disposable validation; all fixtures roll back.
BEGIN;
DO $$
DECLARE uid uuid:=gen_random_uuid(); did uuid; actor uuid; cid uuid; doc uuid;
  profile jsonb; claim jsonb; registration text; degree text; clinic text; replacement text;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES(uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',uid||'@example.test',now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  profile:=public.complete_onboarding('solo_doctor',jsonb_build_object('full_name','Licence Fixture Doctor',
    'registration_authority','Fixture Council','registration_number',uid::text,'practice_started_on','2020-01-01',
    'clinic_name','Fixture Solo Clinic','address','Fixture Street Bengaluru','latitude',12.9,'longitude',77.5));
  did:=(profile->'doctor'->>'id')::uuid;
  EXECUTE 'RESET ROLE';
  SELECT identity_id INTO actor FROM clinzo.doctor WHERE id=did;
  registration:=uid||'/registration.pdf'; degree:=uid||'/degree.pdf';
  clinic:=uid||'/clinic.pdf'; replacement:=uid||'/replacement.pdf';
  INSERT INTO storage.objects(bucket_id,name) VALUES('doctor-licenses',registration),('doctor-licenses',degree),
    ('doctor-licenses',clinic),('doctor-licenses',replacement);
  claim:=jsonb_build_object('age_years',35,'gender','Male','specialty','General Physician','qualification','MBBS',
    'language','English','facility_name','Fixture Solo Clinic','email','fixture@example.test','phone','+919876543210',
    'license_path',registration,'degree_path',degree);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.submit_my_doctor_claim(claim);
    RAISE EXCEPTION 'Solo claim accepted without clinic operating licence';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.submit_my_doctor_claim(claim||jsonb_build_object('clinic_license_path',degree));
    RAISE EXCEPTION 'Degree reused as clinic licence';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.submit_my_doctor_claim(claim||jsonb_build_object('clinic_license_path',gen_random_uuid()||'/clinic.pdf'));
    RAISE EXCEPTION 'Unowned clinic licence accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.submit_my_doctor_claim(claim||jsonb_build_object('clinic_license_path',clinic));
  profile:=public.get_my_doctor_profile();
  IF profile->>'contact_phone' IS DISTINCT FROM '+919876543210'
    OR profile->>'contact_email' IS DISTINCT FROM 'fixture@example.test' THEN
    RAISE EXCEPTION 'Saved registration contacts missing from own profile';
  END IF;
  EXECUTE 'RESET ROLE';
  replacement:=uid||'/'||gen_random_uuid()||'.jpg';
  INSERT INTO storage.objects(bucket_id,name) VALUES('provider-profile-photos',replacement);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.set_my_profile_photo('doctor',replacement);
  profile:=public.get_my_doctor_profile();
  IF profile->>'profile_photo_path' IS DISTINCT FROM replacement THEN
    RAISE EXCEPTION 'Uploaded doctor photo missing from profile response';
  END IF;
  EXECUTE 'RESET ROLE';
  uid:=gen_random_uuid();
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES(uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',uid||'@example.test',now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  PERFORM public.complete_onboarding('doctor',jsonb_build_object('full_name','Other Fixture Doctor',
    'registration_authority','Fixture Council','registration_number',uid::text,'practice_started_on','2020-01-01'));
  profile:=public.get_my_doctor_profile();
  IF profile->>'id' = did::text OR profile->>'contact_phone' IS NOT NULL
    OR profile->>'profile_photo_path' IS NOT NULL THEN
    RAISE EXCEPTION 'Another doctor can access the original doctor contact profile';
  END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS doctor_profile_contacts_smoke_passed;
