-- Synthetic fixtures only; the whole test rolls back.
BEGIN;
DO $$
DECLARE
  doctor_auth uuid:=gen_random_uuid(); owner_auth uuid:=gen_random_uuid(); patient_auth uuid:=gen_random_uuid();
  doctor_identity uuid; owner_identity uuid; patient_identity uuid; doctor_id uuid; org_id uuid; facility_id uuid;
  practice uuid; other_practice uuid; other_facility uuid; patient uuid; settings jsonb; result jsonb; version bigint;
  zone text:=(SELECT name FROM pg_timezone_names WHERE name LIKE 'Etc/GMT%' AND extract(hour FROM now() AT TIME ZONE name)=10 LIMIT 1);
  change_day date; today date; legacy_session uuid; legacy_rule uuid; day_id uuid; today_booking uuid;
  wid uuid; psid uuid; confirmed uuid; pending uuid; before_bookings jsonb; after_bookings jsonb; before_other jsonb;
  before_windows uuid[]; after_windows uuid[]; before_online uuid[]; old_version bigint; denied boolean;
BEGIN
  today:=(now() AT TIME ZONE zone)::date;
  change_day:=today+3;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',doctor_auth||'@example.test',now()),
    (owner_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',owner_auth||'@example.test',now()),
    (patient_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',patient_auth||'@example.test',now());
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',doctor_auth::text,'Duration doctor') RETURNING id INTO doctor_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',owner_auth::text,'Duration owner') RETURNING id INTO owner_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',patient_auth::text,'Duration patient') RETURNING id INTO patient_identity;
  INSERT INTO clinzo.organization(public_code,name,kind) VALUES(gen_random_uuid()::text,'Duration facility','care_provider') RETURNING id INTO org_id;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status)
    VALUES(org_id,gen_random_uuid()::text,'Duration clinic','clinic','Test street','SRID=4326;POINT(77.59 12.97)','verified') RETURNING id INTO facility_id;
  INSERT INTO clinzo.organization_member(identity_id,organization_id,facility_id,role) VALUES(owner_identity,org_id,facility_id,'owner');
  INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status,booking_timezone)
    VALUES(doctor_identity,gen_random_uuid()::text,'Duration doctor','Test council',gen_random_uuid()::text,'2020-01-01','verified',zone) RETURNING id INTO doctor_id;
  INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(doctor_id,facility_id) RETURNING id INTO practice;
  settings:=jsonb_build_object('working_days',jsonb_build_array(1,2,3,4,5,6,7),'clinic_start','09:00','clinic_end','13:00',
    'online_start','16:00','online_end','18:00','slot_minutes',15,'online_slot_minutes',15,'walkin_daily_limit',2,'online_daily_limit',8,
    'auto_accept',false,'auto_accept_limit',1,'home_visits',false,'clinic_fee_minor',10000,'online_fee_minor',10000);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  result:=public.publish_doctor_schedule(practice,'clinic',settings,0);
  result:=public.publish_doctor_schedule(practice,'online',settings,(result->'settings'->>'row_version')::bigint);
  version:=(result->'settings'->>'row_version')::bigint;
  EXECUTE 'RESET ROLE';
  SELECT array_agg(w.id ORDER BY w.id) INTO before_online FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='online';
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Duration patient') RETURNING id INTO patient;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient,patient_identity,'self',now());
  FOR i IN 0..1 LOOP
    SELECT w.id,ss.practice_service_id INTO wid,psid FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
      JOIN clinzo.session_service ss ON ss.session_id=s.id WHERE s.doctor_facility_id=practice
        AND w.starts_at=(change_day+CASE i WHEN 0 THEN time '09:15' ELSE time '10:30' END) AT TIME ZONE zone;
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
    IF i=0 THEN confirmed:=public.book_clinic_appointment(patient,wid,psid,'',gen_random_uuid());
    ELSE pending:=public.book_clinic_appointment(patient,wid,psid,'',gen_random_uuid()); END IF;
    EXECUTE 'RESET ROLE';
  END LOOP;
  SELECT a.row_version INTO old_version FROM clinzo.appointment a WHERE a.id=confirmed;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.transition_clinic_appointment(confirmed,old_version,'approve',NULL);
  EXECUTE 'RESET ROLE';
  SELECT jsonb_agg(jsonb_build_array(a.id,a.session_id,a.window_id,a.status,w.starts_at,w.ends_at,a.fee_minor) ORDER BY a.id) INTO before_bookings
    FROM clinzo.appointment a JOIN clinzo.appointment_window w ON w.id=a.window_id WHERE a.id IN (confirmed,pending);
  SELECT array_agg(w.id ORDER BY w.id) INTO before_windows FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND w.state='open' AND clinzo.service_mode_for_session(s.id)='clinic';
  -- A limit-only edit must not regenerate the grid or move any window IDs.
  settings:=settings||jsonb_build_object('walkin_daily_limit',3);
  EXECUTE 'SET LOCAL ROLE authenticated';
  result:=public.publish_doctor_schedule(practice,'clinic',settings,version);
  version:=(result->'settings'->>'row_version')::bigint;
  EXECUTE 'RESET ROLE';
  SELECT array_agg(w.id ORDER BY w.id) INTO after_windows FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND w.state='open' AND clinzo.service_mode_for_session(s.id)='clinic';
  IF before_windows IS DISTINCT FROM after_windows OR (result->'settings'->>'slot_minutes')::int<>15 THEN
    RAISE EXCEPTION 'Limit-only change regenerated appointment times'; END IF;
  -- The same doctor may also work at another practice. Its cap is independent.
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status)
    VALUES(org_id,gen_random_uuid()::text,'Other duration clinic','clinic','Other street','SRID=4326;POINT(77.6 12.98)','verified') RETURNING id INTO other_facility;
  INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(doctor_id,other_facility) RETURNING id INTO other_practice;
  EXECUTE 'SET LOCAL ROLE authenticated';
  result:=public.publish_doctor_schedule(other_practice,'clinic',settings||jsonb_build_object('clinic_start','18:00','clinic_end','20:00','walkin_daily_limit',1),0);
  EXECUTE 'RESET ROLE';
  SELECT jsonb_agg(jsonb_build_array(w.id,w.starts_at,w.ends_at,w.state) ORDER BY w.id) INTO before_other
    FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE s.doctor_facility_id=other_practice;
  IF NOT clinzo.has_daily_booking_capacity((SELECT s.id FROM clinzo.session s WHERE s.doctor_facility_id=other_practice
    AND (s.starts_at AT TIME ZONE zone)::date=change_day LIMIT 1)) THEN RAISE EXCEPTION 'Other practice consumed this practice booking limit'; END IF;
  -- Apply a new interval only from the chosen day, around both existing bookings.
  SELECT array_agg(w.id ORDER BY w.id) INTO before_windows FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND w.state='open' AND clinzo.service_mode_for_session(s.id)='clinic'
      AND (w.starts_at AT TIME ZONE zone)::date<change_day;
  settings:=settings||jsonb_build_object('slot_minutes',30);
  EXECUTE 'SET LOCAL ROLE authenticated';
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings,version,change_day);
  version:=(result->'settings'->>'row_version')::bigint;
  EXECUTE 'RESET ROLE';
  SELECT jsonb_agg(jsonb_build_array(a.id,a.session_id,a.window_id,a.status,w.starts_at,w.ends_at,a.fee_minor) ORDER BY a.id) INTO after_bookings
    FROM clinzo.appointment a JOIN clinzo.appointment_window w ON w.id=a.window_id WHERE a.id IN (confirmed,pending);
  IF before_bookings IS DISTINCT FROM after_bookings THEN RAISE EXCEPTION 'Duration change moved or modified a booking'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE s.doctor_facility_id=practice
    AND w.state='open' AND w.starts_at=(change_day+time '09:30') AT TIME ZONE zone AND w.ends_at-w.starts_at=interval '30 minutes') THEN
    RAISE EXCEPTION 'Booked session prevented regeneration of unused availability'; END IF;
  SELECT array_agg(w.id ORDER BY w.id) INTO after_windows FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND w.state='open' AND clinzo.service_mode_for_session(s.id)='clinic'
      AND (w.starts_at AT TIME ZONE zone)::date<change_day;
  IF before_windows IS DISTINCT FROM after_windows THEN RAISE EXCEPTION 'Earlier dates changed'; END IF;
  IF before_online IS DISTINCT FROM (SELECT array_agg(w.id ORDER BY w.id) FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='online') THEN RAISE EXCEPTION 'Other consultation type changed'; END IF;
  IF before_other IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_array(w.id,w.starts_at,w.ends_at,w.state) ORDER BY w.id)
    FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE s.doctor_facility_id=other_practice) THEN RAISE EXCEPTION 'Other practice changed'; END IF;
  IF clinzo.refresh_automatic_schedules()<>0 THEN RAISE EXCEPTION 'Refresh duplicated availability'; END IF;
  SELECT w.id,ss.practice_service_id INTO wid,psid FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    JOIN clinzo.session_service ss ON ss.session_id=s.id WHERE s.doctor_facility_id=practice AND w.state='open'
      AND w.starts_at=(change_day+time '09:30') AT TIME ZONE zone;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  PERFORM public.book_clinic_appointment(patient,wid,psid,'New duration',gen_random_uuid());
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.appointment_window w ON w.id=a.window_id WHERE a.window_id=wid
    AND a.status='pending' AND w.ends_at-w.starts_at=interval '30 minutes') THEN RAISE EXCEPTION 'Regenerated slot could not be booked'; END IF;
  -- A block published before today may already be in progress. Its future free
  -- windows must still accept a new duration without touching its booking.
  SELECT s.booking_day_id INTO day_id FROM clinzo.session s WHERE s.doctor_facility_id=practice
    AND (s.starts_at AT TIME ZONE zone)::date=today LIMIT 1;
  UPDATE clinzo.session SET state='cancelled' WHERE doctor_facility_id=practice AND starts_at>now()
    AND (starts_at AT TIME ZONE zone)::date=today AND clinzo.service_mode_for_session(id)='clinic';
  UPDATE clinzo.appointment_window w SET state='blocked' FROM clinzo.session s WHERE w.session_id=s.id
    AND s.doctor_facility_id=practice AND s.state='cancelled';
  SELECT id INTO legacy_rule FROM clinzo.schedule_rule WHERE doctor_facility_id=practice AND service_mode='clinic'
    AND automatic AND window_minutes=15 AND effective_from<=today AND effective_until>=today;
  INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,schedule_rule_id,starts_at,ends_at,timezone,hard_capacity,state)
    VALUES(practice,doctor_id,day_id,legacy_rule,(today+time '09:00') AT TIME ZONE zone,(today+time '13:00') AT TIME ZONE zone,zone,16,'published') RETURNING id INTO legacy_session;
  INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
    VALUES(practice,'clinic-'||legacy_session,'Legacy clinic',10000,'INR',15) RETURNING id INTO psid;
  INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(legacy_session,psid);
  INSERT INTO clinzo.session_queue(session_id) VALUES(legacy_session);
  INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
    SELECT legacy_session,t,t+interval '15 minutes',1,'open' FROM generate_series((today+time '09:00') AT TIME ZONE zone,
      (today+time '12:45') AT TIME ZONE zone,interval '15 minutes') t;
  SELECT id INTO wid FROM clinzo.appointment_window WHERE session_id=legacy_session AND starts_at=(today+time '11:00') AT TIME ZONE zone;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  today_booking:=public.book_clinic_appointment(patient,wid,psid,'',gen_random_uuid());
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings,version,today);
  version:=(result->'settings'->>'row_version')::bigint;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.appointment_window w ON w.id=a.window_id
    WHERE a.id=today_booking AND a.window_id=wid AND w.starts_at=(today+time '11:00') AT TIME ZONE zone AND w.ends_at-w.starts_at=interval '15 minutes') THEN
    RAISE EXCEPTION 'Same-day edit changed the pending appointment'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_window w WHERE w.session_id=legacy_session AND w.state='open'
    AND w.starts_at=(today+time '12:00') AT TIME ZONE zone AND w.ends_at-w.starts_at=interval '30 minutes') THEN
    RAISE EXCEPTION 'Same-day edit did not regenerate free times in an in-progress block'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule_from_date(practice,'clinic',settings,version,change_day); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Patient edited doctor schedule'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT 'schedule_duration_smoke_passed' AS result;
ROLLBACK;
