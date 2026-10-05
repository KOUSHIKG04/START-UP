-- Disposable project only: every fixture write rolls back.
BEGIN;
DO $$
DECLARE patient_auth uuid:=gen_random_uuid(); doctor_auth uuid:=gen_random_uuid(); other_auth uuid:=gen_random_uuid();
  suffix bigint:=floor(random()*8000000000)::bigint+1000000000;
  profile jsonb; detail jsonb; member uuid; fixture_doctor_id uuid; path text; degree_path text;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at) VALUES
    (patient_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||suffix,now()),
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(suffix+1),now()),
    (other_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(suffix+2),now());

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT public.complete_patient_profile(jsonb_build_object('full_name','Fixture Patient',
    'age_years',28,'gender','Female','blood_group','O+','email','patient@example.com',
    'address',jsonb_build_object('building','42','line1','Fixture Road','line2','',
      'city','Bengaluru','state','Karnataka','pincode','560001'))) INTO profile;
  IF (profile->>'patient_id') IS NULL THEN RAISE EXCEPTION 'Patient profile not linked'; END IF;
  detail:=public.get_my_patient_profile_detail();
  IF detail->>'blood_group' IS DISTINCT FROM 'O+' OR detail->>'age_years' IS DISTINCT FROM '28' THEN
    RAISE EXCEPTION 'Patient health profile not saved'; END IF;
  member:=public.add_my_family_profile(jsonb_build_object('full_name','Fixture Child','age_years',9,
    'gender','Male','blood_group','A+','relation','Son','phone','+911234567890','notify',false));
  IF member IS NULL OR jsonb_array_length(public.list_my_family_profiles())<>1 THEN
    RAISE EXCEPTION 'Family profile not listed'; END IF;
  IF (public.list_my_family_profiles()->0->>'verified')::boolean THEN
    RAISE EXCEPTION 'Family access must await verification'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',other_auth::text,true);
  IF public.get_my_patient_profile_detail() IS NOT NULL OR jsonb_array_length(public.list_my_family_profiles())<>0 THEN
    RAISE EXCEPTION 'Cross-account patient details exposed'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  profile:=public.complete_onboarding('doctor',jsonb_build_object('full_name','Fixture Doctor',
    'registration_authority','Fixture Council','registration_number',doctor_auth::text,
    'practice_started_on','2020-01-01'));
  fixture_doctor_id:=(profile->'doctor'->>'id')::uuid;
  IF fixture_doctor_id IS NULL OR public.has_my_doctor_claim() THEN RAISE EXCEPTION 'Doctor pre-claim state invalid'; END IF;
  EXECUTE 'RESET ROLE';
  path:=doctor_auth::text||'/'||gen_random_uuid()::text||'.pdf';
  degree_path:=doctor_auth::text||'/'||gen_random_uuid()::text||'.pdf';
  INSERT INTO storage.objects(bucket_id,name) VALUES('doctor-licenses',path),('doctor-licenses',degree_path);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  IF NOT public.submit_my_doctor_claim(jsonb_build_object('age_years',42,'gender','Female',
    'specialty','Cardiologist','language','English','facility_name','Fixture Hospital',
    'email','doctor@example.com','phone','+911234567891','license_path',path,'degree_path',degree_path)) THEN
    RAISE EXCEPTION 'Doctor claim not saved'; END IF;
  IF NOT public.has_my_doctor_claim() THEN RAISE EXCEPTION 'Doctor claim not visible'; END IF;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.verification_document v JOIN clinzo.verification_case c ON c.id=v.case_id
    WHERE c.doctor_id=fixture_doctor_id AND v.kind='medical_degree' AND v.storage_path=degree_path AND v.status='pending') THEN
    RAISE EXCEPTION 'Degree was not queued for review'; END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='storage'
    AND tablename='objects' AND policyname='doctor_license_delete_own') THEN
    RAISE EXCEPTION 'Doctor license delete policy still present'; END IF;
END $$;
SELECT true AS onboarding_smoke_passed;
ROLLBACK;
