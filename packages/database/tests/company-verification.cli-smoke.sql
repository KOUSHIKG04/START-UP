-- Only for the disposable project. All Auth and reviewer fixtures roll back.
BEGIN;
DO $$
DECLARE auth_id uuid := gen_random_uuid(); reviewer_id uuid; queue jsonb; denied boolean := false;
  org_id uuid; facility_id uuid; case_id uuid; registration_id uuid; licence_id uuid;
  doctor_id uuid; doctor_case_id uuid; doctor_registration_id uuid; doctor_degree_id uuid;
  degree_required boolean := false;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES(auth_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      'reviewer-'||auth_id||'@example.test',now());
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',auth_id::text,'Fixture Reviewer') RETURNING id INTO reviewer_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',auth_id::text,true);
  IF public.is_company_reviewer() THEN RAISE EXCEPTION 'Unprovisioned user gained reviewer role'; END IF;
  BEGIN
    PERFORM public.list_company_verification_cases();
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Unprovisioned user read company queue'; END IF;
  EXECUTE 'RESET ROLE';
  INSERT INTO clinzo.company_reviewer(identity_id) VALUES(reviewer_id);
  INSERT INTO clinzo.organization(public_code,name,kind)
    VALUES('ORG-'||gen_random_uuid(),'Fixture Review Clinic','care_provider') RETURNING id INTO org_id;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location)
    VALUES(org_id,'CLN-'||gen_random_uuid(),'Fixture Review Clinic','clinic','Fixture Street',
      extensions.ST_SetSRID(extensions.ST_MakePoint(77.5,12.9),4326)::extensions.geography)
    RETURNING id INTO facility_id;
  INSERT INTO clinzo.verification_case(facility_id) VALUES(facility_id) RETURNING id INTO case_id;
  INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version)
    VALUES(case_id,'registration_certificate','facility-evidence',auth_id||'/fixture/registration.pdf',1)
    RETURNING id INTO registration_id;
  INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version)
    VALUES(case_id,'operating_licence','facility-evidence',auth_id||'/fixture/licence.pdf',1)
    RETURNING id INTO licence_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT public.is_company_reviewer() THEN RAISE EXCEPTION 'Provisioned reviewer denied'; END IF;
  queue:=public.list_company_verification_cases();
  IF jsonb_typeof(queue)<>'array' THEN RAISE EXCEPTION 'Queue is not an array'; END IF;
  PERFORM public.review_company_verification_document(registration_id,'approved',NULL);
  PERFORM public.review_company_verification_document(licence_id,'approved',NULL);
  PERFORM public.finalize_company_verification(case_id,NULL);
  EXECUTE 'RESET ROLE';
  INSERT INTO clinzo.doctor(public_code,full_name,registration_authority,registration_number,
    practice_started_on,credential_status)
    VALUES('DOC-'||gen_random_uuid(),'Fixture Review Doctor','Fixture Council',gen_random_uuid()::text,
      '2020-01-01','pending') RETURNING id INTO doctor_id;
  INSERT INTO clinzo.verification_case(doctor_id) VALUES(doctor_id) RETURNING id INTO doctor_case_id;
  INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version)
    VALUES(doctor_case_id,'medical_registration','doctor-licenses',auth_id||'/fixture/medical-registration.pdf',1)
    RETURNING id INTO doctor_registration_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.review_company_verification_document(doctor_registration_id,'approved',NULL);
  BEGIN
    PERFORM public.finalize_company_verification(doctor_case_id,NULL);
  EXCEPTION WHEN invalid_parameter_value THEN degree_required:=true;
  END;
  IF NOT degree_required THEN RAISE EXCEPTION 'Doctor verified without degree'; END IF;
  EXECUTE 'RESET ROLE';
  INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version)
    VALUES(doctor_case_id,'medical_degree','doctor-licenses',auth_id||'/fixture/medical-degree.pdf',1)
    RETURNING id INTO doctor_degree_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.review_company_verification_document(doctor_degree_id,'approved',NULL);
  PERFORM public.finalize_company_verification(doctor_case_id,NULL);
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility WHERE id=facility_id AND verification_status='verified')
    THEN RAISE EXCEPTION 'Facility decision not persisted'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor WHERE id=doctor_id AND credential_status='verified')
    THEN RAISE EXCEPTION 'Doctor decision not persisted'; END IF;
END $$;
ROLLBACK;
SELECT true AS company_verification_smoke_passed;
