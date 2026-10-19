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
    'specialty','General Physician','specialties',jsonb_build_array('General Physician','Cardiologist','Sports Medicine'),'qualification','MBBS','language','English','facility_name','Fixture Clinic',
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
  IF (SELECT claimed_specialties FROM clinzo.doctor_onboarding_claim WHERE doctor_id=fixture_doctor_id)
    IS DISTINCT FROM ARRAY['General Physician','Cardiologist','Sports Medicine']::text[] THEN
    RAISE EXCEPTION 'Multiple specialties were not persisted';
  END IF;
  IF EXISTS(SELECT 1 FROM clinzo.doctor_specialty WHERE doctor_id=fixture_doctor_id) THEN
    RAISE EXCEPTION 'Pending claim became public';
  END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.submit_my_doctor_claim(jsonb_set(claim,'{specialties}','["Other"]'));
    RAISE EXCEPTION 'Unspecified Other was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.submit_my_doctor_claim(jsonb_set(claim,'{specialties}','["Cardiologist","cardiologist"]'));
    RAISE EXCEPTION 'Duplicate specialties were accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.submit_my_doctor_claim(jsonb_set(claim,'{email}','""'));
    RAISE EXCEPTION 'Missing contact email was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.submit_my_doctor_claim(jsonb_set(claim,'{email}','"not-an-email"'));
    RAISE EXCEPTION 'Invalid contact email was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.doctor SET credential_status='verified' WHERE id=fixture_doctor_id;
  IF (SELECT count(*) FROM clinzo.doctor_specialty WHERE doctor_id=fixture_doctor_id) <> 3 THEN
    RAISE EXCEPTION 'Reviewed specialties were not published';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor_specialty ds JOIN clinzo.specialty s ON s.id=ds.specialty_id
    WHERE ds.doctor_id=fixture_doctor_id AND s.name='Sports Medicine') THEN
    RAISE EXCEPTION 'Custom specialty label was not published';
  END IF;
END $$;
SELECT true AS doctor_multiple_specialties_smoke_passed;
ROLLBACK;
