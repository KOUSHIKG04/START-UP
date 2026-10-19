-- Disposable only. Exercises registration -> company approval -> profile edit.
BEGIN;
DO $$
DECLARE applicant uuid:=gen_random_uuid(); reviewer uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid();
  actor uuid; reviewer_identity uuid; application jsonb; v_case_id uuid; driver_id uuid;
  address_value jsonb:='{"building":"42","line1":"Clinic Road","line2":"Near Park","city":"Bengaluru","state":"Karnataka","pincode":"560010","latitude":12.97,"longitude":77.59}';
  details jsonb; docs jsonb:='{}'; kind text; path text; doc_id uuid; denied boolean:=false;
BEGIN
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    SELECT id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',id||'@example.test',now()
    FROM unnest(ARRAY[applicant,reviewer,stranger]) id;
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',reviewer::text,'Address Test Reviewer') RETURNING id INTO reviewer_identity;
  INSERT INTO clinzo.company_reviewer(identity_id) VALUES(reviewer_identity);
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',stranger::text,'Other Address Test User');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',applicant::text,true);
  details:=jsonb_build_object('full_name','Address Test Driver','contact_phone','+919876543210',
    'date_of_birth','1990-01-01','city','Bengaluru','consent',true,'home_address',address_value);
  application:=public.save_my_driver_registration_details(details);
  IF application->'home_address' IS DISTINCT FROM address_value THEN RAISE EXCEPTION 'Application address missing'; END IF;
  BEGIN
    PERFORM public.save_my_driver_registration_details(jsonb_set(details,'{home_address,latitude}','999'));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid coordinates accepted'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.save_my_driver_registration_details(jsonb_set(details,'{home_address}',address_value-'longitude'));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Partial coordinates accepted'; END IF;
  -- Older clients must preserve a previously saved address.
  application:=public.save_my_driver_registration_details(details-'home_address');
  IF application->'home_address' IS DISTINCT FROM address_value THEN RAISE EXCEPTION 'Legacy save erased address'; END IF;
  EXECUTE 'RESET ROLE';
  SELECT id INTO actor FROM clinzo.identity WHERE subject=applicant::text AND issuer='supabase';
  FOREACH kind IN ARRAY ARRAY['aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images'] LOOP
    path:=applicant||'/application/'||kind||'.pdf';
    INSERT INTO storage.objects(bucket_id,name) VALUES('driver-evidence',path);
    docs:=docs||jsonb_build_object(kind,path);
  END LOOP;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',applicant::text,true);
  PERFORM public.submit_my_driver_registration_application(
    jsonb_build_object('capability_code','BLS','registration_number','TEST'||substr(applicant::text,1,8)),docs);
  EXECUTE 'RESET ROLE';
  SELECT id INTO v_case_id FROM clinzo.verification_case WHERE driver_application_id=(application->>'id')::uuid;
  IF v_case_id IS NULL THEN RAISE EXCEPTION 'Driver review case missing'; END IF;
  FOR doc_id IN SELECT id FROM clinzo.verification_document WHERE verification_document.case_id=v_case_id LOOP
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.sub',reviewer::text,true);
    PERFORM public.review_company_verification_document(doc_id,'approved',NULL);
    EXECUTE 'RESET ROLE';
  END LOOP;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',reviewer::text,true);
  PERFORM public.finalize_company_verification(v_case_id,jsonb_build_object(
    'license_number','TEST-'||applicant,'license_expires_on',(current_date+365)::text,
    'inspection_expires_on',(current_date+365)::text,'capability_approved_until',now()+interval '30 days',
    'equipment_notes','Reviewed test ambulance equipment','crew_notes','Reviewed trained test crew'));
  EXECUTE 'RESET ROLE';
  SELECT id INTO driver_id FROM clinzo.driver WHERE identity_id=actor;
  IF NOT EXISTS(SELECT 1 FROM clinzo.driver WHERE id=driver_id AND home_address=address_value AND verification_status='verified')
    THEN RAISE EXCEPTION 'Approval lost driver address'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',applicant::text,true);
  address_value:=jsonb_set(address_value,'{building}','"43"');
  details:=public.update_my_driver_profile(jsonb_set(details,'{home_address}',address_value));
  IF details->'home_address' IS DISTINCT FROM address_value THEN RAISE EXCEPTION 'Profile edit address missing'; END IF;
  PERFORM set_config('request.jwt.claim.sub',stranger::text,true);
  IF public.get_my_driver_profile() IS NOT NULL OR public.get_my_driver_registration_application() IS NOT NULL
    THEN RAISE EXCEPTION 'Other user saw driver address'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS driver_address_smoke_passed;
ROLLBACK;
