-- Disposable project only. The test account and application roll back.
BEGIN;
DO $$
DECLARE auth_id uuid := gen_random_uuid(); suffix text := replace(gen_random_uuid()::text,'-','');
  application jsonb; denied boolean := false; docs jsonb := '{}'::jsonb; kind text; path text;
BEGIN
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (auth_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'driver-application-'||suffix||'@example.test',now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',auth_id::text,true);
  IF public.get_my_driver_registration_application() IS NOT NULL THEN
    RAISE EXCEPTION 'New account had an application'; END IF;
  application:=public.save_my_driver_registration_details(jsonb_build_object(
    'full_name','Fixture Applicant','contact_phone','+919876543210',
    'date_of_birth','1990-01-01','city','Bengaluru','consent',true));
  IF application->>'status'<>'details_saved' OR application->>'city'<>'Bengaluru' THEN
    RAISE EXCEPTION 'Driver application details did not persist'; END IF;
  BEGIN
    PERFORM public.submit_my_driver_registration_application(
      jsonb_build_object('capability_code','BLS','registration_number','KA01AB1001'),'{}'::jsonb);
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Driver application submitted without evidence'; END IF;
  EXECUTE 'RESET ROLE';
  FOREACH kind IN ARRAY ARRAY['aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images'] LOOP
    path:=auth_id::text||'/application/'||kind||'/'||suffix||'.pdf';
    INSERT INTO storage.objects(bucket_id,name) VALUES('driver-evidence',path);
    docs:=docs||jsonb_build_object(kind,path);
  END LOOP;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',auth_id::text,true);
  application:=public.submit_my_driver_registration_application(
    jsonb_build_object('capability_code','BLS','registration_number','KA01AB1001'),docs);
  IF application->>'status'<>'submitted' OR application->>'submitted_at' IS NULL THEN
    RAISE EXCEPTION 'Submitted application did not persist'; END IF;
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM clinzo.driver WHERE identity_id=(SELECT id FROM clinzo.identity WHERE subject=auth_id::text)) THEN
    RAISE EXCEPTION 'An unreviewed application became a driver'; END IF;
END $$;
SELECT true AS driver_application_smoke_passed;
ROLLBACK;
