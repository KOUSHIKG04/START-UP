-- Synthetic fixtures, all writes rolled back.
BEGIN;
DO $$
DECLARE actor uuid; did uuid; org uuid; fid uuid; practice uuid; service uuid; second_practice uuid;
  day_id uuid; session_id uuid; window_id uuid; result jsonb;
  start_time timestamptz := date_trunc('day',now())+interval '2 days 9 hours';
BEGIN
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',gen_random_uuid()::text,'Directory test') RETURNING id INTO actor;
 INSERT INTO clinzo.organization(public_code,name,kind) VALUES(gen_random_uuid()::text,'Directory test','care_provider') RETURNING id INTO org;
 INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status)
 VALUES(org,gen_random_uuid()::text,'Directory clinic','clinic','Test street','SRID=4326;POINT(77 12)','verified') RETURNING id INTO fid;
 INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status)
 VALUES(actor,gen_random_uuid()::text,'Directory test','Test council',gen_random_uuid()::text,'2020-01-01','verified') RETURNING id INTO did;
 INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(did,fid) RETURNING id INTO practice;
 result:=public.search_public_practices_for_mode(p_practice_id=>practice,p_service_mode=>'clinic');
 IF jsonb_array_length(result)<>1 OR result->0->>'practice_service_id' IS NOT NULL OR (result->0->>'has_available_slots')::boolean THEN
   RAISE EXCEPTION 'Verified doctor without services missing or falsely bookable'; END IF;
 IF jsonb_array_length(public.search_public_practices_for_mode(p_practice_id=>practice,p_service_mode=>'online'))<>0
 OR jsonb_array_length(public.search_public_practices_for_mode(p_practice_id=>practice,p_service_mode=>'home'))<>0 THEN
   RAISE EXCEPTION 'Unconfigured services advertised'; END IF;
 UPDATE clinzo.facility SET verification_status='pending' WHERE id=fid;
 IF jsonb_array_length(public.search_public_practices(p_practice_id=>practice))<>0 THEN RAISE EXCEPTION 'Unverified facility exposed'; END IF;
 UPDATE clinzo.facility SET verification_status='verified' WHERE id=fid;
 UPDATE clinzo.doctor SET credential_status='suspended' WHERE id=did;
 IF jsonb_array_length(public.search_public_practices(p_practice_id=>practice))<>0 THEN RAISE EXCEPTION 'Suspended doctor exposed'; END IF;
 UPDATE clinzo.doctor SET credential_status='verified' WHERE id=did;
 INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
 VALUES(practice,'clinic-first','Clinic',10000,'INR',30) RETURNING id INTO service;
 INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
 VALUES(practice,'clinic-duplicate','Clinic',20000,'INR',30);
 result:=public.search_public_practices_for_mode(p_practice_id=>practice,p_service_mode=>'clinic');
 IF jsonb_array_length(result)<>1 OR (result->0->>'has_available_slots')::boolean THEN RAISE EXCEPTION 'Duplicate or stale service listed as available'; END IF;
 INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone)
 VALUES(did,(start_time AT TIME ZONE 'Asia/Kolkata')::date,'Asia/Kolkata') RETURNING id INTO day_id;
 INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
 VALUES(practice,did,day_id,start_time,start_time+interval '30 minutes','Asia/Kolkata',1,'published') RETURNING id INTO session_id;
 INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(session_id,service);
 INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
 VALUES(session_id,start_time,start_time+interval '30 minutes',1,'open') RETURNING id INTO window_id;
 result:=public.search_public_practices_for_mode(p_practice_id=>practice,p_service_mode=>'clinic');
 IF NOT (result->0->>'has_available_slots')::boolean OR (result->0->>'practice_service_id')::uuid<>service THEN
   RAISE EXCEPTION 'Bookable service not selected'; END IF;
 INSERT INTO clinzo.schedule_exception(doctor_id,doctor_facility_id,starts_at,ends_at,reason,state)
 VALUES(did,practice,start_time,start_time+interval '30 minutes','Directory smoke test','active');
 result:=public.search_public_practices_for_mode(p_practice_id=>practice,p_service_mode=>'clinic');
 IF (result->0->>'has_available_slots')::boolean THEN RAISE EXCEPTION 'Blocked time advertised as available'; END IF;
 -- A second verified association without a service must not create another card.
 UPDATE clinzo.doctor SET full_name='Directory '||did::text WHERE id=did;
 INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status)
 VALUES(org,gen_random_uuid()::text,'Second directory clinic','clinic','Other street','SRID=4326;POINT(77 12)','verified') RETURNING id INTO fid;
 INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(did,fid);
 result:=public.search_public_practices_for_mode(p_query=>'Directory '||did::text,p_service_mode=>'clinic',p_limit=>1);
 IF jsonb_array_length(result)<>1 OR (result->0->>'practice_id')::uuid<>practice OR result->0->>'fee_minor' IS NULL THEN
   RAISE EXCEPTION 'Association without fee replaced the published practice'; END IF;
 IF jsonb_array_length(public.search_public_practices_for_mode(p_query=>'Directory '||did::text,p_service_mode=>'clinic',p_limit=>1,p_offset=>1))<>0 THEN
   RAISE EXCEPTION 'Duplicate doctor survived pagination'; END IF;
 IF jsonb_array_length(public.search_public_practices(p_query=>'Directory '||did::text))<>1 THEN
   RAISE EXCEPTION 'Unfiltered search duplicated the doctor'; END IF;
 EXECUTE 'SET LOCAL ROLE anon';
 result:=public.search_public_practices(p_practice_id=>practice);
 IF jsonb_array_length(result)<>1 THEN RAISE EXCEPTION 'Anonymous directory access failed'; END IF;
 EXECUTE 'RESET ROLE';
 result:=public.list_public_doctor_practices(practice,'clinic');
 IF jsonb_array_length(result)<>2 THEN RAISE EXCEPTION 'Other doctor locations missing'; END IF;
 IF jsonb_array_length(public.list_public_doctor_practices(practice,'online'))<>0 THEN RAISE EXCEPTION 'Unconfigured online locations exposed'; END IF;
 DELETE FROM clinzo.schedule_exception e WHERE e.doctor_id=did;
 result:=public.list_public_doctor_practices(practice,'clinic');
 IF result->0->>'next_available_at' IS NULL OR (result->0->>'practice_id')::uuid<>practice THEN RAISE EXCEPTION 'Next available location not ranked first'; END IF;
 SELECT p.id INTO second_practice FROM clinzo.doctor_facility p WHERE p.facility_id=fid;
 INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
 VALUES(second_practice,'clinic-earlier','Clinic',30000,'INR',30) RETURNING id INTO service;
 INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
 VALUES(second_practice,did,day_id,start_time-interval '1 hour',start_time-interval '30 minutes','Asia/Kolkata',1,'published') RETURNING id INTO session_id;
 INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(session_id,service);
 INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
 VALUES(session_id,start_time-interval '1 hour',start_time-interval '30 minutes',1,'open');
 result:=public.search_public_practices_for_mode(p_query=>'Directory '||did::text,p_service_mode=>'clinic');
 IF jsonb_array_length(result)<>1 OR (result->0->>'practice_id')::uuid<>second_practice OR result->0->>'fee_minor'<>'30000' THEN
   RAISE EXCEPTION 'Earliest location and matching fee not highlighted'; END IF;
 result:=public.list_public_doctor_practices(practice,'clinic');
 IF (result->0->>'practice_id')::uuid<>second_practice THEN RAISE EXCEPTION 'Location list not ordered by next appointment'; END IF;
 UPDATE clinzo.facility SET verification_status='pending' WHERE id=fid;
 IF jsonb_array_length(public.list_public_doctor_practices(practice,'clinic'))<>1 THEN RAISE EXCEPTION 'Unverified secondary location exposed'; END IF;
 IF jsonb_array_length(public.list_public_doctor_practices((SELECT p.id FROM clinzo.doctor_facility p WHERE p.facility_id=fid),'clinic'))<>0 THEN
   RAISE EXCEPTION 'Unverified anchor exposed doctor locations'; END IF;
END $$;
SELECT 'verified_directory_smoke_passed' AS result;
ROLLBACK;
