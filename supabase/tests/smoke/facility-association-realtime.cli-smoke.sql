-- Realtime-specific rollback test. Connect a WebSocket client (Facility Portal
-- or Realtime Inspector) first so today's managed message partition exists.
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
  IF NOT EXISTS(SELECT 1 FROM realtime.messages WHERE topic='facility-associations:'||facility_id::text
    AND event='doctor_association_changed' AND private AND payload::text LIKE '%'||request_id::text||'%') THEN
    RAISE EXCEPTION 'Association request did not emit a private broadcast'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  PERFORM set_config('realtime.topic','facility-associations:'||facility_id::text,true);
  IF NOT public.can_receive_facility_association_events('facility-associations:'||facility_id::text)
    OR NOT EXISTS(SELECT 1 FROM realtime.messages WHERE topic='facility-associations:'||facility_id::text) THEN
    RAISE EXCEPTION 'Facility owner cannot receive private association event'; END IF;
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  IF public.can_receive_facility_association_events('facility-associations:'||facility_id::text)
    OR EXISTS(SELECT 1 FROM realtime.messages WHERE topic='facility-associations:'||facility_id::text) THEN
    RAISE EXCEPTION 'Outsider can read association broadcast'; END IF;
  EXECUTE 'RESET ROLE';

END $$;
ROLLBACK;
SELECT true AS facility_association_realtime_smoke_passed;
