-- Disposable project only. All fixture writes roll back.
BEGIN;
DO $$
#variable_conflict use_variable
DECLARE owner_auth uuid:=gen_random_uuid(); doctor_auth uuid:=gen_random_uuid(); doctor2_auth uuid:=gen_random_uuid(); doctor3_auth uuid:=gen_random_uuid(); reviewer_auth uuid:=gen_random_uuid(); outsider_auth uuid:=gen_random_uuid();
  facility_id uuid; doctor_identity uuid; doctor2_identity uuid; doctor3_identity uuid; reviewer_identity uuid; fixture_doctor_id uuid; doctor2_id uuid; doctor3_id uuid; doctor2_code text;
  request_id uuid; invitation_id uuid; doctor3_case_id uuid; denied boolean:=false; license_path text; degree_path text;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (owner_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-owner-'||owner_auth||'@example.test',now()),
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-doctor-'||doctor_auth||'@example.test',now()),
    (doctor2_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-doctor-'||doctor2_auth||'@example.test',now()),
    (doctor3_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-doctor-'||doctor3_auth||'@example.test',now()),
    (reviewer_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-reviewer-'||reviewer_auth||'@example.test',now()),
    (outsider_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-outsider-'||outsider_auth||'@example.test',now());
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  facility_id:=public.register_my_care_facility(jsonb_build_object('name','Association Fixture Hospital',
    'kind','hospital','address','Fixture Street, Bengaluru, Karnataka, 560001',
    'locality','Fixture Area','city','Bengaluru','state','Karnataka','pincode','560001',
    'latitude',12.9,'longitude',77.5,
    'offersBeds',false,'bedTypeCodes','[]'::jsonb));
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_registered_care_facilities()) item
    WHERE (item->>'id')::uuid=facility_id) THEN
    RAISE EXCEPTION 'Unverified facility exposed in doctor picker'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_public_hospitals()) h
    WHERE (h->>'id')::uuid=facility_id) THEN
    RAISE EXCEPTION 'Unverified hospital exposed to patients'; END IF;
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.facility SET verification_status='verified' WHERE id=facility_id;
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',doctor_auth::text,'Dr. Association Fixture') RETURNING id INTO doctor_identity;
  INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,
    practice_started_on,credential_status)
    VALUES(doctor_identity,'DOC-'||gen_random_uuid(),'Dr. Association Fixture','Fixture Council',gen_random_uuid()::text,
      '2020-01-01','pending') RETURNING id INTO fixture_doctor_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_registered_care_facilities()) item
    WHERE (item->>'id')::uuid=facility_id) THEN
    RAISE EXCEPTION 'Verified facility missing from doctor picker'; END IF;
  request_id:=public.request_my_doctor_facility(facility_id);
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM clinzo.doctor_facility WHERE doctor_facility.doctor_id=fixture_doctor_id) THEN
    RAISE EXCEPTION 'Request linked doctor before review'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  BEGIN
    PERFORM public.decide_my_facility_doctor_request(request_id,true,NULL);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Outsider approved doctor association'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  IF jsonb_array_length(public.list_my_facility_doctor_requests())<>1 THEN
    RAISE EXCEPTION 'Owner cannot see incoming request'; END IF;
  PERFORM public.decide_my_facility_doctor_request(request_id,true,NULL);
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM clinzo.doctor_facility WHERE doctor_facility.doctor_id=fixture_doctor_id) THEN
    RAISE EXCEPTION 'Facility approval bypassed company credential review'; END IF;
  UPDATE clinzo.doctor SET credential_status='verified' WHERE id=fixture_doctor_id;
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility
    WHERE doctor_facility.doctor_id=fixture_doctor_id AND doctor_facility.facility_id=facility_id AND active) THEN
    RAISE EXCEPTION 'Both approvals did not activate doctor practice'; END IF;

  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',doctor2_auth::text,'Dr. Invitation Fixture') RETURNING id INTO doctor2_identity;
  doctor2_code:='DOC-'||gen_random_uuid()::text;
  INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,
    practice_started_on,credential_status)
    VALUES(doctor2_identity,doctor2_code,'Dr. Invitation Fixture','Fixture Council',gen_random_uuid()::text,
      '2020-01-01','pending') RETURNING id INTO doctor2_id;
  INSERT INTO clinzo.doctor_onboarding_claim(doctor_id,reported_age_years,reported_gender,claimed_specialty,
    claimed_language,claimed_facility_name,contact_phone,license_storage_path)
    VALUES(doctor2_id,35,'Male','General Physician','English','Association Fixture Hospital',
      '+919876543210',doctor2_auth||'/fixture/medical.pdf');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  invitation_id:=public.invite_doctor_to_my_facility(facility_id,doctor2_code,
    'Dr. Invitation Fixture','General Physician','+919876543210');
  denied:=false;
  BEGIN
    PERFORM public.decide_my_facility_doctor_request(invitation_id,true,NULL);
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Facility accepted its own invitation without doctor'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor2_auth::text,true);
  IF jsonb_array_length(public.list_my_doctor_facility_requests())<>1 THEN
    RAISE EXCEPTION 'Doctor cannot see hospital invitation'; END IF;
  PERFORM public.respond_to_my_facility_invitation(invitation_id,true);
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM clinzo.doctor_facility WHERE doctor_facility.doctor_id=doctor2_id) THEN
    RAISE EXCEPTION 'Doctor acceptance bypassed company credential review'; END IF;
  UPDATE clinzo.doctor SET credential_status='verified' WHERE id=doctor2_id;
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility
    WHERE doctor_facility.doctor_id=doctor2_id AND doctor_facility.facility_id=facility_id AND active) THEN
    RAISE EXCEPTION 'Accepted invitation and company approval did not activate practice'; END IF;

  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',doctor3_auth::text,'Dr. Atomic Claim') RETURNING id INTO doctor3_identity;
  INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,
    practice_started_on,credential_status)
    VALUES(doctor3_identity,'DOC-'||gen_random_uuid(),'Dr. Atomic Claim','Fixture Council',gen_random_uuid()::text,
      '2020-01-01','pending') RETURNING id INTO doctor3_id;
  license_path:=doctor3_auth::text||'/fixture/registration.pdf';
  degree_path:=doctor3_auth::text||'/fixture/degree.pdf';
  INSERT INTO storage.objects(bucket_id,name) VALUES('doctor-licenses',license_path),('doctor-licenses',degree_path);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor3_auth::text,true);
  request_id:=public.submit_my_doctor_claim_for_facility(jsonb_build_object(
    'age_years',35,'gender','Female','specialty','General Physician','language','English',
    'facility_name','Association Fixture Hospital','email','fixture@example.test',
    'phone','+919876543211','license_path',license_path,'degree_path',degree_path),facility_id);
  EXECUTE 'RESET ROLE';
  IF request_id IS NULL OR NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility_request r
    WHERE r.id=request_id AND r.doctor_id=doctor3_id AND r.facility_id=facility_id)
    OR NOT EXISTS(SELECT 1 FROM clinzo.doctor_onboarding_claim WHERE doctor_id=doctor3_id) THEN
    RAISE EXCEPTION 'Atomic doctor claim did not create company and hospital requests'; END IF;
  SELECT id INTO doctor3_case_id FROM clinzo.verification_case WHERE doctor_id=doctor3_id;
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',reviewer_auth::text,'Fixture Company Reviewer') RETURNING id INTO reviewer_identity;
  INSERT INTO clinzo.company_reviewer(identity_id) VALUES(reviewer_identity);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',reviewer_auth::text,true);
  IF jsonb_array_length(public.list_company_doctor_facility_requests(doctor3_case_id))<>1 THEN
    RAISE EXCEPTION 'Company reviewer cannot see selected hospital request'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS facility_association_smoke_passed;
