-- Exact-target disposable validation only; all fixtures roll back.
BEGIN;
DO $$
DECLARE da uuid:=gen_random_uuid(); pa uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
 di uuid; pi uuid; org uuid; fac uuid; doc uuid; patient uuid; practice uuid; service uuid; day uuid; sess uuid; win uuid; apt uuid; msg uuid; nonce uuid:=gen_random_uuid(); denied boolean;
BEGIN
 INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
 (da,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','call-'||da||'@example.test',now()),
 (pa,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','call-'||pa||'@example.test',now()),
 (outsider,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','call-'||outsider||'@example.test',now());
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',da::text,'Call Doctor') RETURNING id INTO di;
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',pa::text,'Call Patient') RETURNING id INTO pi;
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',outsider::text,'Call Outsider');
 INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status)
 VALUES(di,'DOC-'||da,'Call Doctor','Fixture',da::text,'2020-01-01','verified') RETURNING id INTO doc;
 INSERT INTO clinzo.patient(public_code,full_name) VALUES('PAT-'||pa,'Call Patient') RETURNING id INTO patient;
 INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient,pi,'self',now());
 INSERT INTO clinzo.organization(public_code,name,kind) VALUES('ORG-'||da,'Call fixture','care_provider') RETURNING id INTO org;
 INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location)
 VALUES(org,'CLN-'||da,'Call fixture','clinic','Fixture street',extensions.ST_SetSRID(extensions.ST_MakePoint(77.5,12.9),4326)::extensions.geography) RETURNING id INTO fac;
 INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(doc,fac) RETURNING id INTO practice;
 INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
 VALUES(practice,'online-fixture','Video consultation',10000,'INR',30) RETURNING id INTO service;
 INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone) VALUES(doc,current_date,'UTC') RETURNING id INTO day;
 INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
 VALUES(practice,doc,day,now()-interval '5 minutes',now()+interval '25 minutes','UTC',1,'published') RETURNING id INTO sess;
 INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(sess,service);
 INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
 VALUES(sess,now()-interval '5 minutes',now()+interval '25 minutes',1,'open') RETURNING id INTO win;
 INSERT INTO clinzo.appointment(public_code,patient_id,session_id,window_id,practice_service_id,source,status,confirmed_at,fee_minor,currency,doctor_name_snapshot,facility_name_snapshot,facility_address_snapshot,service_name_snapshot,doctor_registration_snapshot)
 VALUES('APT-'||da,patient,sess,win,service,'patient_online','confirmed',now(),10000,'INR','Call Doctor','Call fixture','Fixture street','Video consultation','Fixture') RETURNING id INTO apt;
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub',pa::text,true);
 denied:=false;
 BEGIN PERFORM public.send_online_message(apt,nonce,'Before start'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Chat allowed before consultation start'; END IF;
 PERFORM set_config('request.jwt.claim.sub',da::text,true);
 PERFORM public.start_online_appointment(apt);
 msg:=public.send_online_message(apt,nonce,'Doctor message');
 IF msg<>public.send_online_message(apt,nonce,'Doctor message') THEN RAISE EXCEPTION 'Message retry was duplicated'; END IF;
 PERFORM set_config('request.jwt.claim.sub',pa::text,true);
 PERFORM public.send_online_message(apt,gen_random_uuid(),'Patient reply');
 IF jsonb_array_length(public.list_online_messages(apt))<>2 THEN RAISE EXCEPTION 'Chat not visible to patient'; END IF;
 PERFORM set_config('request.jwt.claim.sub',outsider::text,true);
 denied:=false;
 BEGIN PERFORM public.send_online_message(apt,gen_random_uuid(),'Unauthorized'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Outsider sent a consultation message'; END IF;
 denied:=false;
 BEGIN PERFORM public.list_online_messages(apt); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Outsider read consultation chat'; END IF;
 PERFORM set_config('request.jwt.claim.sub',da::text,true);
 IF jsonb_array_length(public.list_online_messages(apt))<>2 THEN RAISE EXCEPTION 'Chat not visible to doctor'; END IF;
 PERFORM public.complete_online_appointment(apt,'Fixture assessment');
 denied:=false;
 BEGIN PERFORM public.send_online_message(apt,gen_random_uuid(),'After completion'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Chat allowed after completion'; END IF;
 EXECUTE 'RESET ROLE';
 IF has_function_privilege('anon','public.send_online_message(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous chat send exposed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='online_message') THEN RAISE EXCEPTION 'Realtime chat publication missing'; END IF;
END $$;
ROLLBACK;
SELECT true AS active_consultation_chat_smoke_passed;
