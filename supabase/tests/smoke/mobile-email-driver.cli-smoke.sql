-- Disposable project only. All users, switches and profiles roll back.
BEGIN;
DO $$
DECLARE doctor_auth uuid := gen_random_uuid(); driver_auth uuid := gen_random_uuid();
  unconfirmed_auth uuid := gen_random_uuid(); suffix text := replace(gen_random_uuid()::text,'-','');
  doctor_profile jsonb; driver_profile jsonb; details jsonb; denied boolean;
BEGIN
  UPDATE clinzo.mobile_email_dev_auth SET enabled=false WHERE singleton;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','doctor-'||suffix||'@example.test',now()),
    (driver_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','driver-'||suffix||'@example.test',now()),
    (unconfirmed_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','unconfirmed-'||suffix||'@example.test',NULL);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  denied:=false;
  BEGIN
    PERFORM public.complete_onboarding('doctor',jsonb_build_object('full_name','Fixture Doctor',
      'registration_authority','Fixture Council','registration_number',suffix,'practice_started_on','2020-01-01'));
  EXCEPTION WHEN SQLSTATE '42501' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Doctor email account worked with dev switch off'; END IF;
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  doctor_profile:=public.complete_onboarding('doctor',jsonb_build_object('full_name','Fixture Doctor',
    'registration_authority','Fixture Council','registration_number',suffix,'practice_started_on','2020-01-01'));
  IF doctor_profile->'doctor'->>'status'<>'pending' THEN RAISE EXCEPTION 'Doctor scope missing'; END IF;
  PERFORM set_config('request.jwt.claim.sub',driver_auth::text,true);
  driver_profile:=public.complete_onboarding('driver_independent',jsonb_build_object('full_name','Fixture Driver',
    'license_number',suffix,'license_expires_on',(current_date+365)::text));
  IF driver_profile->'driver'->>'status'<>'pending' THEN RAISE EXCEPTION 'Driver scope missing'; END IF;
  details:=public.update_my_driver_profile(jsonb_build_object('full_name','Fixture Driver','date_of_birth','1990-01-01',
    'city','Bengaluru','contact_phone','+919876543210','consent',true));
  IF details->>'city'<>'Bengaluru' OR details->>'contact_phone'<>'+919876543210' OR details->>'verification_consent_at' IS NULL THEN
    RAISE EXCEPTION 'Driver details did not persist'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.submit_my_driver_vehicle('{}'::jsonb,'{}'::jsonb);
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Vehicle was submitted without documents'; END IF;
  PERFORM set_config('request.jwt.claim.sub',unconfirmed_auth::text,true);
  denied:=false;
  BEGIN PERFORM public.get_my_profile(); EXCEPTION WHEN SQLSTATE '42501' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unconfirmed email had a profile'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS mobile_email_driver_smoke_passed;
ROLLBACK;
