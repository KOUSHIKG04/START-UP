-- Connect a WebSocket client first so the managed Realtime partition exists.
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
  -- Inventory is available only after company approval. This fixture tests
  -- inventory behavior after that approval, without persisting the change.
  UPDATE clinzo.facility SET verification_status='verified' WHERE id=facility_id;


  PERFORM set_config('clinzo.live_change_keys','[]',true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  PERFORM public.update_facility_bed_inventory(facility_id,bed_type_id,10,2,0,0);
  PERFORM public.update_facility_bed_inventory(facility_id,bed_type_id,10,3,0,1);
  IF NOT public.can_receive_app_live_events('identity-events:'||owner_identity::text)
    OR NOT public.can_receive_app_live_events('facility-events:'||facility_id::text) THEN RAISE EXCEPTION 'Owner live-event scope denied'; END IF;
  PERFORM set_config('realtime.topic','facility-events:'||facility_id::text,true);
  IF (SELECT count(*) FROM realtime.messages WHERE topic='facility-events:'||facility_id::text AND event='app_changed' AND payload->>'kind'='beds')<>1 THEN
    RAISE EXCEPTION 'Bed writes did not produce one coalesced private event'; END IF;
  IF EXISTS(SELECT 1 FROM realtime.messages WHERE topic='facility-events:'||facility_id::text AND payload-ARRAY['kind','id']<>'{}'::jsonb) THEN
    RAISE EXCEPTION 'Live signal leaked record details'; END IF;
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  SELECT public.complete_onboarding('patient','{"full_name":"Live Fixture Outsider"}'::jsonb) INTO receptionist_profile;
  IF public.can_receive_app_live_events('identity-events:'||owner_identity::text)
    OR public.can_receive_app_live_events('facility-events:'||facility_id::text)
    OR EXISTS(SELECT 1 FROM realtime.messages WHERE topic='facility-events:'||facility_id::text) THEN
    RAISE EXCEPTION 'Outsider can read owner/facility signals'; END IF;
  IF NOT public.can_receive_app_live_events('directory-events') THEN RAISE EXCEPTION 'Authenticated directory signal unavailable'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS app_live_events_smoke_passed;
