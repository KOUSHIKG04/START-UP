-- Disposable project only: no fixture data survives this test.
BEGIN;
DO $$
DECLARE doctor_auth uuid := gen_random_uuid(); fixture_doctor_id uuid; profile jsonb;
  license_path text; degree_path text; claim jsonb;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES(doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'dob-'||doctor_auth::text||'@example.com',now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  profile := public.complete_onboarding('doctor',jsonb_build_object('full_name','DOB Fixture Doctor',
    'registration_authority','Fixture Council','registration_number',doctor_auth::text,
    'practice_started_on','2020-01-01'));
  fixture_doctor_id := (profile->'doctor'->>'id')::uuid;
  EXECUTE 'RESET ROLE';
  license_path := doctor_auth::text||'/'||gen_random_uuid()::text||'.pdf';
  degree_path := doctor_auth::text||'/'||gen_random_uuid()::text||'.pdf';
  INSERT INTO storage.objects(bucket_id,name) VALUES('doctor-licenses',license_path),('doctor-licenses',degree_path);
  claim := jsonb_build_object('age_years',99,'birth_date','1990-03-15','gender','Female',
    'specialty','General Physician','qualification','MBBS','language','English','facility_name','Fixture Clinic',
    'email','doctor@example.com','phone','+911234567891','license_path',license_path,'degree_path',degree_path);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.submit_my_doctor_claim(claim);
  BEGIN
    PERFORM public.submit_my_doctor_claim(jsonb_set(claim,'{birth_date}','"1990-02-30"'));
    RAISE EXCEPTION 'Invalid calendar date was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.submit_my_doctor_claim(jsonb_set(claim,'{birth_date}',to_jsonb(current_date::text)));
    RAISE EXCEPTION 'Underage doctor was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor_onboarding_claim c WHERE c.doctor_id = fixture_doctor_id
    AND c.birth_date = date '1990-03-15'
    AND c.reported_age_years = extract(year FROM age(current_date,date '1990-03-15'))::integer) THEN
    RAISE EXCEPTION 'DOB was not persisted or caller age was trusted';
  END IF;
END $$;
SELECT true AS doctor_birth_date_smoke_passed;
ROLLBACK;
