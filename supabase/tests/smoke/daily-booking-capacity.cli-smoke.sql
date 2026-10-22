-- Disposable database only. Synthetic fixtures and all writes roll back.
BEGIN;
DO $$
DECLARE
  doctor_auth uuid:=gen_random_uuid(); owner_auth uuid:=gen_random_uuid(); outsider_auth uuid:=gen_random_uuid();
  doctor_identity uuid; owner_identity uuid; outsider_identity uuid; doctor_id uuid; org_id uuid; facility_id uuid; practice uuid;
  settings jsonb; result jsonb; version bigint; tomorrow date; zone text:=(SELECT name FROM pg_timezone_names WHERE name LIKE 'Etc/GMT%' AND extract(hour FROM now() AT TIME ZONE name)=10 LIMIT 1); exception_id uuid;
  denied boolean; count_before int; count_after int; sid uuid; wid uuid; psid uuid; patient uuid;
  mode text; today_sid uuid; today_wid uuid; today_day uuid;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',doctor_auth||'@example.test',now()),
    (owner_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',owner_auth||'@example.test',now()),
    (outsider_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',outsider_auth||'@example.test',now());
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',doctor_auth::text,'Schedule doctor') RETURNING id INTO doctor_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',owner_auth::text,'Facility owner') RETURNING id INTO owner_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',outsider_auth::text,'Outsider') RETURNING id INTO outsider_identity;
  INSERT INTO clinzo.organization(public_code,name,kind) VALUES(gen_random_uuid()::text,'Schedule facility','care_provider') RETURNING id INTO org_id;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status)
    VALUES(org_id,gen_random_uuid()::text,'Schedule clinic','clinic','Test street','SRID=4326;POINT(77.59 12.97)','verified') RETURNING id INTO facility_id;
  INSERT INTO clinzo.organization_member(identity_id,organization_id,facility_id,role)
    VALUES(owner_identity,org_id,facility_id,'owner');
  INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status,booking_timezone)
    VALUES(doctor_identity,gen_random_uuid()::text,'Schedule doctor','Test council',gen_random_uuid()::text,'2020-01-01','verified',zone) RETURNING id INTO doctor_id;
  INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(doctor_id,facility_id) RETURNING id INTO practice;
  settings:=jsonb_build_object('working_days',jsonb_build_array(1,2,3,4,5,6,7),'clinic_start','09:00','clinic_end','21:00',
    'slot_minutes',60,'walkin_daily_limit',2,'online_daily_limit',0,'auto_accept',false,'auto_accept_limit',1,'home_visits',false,'clinic_fee_minor',10000);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  result:=public.publish_doctor_schedule(practice,'clinic',settings,0);
  EXECUTE 'RESET ROLE';
  IF (SELECT count(*) FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND (w.starts_at AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date AND w.starts_at>now())<=2 THEN
    RAISE EXCEPTION 'Stored schedule windows were unexpectedly truncated'; END IF;
  SELECT count(*) INTO count_before
    FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) entry
    WHERE ((entry->>'starts_at')::timestamptz AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date;
  IF count_before<>2 THEN RAISE EXCEPTION 'Clinic discovery did not cap times at the daily limit'; END IF;
  SELECT (entry->>'window_id')::uuid,(entry->>'practice_service_id')::uuid INTO wid,psid
    FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) entry
    WHERE ((entry->>'starts_at')::timestamptz AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date
    LIMIT 1;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Daily cap patient') RETURNING id INTO patient;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient,outsider_identity,'self',now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  today_sid:=public.book_clinic_appointment(patient,wid,psid,'',gen_random_uuid());
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO count_after
    FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) entry
    WHERE ((entry->>'starts_at')::timestamptz AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date;
  IF count_after<>1 THEN RAISE EXCEPTION 'Reserved booking did not reduce advertised time count'; END IF;
  SELECT (entry->>'window_id')::uuid,(entry->>'practice_service_id')::uuid INTO wid,psid
    FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) entry
    WHERE ((entry->>'starts_at')::timestamptz AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date
    LIMIT 1;
  EXECUTE 'SET LOCAL ROLE authenticated';
  today_wid:=public.book_clinic_appointment(patient,wid,psid,'',gen_random_uuid());
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) entry
    WHERE ((entry->>'starts_at')::timestamptz AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date) THEN
    RAISE EXCEPTION 'Full day still advertises capacity'; END IF;
  SELECT w.id,ss.practice_service_id INTO wid,psid FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    JOIN clinzo.session_service ss ON ss.session_id=s.id WHERE s.doctor_facility_id=practice
    AND (w.starts_at AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date AND (w.starts_at AT TIME ZONE zone)::time=time '20:00';
  denied:=false;
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN PERFORM public.book_clinic_appointment(patient,wid,psid,'',gen_random_uuid()); EXCEPTION WHEN check_violation THEN denied:=position('Daily booking limit' in SQLERRM)>0; END;
  IF NOT denied THEN RAISE EXCEPTION 'Daily admission limit bypassed across sessions'; END IF;
  EXECUTE 'RESET ROLE';
  SELECT a.row_version INTO version FROM clinzo.appointment a WHERE a.id=today_sid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.transition_clinic_appointment(today_sid,version,'reject','Choose a different time');
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO count_after
    FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) entry
    WHERE ((entry->>'starts_at')::timestamptz AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date;
  IF count_after<>1 THEN RAISE EXCEPTION 'Rejection did not restore one available time'; END IF;
  SELECT (entry->>'window_id')::uuid,(entry->>'practice_service_id')::uuid INTO wid,psid
    FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) entry
    WHERE ((entry->>'starts_at')::timestamptz AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date
    LIMIT 1;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  sid:=public.book_clinic_appointment(patient,wid,psid,'',gen_random_uuid());
  EXECUTE 'RESET ROLE';
  SELECT a.row_version INTO version FROM clinzo.appointment a WHERE a.id=sid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.transition_clinic_appointment(sid,version,'approve',NULL);
  EXECUTE 'RESET ROLE';
  IF clinzo.has_daily_booking_capacity((SELECT a.session_id FROM clinzo.appointment a WHERE a.id=sid)) THEN
    RAISE EXCEPTION 'Confirmed and pending bookings did not share the daily cap'; END IF;
  UPDATE clinzo.appointment SET request_expires_at=now()-interval '1 minute' WHERE id=today_wid;
  IF NOT clinzo.has_daily_booking_capacity((SELECT a.session_id FROM clinzo.appointment a WHERE a.id=sid)) THEN
    RAISE EXCEPTION 'Expired pending request still consumes daily capacity'; END IF;
  SELECT a.row_version INTO version FROM clinzo.appointment a WHERE a.id=sid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.transition_clinic_appointment(sid,version,'cancel',NULL);
  EXECUTE 'RESET ROLE';
  IF NOT clinzo.has_daily_booking_capacity((SELECT a.session_id FROM clinzo.appointment a WHERE a.id=sid)) THEN
    RAISE EXCEPTION 'Cancellation did not release daily capacity'; END IF;
END $$;
SELECT 'daily_booking_capacity_smoke_passed' AS result;
ROLLBACK;
