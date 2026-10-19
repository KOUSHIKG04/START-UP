-- Disposable project only. The trusted switch and all fixtures roll back.
BEGIN;
DO $$
DECLARE email_auth uuid := gen_random_uuid(); unconfirmed_auth uuid := gen_random_uuid();
  profile jsonb; denied boolean; suffix text := replace(gen_random_uuid()::text, '-', '');
BEGIN
  -- Make the test independent of whether the disposable project is already
  -- enabled; this setting change also rolls back with the fixture.
  UPDATE clinzo.patient_email_dev_auth SET enabled=false WHERE singleton;
  UPDATE clinzo.mobile_email_dev_auth SET enabled=false WHERE singleton;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (email_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',suffix||'@example.test',now()),
    (unconfirmed_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','unconfirmed-'||suffix||'@example.test',NULL);

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',email_auth::text,true);
  denied := false;
  BEGIN
    PERFORM public.get_my_profile();
  EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Email-only access was allowed before trusted enablement'; END IF;
  EXECUTE 'RESET ROLE';

  UPDATE clinzo.patient_email_dev_auth SET enabled=true WHERE singleton;

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',email_auth::text,true);
  IF public.get_my_profile() IS NOT NULL THEN RAISE EXCEPTION 'New email account already has a profile'; END IF;
  profile := public.complete_patient_profile(jsonb_build_object('full_name','Email Fixture Patient',
    'age_years',27,'gender','Female','blood_group','O+','email',suffix||'@example.test'));
  IF (profile->>'patient_id') IS NULL OR profile->'doctor' <> 'null'::jsonb
    OR profile->'driver' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'Email patient profile or scope is wrong'; END IF;
  denied := false;
  BEGIN
    PERFORM public.complete_onboarding('doctor',jsonb_build_object('full_name','Wrong Role',
      'registration_authority','Test Council','registration_number',suffix,
      'practice_started_on','2020-01-01'));
  EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Email-only account entered phone-only doctor onboarding'; END IF;

  PERFORM set_config('request.jwt.claim.sub',unconfirmed_auth::text,true);
  denied := false;
  BEGIN
    PERFORM public.complete_patient_profile(jsonb_build_object('full_name','Unconfirmed User',
      'age_years',25,'gender','Male','blood_group','A+'));
  EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Unconfirmed email created a patient profile'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS patient_email_smoke_passed;
ROLLBACK;
