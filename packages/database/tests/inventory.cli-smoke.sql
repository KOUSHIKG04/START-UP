-- Only run on a disposable Supabase project. Every fixture write rolls back.
BEGIN;

DO $$
DECLARE
  owner_auth uuid := gen_random_uuid();
  receptionist_auth uuid := gen_random_uuid();
  outsider_auth uuid := gen_random_uuid();
  portal_auth uuid := gen_random_uuid();
  unverified_auth uuid := gen_random_uuid();
  phone_suffix bigint := floor(random() * 8000000000)::bigint + 1000000000;
  owner_profile jsonb;
  receptionist_profile jsonb;
  org_id uuid;
  facility_id uuid;
  bed_type_id uuid;
  portal_bed_type_id uuid;
  owner_identity uuid;
  portal_identity uuid;
  row_data jsonb;
  inventory_id uuid;
  denied boolean;
BEGIN
  IF has_function_privilege('anon',
      'public.update_facility_bed_inventory(uuid,uuid,integer,integer,integer,bigint)','EXECUTE')
    OR has_table_privilege('authenticated','clinzo.facility_bed_inventory','SELECT') THEN
    RAISE EXCEPTION 'Inventory API/table grant is too broad';
  END IF;

  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at)
    VALUES
    (owner_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||phone_suffix,now()),
    (receptionist_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(phone_suffix+1),now()),
    (outsider_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(phone_suffix+2),now());

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  SELECT public.complete_onboarding('solo_doctor',jsonb_build_object(
    'full_name','Inventory Fixture Owner','registration_authority','Fixture Council',
    'registration_number',owner_auth::text,'practice_started_on','2020-01-01',
    'clinic_name','Inventory Fixture Clinic','address','123 Fixture Street',
    'latitude',12.9,'longitude',77.5)) INTO owner_profile;
  owner_identity := (owner_profile->>'identity_id')::uuid;
  org_id := (owner_profile->'memberships'->0->>'organization_id')::uuid;
  EXECUTE 'RESET ROLE';
  SELECT id INTO facility_id FROM clinzo.facility WHERE organization_id=org_id LIMIT 1;
  SELECT id INTO bed_type_id FROM clinzo.bed_type WHERE code='general_ward';
  SELECT id INTO portal_bed_type_id FROM clinzo.bed_type WHERE code='private_room';
  IF facility_id IS NULL OR bed_type_id IS NULL OR portal_bed_type_id IS NULL THEN
    RAISE EXCEPTION 'Inventory fixture setup failed';
  END IF;

  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES
    (portal_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      portal_auth::text||'@fixture.example',now()),
    (unverified_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      unverified_auth::text||'@fixture.example',NULL);
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',portal_auth::text,'Fixture Portal Admin') RETURNING id INTO portal_identity;
  INSERT INTO clinzo.organization_member(identity_id,organization_id,facility_id,role)
    VALUES(portal_identity,org_id,facility_id,'facility_admin');

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',portal_auth::text,true);
  IF (SELECT count(*) FROM jsonb_array_elements(public.list_my_inventory_facilities()) f
      WHERE (f->>'facility_id')::uuid=facility_id)<>1 THEN
    RAISE EXCEPTION 'Verified portal email cannot list its facility';
  END IF;
  IF (public.update_facility_bed_inventory(facility_id,portal_bed_type_id,2,1,0,0)->>'available') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Verified portal email cannot update inventory';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(public.list_my_practices()))<>1 THEN
    RAISE EXCEPTION 'Verified portal admin cannot list its clinic practice';
  END IF;
  denied := false;
  BEGIN
    PERFORM public.book_clinic_appointment(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
      'Portal actor must not book for a patient',gen_random_uuid());
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Email-only portal session reached phone-gated patient booking'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',unverified_auth::text,true);
  denied := false;
  BEGIN
    PERFORM public.list_my_inventory_facilities();
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Unverified portal email was accepted'; END IF;
  EXECUTE 'RESET ROLE';

  -- The original owner/receptionist versioning scenario uses another bed type.

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.list_my_inventory_facilities()) f
    WHERE (f->>'facility_id')::uuid=facility_id) THEN
    RAISE EXCEPTION 'Owner facility selector missing';
  END IF;
  SELECT x INTO row_data FROM jsonb_array_elements(public.list_facility_bed_inventory(facility_id)) x
    WHERE x->>'bed_type_code'='general_ward';
  IF row_data->>'configured' IS DISTINCT FROM 'false' OR row_data->>'row_version' IS NOT NULL THEN
    RAISE EXCEPTION 'Unconfigured inventory has incorrect projection';
  END IF;
  SELECT public.update_facility_bed_inventory(facility_id,bed_type_id,10,5,2,0) INTO row_data;
  inventory_id := (row_data->>'inventory_id')::uuid;
  IF inventory_id IS NULL OR row_data->>'available' IS DISTINCT FROM '3'
    OR row_data->>'row_version' IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Inventory create or available calculation failed';
  END IF;
  SELECT public.update_facility_bed_inventory(facility_id,bed_type_id,10,6,2,1) INTO row_data;
  IF row_data->>'available' IS DISTINCT FROM '2' OR row_data->>'row_version' IS DISTINCT FROM '2'
    OR row_data->>'observed_at' IS NULL THEN
    RAISE EXCEPTION 'Inventory update/version/freshness failed';
  END IF;

  denied := false;
  BEGIN
    PERFORM public.update_facility_bed_inventory(facility_id,bed_type_id,10,6,2,1);
  EXCEPTION WHEN serialization_failure THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Stale inventory edit was accepted'; END IF;
  denied := false;
  BEGIN
    PERFORM public.update_facility_bed_inventory(facility_id,bed_type_id,10,9,2,2);
  EXCEPTION WHEN invalid_parameter_value THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Overallocated inventory was accepted'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',receptionist_auth::text,true);
  SELECT public.complete_onboarding('patient','{"full_name":"Inventory Fixture Receptionist"}'::jsonb)
    INTO receptionist_profile;
  EXECUTE 'RESET ROLE';
  INSERT INTO clinzo.organization_member(identity_id,organization_id,facility_id,role)
    VALUES((receptionist_profile->>'identity_id')::uuid,org_id,facility_id,'receptionist');

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',receptionist_auth::text,true);
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.list_facility_bed_inventory(facility_id)) x
    WHERE x->>'bed_type_code'='general_ward' AND x->>'available'='2') THEN
    RAISE EXCEPTION 'Scoped receptionist could not read inventory';
  END IF;
  denied := false;
  BEGIN
    PERFORM public.update_facility_bed_inventory(facility_id,bed_type_id,10,5,2,2);
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Receptionist could update inventory'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  PERFORM public.complete_onboarding('patient','{"full_name":"Inventory Fixture Outsider"}'::jsonb);
  denied := false;
  BEGIN
    PERFORM public.list_facility_bed_inventory(facility_id);
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Unrelated identity could read inventory'; END IF;
  denied := false;
  BEGIN
    PERFORM public.update_facility_bed_inventory(facility_id,bed_type_id,10,5,2,2);
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Unrelated identity could update inventory'; END IF;
  EXECUTE 'RESET ROLE';

  IF (SELECT count(*) FROM clinzo.domain_event WHERE aggregate_type='facility_bed_inventory'
    AND aggregate_id=inventory_id)<>2
    OR (SELECT count(*) FROM clinzo.audit_log WHERE resource_type='facility_bed_inventory'
      AND resource_id=inventory_id AND action='inventory.updated')<>2 THEN
    RAISE EXCEPTION 'Inventory event/audit history missing';
  END IF;
END $$;

ROLLBACK;
SELECT true AS inventory_smoke_passed;
