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
  settings:=jsonb_build_object('working_days',jsonb_build_array(1,2,3,4,5,6,7),
    'clinic_start','00:00','clinic_end','24:00','slot_minutes',60,
    'online_daily_limit',0,'walkin_daily_limit',100,'auto_accept',true,'auto_accept_limit',100,
    'home_visits',false,'clinic_fee_minor',10000);
  INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone)
    VALUES(doctor_id,(now() AT TIME ZONE zone)::date,zone) RETURNING id INTO today_day;
  INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
    VALUES(practice,doctor_id,today_day,now()-interval '1 minute',now()+interval '1 minute',zone,1,'open') RETURNING id INTO today_sid;
  INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
    VALUES(today_sid,now()-interval '1 minute',now()+interval '1 minute',1,'open') RETURNING id INTO today_wid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  result:=public.publish_doctor_schedule(practice,'clinic',settings,0);
  version:=(result->'settings'->>'row_version')::bigint;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND s.schedule_rule_id IS NOT NULL
    AND (w.starts_at AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date AND w.starts_at>now()) THEN
    RAISE EXCEPTION 'Default publication did not create slots today'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND s.schedule_rule_id IS NOT NULL AND w.starts_at<=now()) THEN
    RAISE EXCEPTION 'Past slots generated'; END IF;
  -- Mark the ongoing session as automatic too; today's update must not cancel it.
  UPDATE clinzo.session SET schedule_rule_id=(SELECT id FROM clinzo.schedule_rule WHERE doctor_facility_id=practice AND state='published') WHERE id=today_sid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings,version,(now() AT TIME ZONE zone)::date);
  version:=(result->'settings'->>'row_version')::bigint;
  denied:=false;
  BEGIN
    PERFORM public.publish_doctor_schedule_from_date(practice,'clinic',settings,version,(now() AT TIME ZONE zone)::date-1);
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Past effective date accepted'; END IF;
  EXECUTE 'RESET ROLE';
  IF (SELECT state FROM clinzo.session WHERE id=today_sid)<>'open'
    OR (SELECT state FROM clinzo.appointment_window WHERE id=today_wid)<>'open' THEN
    RAISE EXCEPTION 'Ongoing session was changed'; END IF;
END $$;
SELECT 'same_day_schedule_smoke_passed' AS result;
ROLLBACK;
