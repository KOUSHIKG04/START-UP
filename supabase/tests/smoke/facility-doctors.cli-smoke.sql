-- Disposable project only. Fixture writes roll back.
BEGIN;
DO $$
DECLARE owner_auth uuid:=gen_random_uuid(); outsider_auth uuid:=gen_random_uuid();
  owner_identity uuid; org_id uuid; facility_id uuid; doctor_id uuid; practice_id uuid;
  result jsonb;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (owner_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','roster-'||owner_auth||'@example.test',now()),
    (outsider_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','roster-'||outsider_auth||'@example.test',now());
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',owner_auth::text,'Roster Owner') RETURNING id INTO owner_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',outsider_auth::text,'Roster Outsider');
  INSERT INTO clinzo.organization(public_code,name,kind)
    VALUES('ORG-'||gen_random_uuid(),'Roster Clinic','care_provider') RETURNING id INTO org_id;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location)
    VALUES(org_id,'CLN-'||gen_random_uuid(),'Roster Clinic','clinic','Fixture Street',
      extensions.ST_SetSRID(extensions.ST_MakePoint(77.5,12.9),4326)::extensions.geography)
    RETURNING id INTO facility_id;
  INSERT INTO clinzo.organization_member(identity_id,organization_id,facility_id,role)
    VALUES(owner_identity,org_id,facility_id,'facility_admin');
  INSERT INTO clinzo.doctor(public_code,full_name,registration_authority,registration_number,
    practice_started_on,credential_status)
    VALUES('DOC-'||gen_random_uuid(),'Dr. Roster Fixture','Fixture Council',gen_random_uuid()::text,
      '2020-01-01','verified') RETURNING id INTO doctor_id;
  INSERT INTO clinzo.doctor_facility(doctor_id,facility_id)
    VALUES(doctor_id,facility_id) RETURNING id INTO practice_id;
  INSERT INTO clinzo.schedule_exception(doctor_id,doctor_facility_id,starts_at,ends_at,reason,state)
    VALUES(doctor_id,practice_id,now()-interval '1 hour',now()+interval '1 day','Leave','active');

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  result:=public.list_my_facility_doctors();
  IF jsonb_array_length(result)<>1 OR (result->0->>'id')::uuid<>doctor_id
    OR NOT (result->0->>'on_leave')::boolean OR NOT (result->0->>'verified')::boolean
    OR (result->0->>'present')::boolean THEN
    RAISE EXCEPTION 'Facility roster or leave state incorrect: %',result; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  IF jsonb_array_length(public.list_my_facility_doctors())<>0 THEN
    RAISE EXCEPTION 'Facility roster leaked to outsider'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS facility_doctors_smoke_passed;
