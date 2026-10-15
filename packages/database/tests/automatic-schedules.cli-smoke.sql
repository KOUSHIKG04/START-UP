-- Disposable database only. Synthetic fixtures and all writes roll back.
BEGIN;
DO $$
DECLARE
  doctor_auth uuid:=gen_random_uuid(); owner_auth uuid:=gen_random_uuid(); outsider_auth uuid:=gen_random_uuid();
  doctor_identity uuid; owner_identity uuid; outsider_identity uuid; doctor_id uuid; org_id uuid; facility_id uuid; practice uuid;
  settings jsonb; result jsonb; version bigint; tomorrow date; zone text:='Asia/Kolkata'; exception_id uuid;
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
  -- Existing legacy rule families must neither become automatic nor be retired.
  INSERT INTO clinzo.schedule_rule(doctor_facility_id,version,family_id,effective_from,iso_weekdays,local_start,local_end,window_minutes,
    window_capacity,session_capacity,timezone,state)
    SELECT practice,1,gen_random_uuid(),(now() AT TIME ZONE zone)::date,ARRAY[1,2,3,4,5,6,7]::smallint[],time '09:00',time '10:00',15,1,4,zone,'published'
    FROM generate_series(1,2);
  settings:=jsonb_build_object('working_days',jsonb_build_array(1,2,3,4,5,6,7),'online_working_days',jsonb_build_array(1,2,3,4,5,6,7),
    'home_working_days',jsonb_build_array(1,2,3,4,5,6,7),'clinic_start','09:00','clinic_end','10:00','online_start','11:00','online_end','12:00',
    'home_start','16:00','home_end','17:00','slot_minutes',15,'online_slot_minutes',30,'home_slot_minutes',60,'online_daily_limit',2,
    'walkin_daily_limit',4,'auto_accept',true,'auto_accept_limit',3,'home_visits',true,'home_radius_km',5,'clinic_fee_minor',10000,
    'online_fee_minor',20000,'home_fee_minor',30000);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  result:=public.publish_doctor_schedule(practice,'clinic',settings,0);
  IF (result->>'slot_count')::int NOT BETWEEN 116 AND 120 OR (result->>'horizon_days')::int<>30 THEN RAISE EXCEPTION 'Automatic 30-day clinic generation failed'; END IF;
  version:=(result->'settings'->>'row_version')::bigint;
  -- Facility changes the very same schedule and the same optimistic version.
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  result:=public.publish_doctor_schedule(practice,'online',settings,version);
  version:=(result->'settings'->>'row_version')::bigint;
  result:=public.publish_doctor_schedule(practice,'home',settings,version);
  version:=(result->'settings'->>'row_version')::bigint;
  IF jsonb_array_length(result->'settings'->'published_modes')<>3 THEN RAISE EXCEPTION 'Three recurring modes were not shared'; END IF;
  FOR mode IN SELECT unnest(ARRAY['clinic','online','home']) LOOP
    result:=public.list_practice_service_slots(practice,mode,NULL,now(),3000);
    IF jsonb_array_length(result)=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements(result) s WHERE s->>'service_mode' IS DISTINCT FROM mode) THEN
      RAISE EXCEPTION 'Patient service slot isolation failed for %',mode; END IF;
    IF (public.list_practice_service_slots(practice,mode,NULL,now(),1)->0->>'service_mode') IS DISTINCT FROM mode THEN
      RAISE EXCEPTION 'Service filtering happened after the result limit'; END IF;
  END LOOP;
  denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule_from_date(practice,'clinic',settings,version,(now() AT TIME ZONE zone)::date-1);
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Schedule edit for yesterday was allowed'; END IF;
  -- An existing current-day session must survive every later publication.
  EXECUTE 'RESET ROLE';
  INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone) VALUES(doctor_id,(now() AT TIME ZONE zone)::date,zone) ON CONFLICT DO NOTHING RETURNING id INTO today_day;
  IF today_day IS NULL THEN SELECT b.id INTO today_day FROM clinzo.doctor_booking_day b WHERE b.doctor_id=(SELECT p.doctor_id FROM clinzo.doctor_facility p WHERE p.id=practice) AND b.local_date=(now() AT TIME ZONE zone)::date; END IF;
  INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
    VALUES(practice,doctor_id,today_day,((now() AT TIME ZONE zone)::date+time '07:00') AT TIME ZONE zone,
      ((now() AT TIME ZONE zone)::date+time '07:15') AT TIME ZONE zone,zone,1,'published') RETURNING id INTO today_sid;
  UPDATE clinzo.session SET schedule_rule_id=(SELECT id FROM clinzo.schedule_rule WHERE doctor_facility_id=practice AND service_mode='clinic' AND automatic AND state='published') WHERE id=today_sid;
  INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
    VALUES(practice,'clinic-today','Clinic today',10000,'INR',15) RETURNING id INTO psid;
  INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(today_sid,psid);
  INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
    SELECT today_sid,starts_at,ends_at,1,'open' FROM clinzo.session WHERE id=today_sid RETURNING id INTO today_wid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule(practice,'clinic',settings,0); EXCEPTION WHEN SQLSTATE 'PT409' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Stale facility overwrite was accepted'; END IF;
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true); denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule(practice,'clinic',settings,version); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Outsider changed schedule'; END IF;
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true); denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule(practice,'online',settings||jsonb_build_object('online_start','09:00','online_end','10:00'),version);
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Overlapping recurring services were accepted'; END IF;
  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO count_before FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE s.doctor_facility_id=practice AND s.state='published';
  IF clinzo.refresh_automatic_schedules()<>0 THEN RAISE EXCEPTION 'Refresh duplicated already-published slots'; END IF;
  SELECT count(*) INTO count_after FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE s.doctor_facility_id=practice AND s.state='published';
  IF count_before<>count_after THEN RAISE EXCEPTION 'Refresh is not idempotent'; END IF;
  IF (SELECT count(*) FROM clinzo.schedule_rule r WHERE r.doctor_facility_id=practice AND NOT r.automatic AND r.state='published')<>2 THEN RAISE EXCEPTION 'Publication changed legacy rule families'; END IF;
  IF has_function_privilege('authenticated','clinzo.refresh_automatic_schedules()','EXECUTE')
    OR has_function_privilege('anon','public.publish_doctor_schedule(uuid,text,jsonb,bigint)','EXECUTE') THEN RAISE EXCEPTION 'Automatic schedule permissions are too broad'; END IF;
  -- Simulate the next missing edge of the rolling horizon.
  UPDATE clinzo.session s SET state='cancelled' WHERE s.doctor_facility_id=practice AND (s.starts_at AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date+29;
  UPDATE clinzo.appointment_window w SET state='blocked' FROM clinzo.session s WHERE s.id=w.session_id AND s.doctor_facility_id=practice AND s.state='cancelled';
  UPDATE clinzo.schedule_rule r SET materialized_through=(now() AT TIME ZONE zone)::date+28 WHERE r.doctor_facility_id=practice AND r.automatic AND r.state='published';
  IF clinzo.refresh_automatic_schedules()<>7 THEN RAISE EXCEPTION 'Daily refresh did not extend the missing horizon day'; END IF;
  IF clinzo.refresh_automatic_schedules()<>0 THEN RAISE EXCEPTION 'Daily refresh duplicated its newly generated edge'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE s.doctor_facility_id=practice AND s.state='published'
    AND w.ends_at-w.starts_at<>make_interval(mins=>CASE clinzo.service_mode_for_session(s.id) WHEN 'clinic' THEN 15 WHEN 'online' THEN 30 ELSE 60 END)) THEN RAISE EXCEPTION 'Service slot intervals changed'; END IF;
  tomorrow:=(now() AT TIME ZONE zone)::date+1;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  exception_id:=public.add_doctor_unavailability(practice,(tomorrow+time '09:00') AT TIME ZONE zone,(tomorrow+time '10:00') AT TIME ZONE zone,'Online only','online');
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_practice_clinic_slots(practice,NULL,(tomorrow+time '08:59') AT TIME ZONE zone,100)) slot
    WHERE (slot->>'starts_at')::timestamptz=(tomorrow+time '09:00') AT TIME ZONE zone) THEN RAISE EXCEPTION 'Online block hid clinic availability'; END IF;
  exception_id:=public.add_doctor_unavailability(practice,(tomorrow+time '09:00') AT TIME ZONE zone,(tomorrow+time '10:00') AT TIME ZONE zone,'Clinic only','clinic');
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_practice_clinic_slots(practice,NULL,(tomorrow+time '08:59') AT TIME ZONE zone,100)) slot
    WHERE (slot->>'starts_at')::timestamptz=(tomorrow+time '09:00') AT TIME ZONE zone) THEN RAISE EXCEPTION 'Clinic block did not hide clinic availability'; END IF;
  denied:=false;
  BEGIN PERFORM public.add_doctor_unavailability(practice,(tomorrow+time '09:00') AT TIME ZONE zone,(tomorrow+time '10:00') AT TIME ZONE zone,'All services','all');
  EXCEPTION WHEN unique_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'All block overlapped scoped blocks'; END IF;
  PERFORM public.revoke_clinic_unavailability(exception_id,1);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_practice_clinic_slots(practice,NULL,(tomorrow+time '08:59') AT TIME ZONE zone,100)) slot
    WHERE (slot->>'starts_at')::timestamptz=(tomorrow+time '09:00') AT TIME ZONE zone) THEN RAISE EXCEPTION 'Removing a clinic block did not restore availability'; END IF;
  EXECUTE 'RESET ROLE';
  SELECT s.id,w.id,ss.practice_service_id INTO sid,wid,psid FROM clinzo.session s JOIN clinzo.appointment_window w ON w.session_id=s.id
    JOIN clinzo.session_service ss ON ss.session_id=s.id WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='clinic'
      AND s.state='published' AND (s.starts_at AT TIME ZONE zone)::date=tomorrow+1 ORDER BY w.starts_at LIMIT 1;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Test patient') RETURNING id INTO patient;
  INSERT INTO clinzo.appointment(public_code,patient_id,session_id,window_id,practice_service_id,source,status,requested_by,confirmed_at,fee_minor,currency,
    doctor_name_snapshot,facility_name_snapshot,facility_address_snapshot,service_name_snapshot,doctor_registration_snapshot)
    VALUES(gen_random_uuid()::text,patient,sid,wid,psid,'staff_booking','confirmed',owner_identity,now(),10000,'INR','Doctor','Clinic','Street','Clinic visit','Test');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  result:=public.publish_doctor_schedule(practice,'clinic',settings||jsonb_build_object('clinic_start','08:00','clinic_end','09:00'),version);
  version:=(result->'settings'->>'row_version')::bigint;
  -- A home-only block must not require resolving an existing clinic booking.
  PERFORM public.add_doctor_unavailability(practice,((tomorrow+1)+time '09:00') AT TIME ZONE zone,((tomorrow+1)+time '10:00') AT TIME ZONE zone,'Home only','home');
  denied:=false;
  BEGIN PERFORM public.add_doctor_unavailability(practice,((tomorrow+1)+time '09:00') AT TIME ZONE zone,((tomorrow+1)+time '10:00') AT TIME ZONE zone,'All services','all');
  EXCEPTION WHEN check_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Confirmed clinic appointment was not protected from an all-services block'; END IF;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.session s JOIN clinzo.appointment_window w ON w.session_id=s.id WHERE s.id=sid AND w.id=wid AND s.state='published'
    AND (w.starts_at AT TIME ZONE zone)::time=time '09:00') THEN RAISE EXCEPTION 'Publishing moved a booked appointment'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.appointment_window w WHERE w.session_id=sid AND w.id<>wid AND w.state='open') THEN RAISE EXCEPTION 'Old unbooked windows stayed available after schedule update'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE w.id=today_wid AND w.state='open' AND s.state='published') THEN
    RAISE EXCEPTION 'Publication changed current-day slots'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.schedule_rule r WHERE r.doctor_facility_id=practice AND r.service_mode='clinic' AND r.state='published' AND r.local_start=time '08:00') THEN RAISE EXCEPTION 'Updated recurring hours were not published'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  -- Saving a pair rolls back its first service if the second conflicts.
  denied:=false;
  BEGIN PERFORM public.add_doctor_unavailability_for_services(practice,(tomorrow+time '09:00') AT TIME ZONE zone,(tomorrow+time '10:00') AT TIME ZONE zone,'Pair conflict',ARRAY['clinic','online']);
  EXCEPTION WHEN unique_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Multi-service conflict was accepted'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_clinic_unavailability(practice)) e WHERE e->>'reason'='Pair conflict') THEN
    RAISE EXCEPTION 'Conflicting pair left a partial unavailable block'; END IF;
  -- All service combinations hide patient times and the doctor's available list,
  -- while leaving the unselected service available. Use a separate date per pair.
  FOR count_before IN 0..3 LOOP
    PERFORM public.add_doctor_unavailability_for_services(practice,
      ((tomorrow+3+count_before)+time '08:00') AT TIME ZONE zone,
      ((tomorrow+3+count_before)+time '18:00') AT TIME ZONE zone,'Combination test',
      CASE count_before WHEN 0 THEN ARRAY['clinic','online'] WHEN 1 THEN ARRAY['clinic','home'] WHEN 2 THEN ARRAY['online','home'] ELSE ARRAY['all'] END);
    SELECT count(*) INTO count_after FROM jsonb_array_elements(public.list_my_clinic_sessions(practice)) s
      WHERE (s->>'starts_at')::timestamptz AT TIME ZONE zone >= (tomorrow+3+count_before)::timestamp
      AND (s->>'starts_at')::timestamptz AT TIME ZONE zone < (tomorrow+4+count_before)::timestamp
      AND jsonb_array_length(s->'available_slots')>0;
    IF count_after<>(CASE WHEN count_before=3 THEN 0 ELSE 1 END) THEN
      RAISE EXCEPTION 'Wrong remaining services for combination %',count_before; END IF;
    SELECT count(*) INTO count_after FROM jsonb_array_elements(public.list_practice_clinic_slots(practice,NULL,
      ((tomorrow+3+count_before)+time '07:59') AT TIME ZONE zone,100)) s
      WHERE ((s->>'starts_at')::timestamptz AT TIME ZONE zone)::date=tomorrow+3+count_before
      ;
    IF count_after<>(CASE count_before WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 4 ELSE 0 END) THEN
      RAISE EXCEPTION 'Patient discovery returned wrong times for combination %',count_before; END IF;
  END LOOP;
  result:=public.publish_doctor_schedule(practice,'clinic',settings||jsonb_build_object('clinic_start','23:00','clinic_end','24:00','slot_minutes',30),version);
  version:=(result->'settings'->>'row_version')::bigint;
  result:=public.publish_doctor_schedule(practice,'home',settings||jsonb_build_object('clinic_start','23:00','clinic_end','24:00','slot_minutes',30,'home_visits',false),version);
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_facility_id=practice AND s.starts_at>now() AND s.state='published'
    AND clinzo.service_mode_for_session(s.id)='home') THEN RAISE EXCEPTION 'Disabling home visits kept empty future home slots available'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND s.state='published' AND clinzo.service_mode_for_session(s.id)='clinic'
      AND (w.starts_at AT TIME ZONE zone)::time=time '23:30' AND (w.ends_at AT TIME ZONE zone)::time=time '00:00') THEN RAISE EXCEPTION 'Automatic midnight-ending slots were not generated'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  version:=(result->'settings'->>'row_version')::bigint;
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings||jsonb_build_object('clinic_start','22:00','clinic_end','23:00','slot_minutes',30,'home_visits',false),version,tomorrow+7);
  version:=(result->'settings'->>'row_version')::bigint;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE s.doctor_facility_id=practice AND s.state='published' AND w.state='open'
    AND (w.starts_at AT TIME ZONE zone)::date=tomorrow+6 AND (w.starts_at AT TIME ZONE zone)::time=time '23:00') THEN
    RAISE EXCEPTION 'Later effective date changed earlier unbooked times'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id WHERE s.doctor_facility_id=practice AND s.state='published' AND w.state='open'
    AND (w.starts_at AT TIME ZONE zone)::date=tomorrow+8 AND (w.starts_at AT TIME ZONE zone)::time=time '22:00') THEN
    RAISE EXCEPTION 'Future effective date did not publish updated times'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings||jsonb_build_object('clinic_start','21:00','clinic_end','22:00','slot_minutes',30,'home_visits',false),version,tomorrow+90);
  IF (result->'settings'->'published_from'->>'clinic')::date<>tomorrow+90 THEN RAISE EXCEPTION 'Future effective date was not exposed to both editors'; END IF;
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.session s SET state='cancelled' WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='clinic'
    AND (s.starts_at AT TIME ZONE zone)::date=(now() AT TIME ZONE zone)::date+29 AND s.starts_at>now();
  UPDATE clinzo.appointment_window w SET state='blocked' FROM clinzo.session s WHERE s.id=w.session_id AND s.doctor_facility_id=practice AND s.state='cancelled';
  UPDATE clinzo.schedule_rule r SET materialized_through=(now() AT TIME ZONE zone)::date+28 WHERE r.doctor_facility_id=practice AND r.automatic AND r.local_start=time '22:00';
  IF clinzo.refresh_automatic_schedules()<>2 THEN RAISE EXCEPTION 'Waiting for a later change stopped the earlier schedule horizon refresh'; END IF;
  IF clinzo.refresh_automatic_schedules()<>0 THEN RAISE EXCEPTION 'Earlier schedule refresh duplicated times'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_facility_id=practice AND s.state='published' AND s.starts_at>now()
    AND (s.starts_at AT TIME ZONE zone)::time=time '21:00') THEN RAISE EXCEPTION 'Later schedule started before its effective date'; END IF;
END $$;
ROLLBACK;
