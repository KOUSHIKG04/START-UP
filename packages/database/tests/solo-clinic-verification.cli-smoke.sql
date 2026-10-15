-- Synthetic fixtures only; all writes roll back.
BEGIN;
DO $$
DECLARE actor uuid; did uuid; org uuid; fid uuid; cid uuid;
BEGIN
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',gen_random_uuid()::text,'Solo test') RETURNING id INTO actor;
 INSERT INTO clinzo.organization(public_code,name,kind) VALUES(gen_random_uuid()::text,'Solo test','care_provider') RETURNING id INTO org;
 INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location)
 VALUES(org,gen_random_uuid()::text,'Solo clinic','clinic','Test street','SRID=4326;POINT(77 12)') RETURNING id INTO fid;
 INSERT INTO clinzo.organization_member(identity_id,organization_id,role) VALUES(actor,org,'owner');
 INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status)
 VALUES(actor,gen_random_uuid()::text,'Solo test','Test council',gen_random_uuid()::text,'2020-01-01','verified') RETURNING id INTO did;
 INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(did,fid);
 INSERT INTO clinzo.verification_case(doctor_id,status) VALUES(did,'verified') RETURNING id INTO cid;
 INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version,status)
 SELECT cid,kind,'doctor-licenses',gen_random_uuid()::text,1,'approved'
 FROM unnest(ARRAY['medical_registration','medical_degree','clinic_operating_licence']) kind;
 UPDATE clinzo.verification_case SET status='verified' WHERE id=cid;
 IF (SELECT verification_status FROM clinzo.facility WHERE id=fid)<>'verified' THEN RAISE EXCEPTION 'Approved solo clinic not synchronized'; END IF;

 UPDATE clinzo.facility SET verification_status='pending' WHERE id=fid;
 PERFORM clinzo.sync_verified_solo_clinic(cid);
 IF (SELECT verification_status FROM clinzo.facility WHERE id=fid)<>'verified' THEN RAISE EXCEPTION 'Backfill failed'; END IF;

 UPDATE clinzo.facility SET verification_status='suspended' WHERE id=fid;
 PERFORM clinzo.sync_verified_solo_clinic(cid);
 IF (SELECT verification_status FROM clinzo.facility WHERE id=fid)<>'suspended' THEN RAISE EXCEPTION 'Suspension overridden'; END IF;

 UPDATE clinzo.facility SET verification_status='pending' WHERE id=fid;
 INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version,status)
 VALUES(cid,'clinic_operating_licence','doctor-licenses',gen_random_uuid()::text,2,'pending');
 PERFORM clinzo.sync_verified_solo_clinic(cid);
 IF (SELECT verification_status FROM clinzo.facility WHERE id=fid)<>'pending' THEN RAISE EXCEPTION 'Unapproved latest licence accepted'; END IF;
 UPDATE clinzo.verification_document SET status='approved' WHERE case_id=cid AND version=2;

 UPDATE clinzo.organization_member SET active=false WHERE identity_id=actor;
 PERFORM clinzo.sync_verified_solo_clinic(cid);
 IF (SELECT verification_status FROM clinzo.facility WHERE id=fid)<>'pending' THEN RAISE EXCEPTION 'Inactive ownership accepted'; END IF;
 UPDATE clinzo.organization_member SET active=true WHERE identity_id=actor;

 INSERT INTO clinzo.verification_case(facility_id) VALUES(fid);
 PERFORM clinzo.sync_verified_solo_clinic(cid);
 IF (SELECT verification_status FROM clinzo.facility WHERE id=fid)<>'pending' THEN RAISE EXCEPTION 'Separate facility review overridden'; END IF;
 IF has_function_privilege('authenticated','clinzo.sync_verified_solo_clinic(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Client can bypass review'; END IF;
END $$;
SELECT 'solo_clinic_verification_smoke_passed' AS result;
ROLLBACK;
