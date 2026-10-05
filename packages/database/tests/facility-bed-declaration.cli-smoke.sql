-- Disposable project only. Every fixture write rolls back.
BEGIN;
DO $$
DECLARE no_beds_auth uuid := gen_random_uuid(); beds_auth uuid := gen_random_uuid();
  reviewer_auth uuid := gen_random_uuid(); reviewer_identity uuid;
  no_beds_facility uuid; beds_facility uuid; case_id uuid;
  general_type uuid; private_type uuid; denied boolean := false; declaration jsonb;
BEGIN
  IF has_function_privilege('anon','public.list_bed_type_catalog()','EXECUTE')
    OR has_table_privilege('authenticated','clinzo.facility_bed_offering','SELECT') THEN
    RAISE EXCEPTION 'Bed-service catalog or offering grant is too broad'; END IF;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (no_beds_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',no_beds_auth||'@fixture.test',now()),
    (beds_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',beds_auth||'@fixture.test',now()),
    (reviewer_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',reviewer_auth||'@fixture.test',now());
  SELECT id INTO general_type FROM clinzo.bed_type WHERE code='general_ward';
  SELECT id INTO private_type FROM clinzo.bed_type WHERE code='private_room';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',no_beds_auth::text,true);
  no_beds_facility := public.register_my_care_facility(jsonb_build_object(
    'name','No Bed Fixture Clinic','kind','clinic','address','Fixture Street, Bengaluru, Karnataka, 560001',
    'locality','Fixture Area','city','Bengaluru','state','Karnataka','pincode','560001',
    'latitude',12.9,'longitude',77.5,'offersBeds',false,'bedTypeCodes','[]'::jsonb));
  BEGIN
    PERFORM public.list_facility_bed_inventory(no_beds_facility);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Pending facility could access inventory'; END IF;
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.facility SET verification_status='verified' WHERE id=no_beds_facility;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',no_beds_auth::text,true);
  IF jsonb_array_length(public.list_facility_bed_inventory(no_beds_facility))<>0 THEN
    RAISE EXCEPTION 'No-bed clinic exposed bed categories'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.update_facility_bed_inventory(no_beds_facility,general_type,2,0,0,0);
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'No-bed clinic could enter inventory'; END IF;
  PERFORM set_config('request.jwt.claim.sub',beds_auth::text,true);
  IF jsonb_array_length(public.list_bed_type_catalog())<2 THEN
    RAISE EXCEPTION 'Bed type catalog unavailable'; END IF;
  beds_facility := public.register_my_care_facility(jsonb_build_object(
    'name','Beds Fixture Clinic','kind','clinic','address','Fixture Street, Bengaluru, Karnataka, 560001',
    'locality','Fixture Area','city','Bengaluru','state','Karnataka','pincode','560001',
    'latitude',12.9,'longitude',77.5,'offersBeds',true,
    'bedTypeCodes',jsonb_build_array('general_ward')));
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility f WHERE f.id=beds_facility
    AND f.locality='Fixture Area' AND f.city='Bengaluru'
    AND f.state='Karnataka' AND f.pincode='560001') THEN
    RAISE EXCEPTION 'Structured facility address was not persisted'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',beds_auth::text,true);
  denied:=false;
  BEGIN
    PERFORM public.update_facility_bed_inventory(beds_facility,general_type,3,1,0,0);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Pending facility could update inventory'; END IF;
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.facility SET verification_status='verified' WHERE id=beds_facility;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',beds_auth::text,true);
  IF jsonb_array_length(public.list_facility_bed_inventory(beds_facility))<>1 THEN
    RAISE EXCEPTION 'Only the declared category should be manageable'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.update_facility_bed_inventory(beds_facility,private_type,1,0,0,0);
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Undeclared bed type could be written'; END IF;
  IF (public.update_facility_bed_inventory(beds_facility,general_type,3,1,0,0)->>'available') IS DISTINCT FROM '2' THEN
    RAISE EXCEPTION 'Declared category inventory could not be updated'; END IF;
  EXECUTE 'RESET ROLE';
  INSERT INTO clinzo.verification_case(facility_id) VALUES(beds_facility) RETURNING id INTO case_id;
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',reviewer_auth::text,'Fixture Reviewer') RETURNING id INTO reviewer_identity;
  INSERT INTO clinzo.company_reviewer(identity_id) VALUES(reviewer_identity);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',reviewer_auth::text,true);
  declaration:=public.get_company_facility_bed_declaration(case_id);
  IF (declaration->>'offers_beds') IS DISTINCT FROM 'true'
    OR declaration->'bed_types' IS DISTINCT FROM jsonb_build_array('General Ward') THEN
    RAISE EXCEPTION 'Reviewer cannot see declared bed service'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS facility_bed_declaration_smoke_passed;
