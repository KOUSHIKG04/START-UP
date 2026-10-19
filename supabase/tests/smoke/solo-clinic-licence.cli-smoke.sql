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
  profile:=public.get_my_verification_case('doctor',did);
  IF (profile->>'requires_clinic_licence')::boolean IS DISTINCT FROM true
    OR jsonb_array_length(profile->'documents')<>3 THEN RAISE EXCEPTION 'Doctor status missing third document'; END IF;
  EXECUTE 'RESET ROLE';
  SELECT id INTO cid FROM clinzo.verification_case WHERE doctor_id=did;
  INSERT INTO clinzo.company_reviewer(identity_id) VALUES(actor);
  EXECUTE 'SET LOCAL ROLE authenticated';
  profile:=public.get_company_verification_case(cid);
  IF (profile->'doctor'->>'requires_clinic_licence')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Reviewer missing clinic requirement'; END IF;
  EXECUTE 'RESET ROLE';
  FOR doc IN SELECT id FROM clinzo.verification_document WHERE case_id=cid AND kind<>'clinic_operating_licence' LOOP
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.review_company_verification_document(doc,'approved',NULL);
    EXECUTE 'RESET ROLE';
  END LOOP;
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.finalize_company_verification(cid,NULL);
    RAISE EXCEPTION 'Doctor finalized with clinic licence still pending';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  EXECUTE 'RESET ROLE';
  SELECT id INTO doc FROM clinzo.verification_document WHERE case_id=cid AND kind='clinic_operating_licence';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.review_company_verification_document(doc,'rejected','Upload a readable operating licence.');
  profile:=public.get_my_verification_case('doctor',did);
  IF profile->>'status'<>'needs_resubmission' THEN RAISE EXCEPTION 'Rejection did not reach doctor'; END IF;
  BEGIN
    PERFORM public.submit_my_clinic_operating_licence(degree);
    RAISE EXCEPTION 'Replacement accepted the degree as clinic evidence';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  BEGIN
    PERFORM public.submit_my_clinic_operating_licence(replacement);
    RAISE EXCEPTION 'Another identity replaced clinic evidence';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  PERFORM public.submit_my_clinic_operating_licence(replacement);
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.verification_document WHERE id=doc AND status='superseded') THEN
    RAISE EXCEPTION 'Replacement did not supersede rejected licence'; END IF;
  SELECT id INTO doc FROM clinzo.verification_document WHERE case_id=cid AND kind='clinic_operating_licence' AND version=2;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.review_company_verification_document(doc,'approved',NULL);
  PERFORM public.finalize_company_verification(cid,NULL);
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor WHERE id=did AND credential_status='verified') THEN
    RAISE EXCEPTION 'Doctor not verified after all three approvals'; END IF;
END $$;
ROLLBACK;
SELECT true AS solo_clinic_licence_smoke_passed;
