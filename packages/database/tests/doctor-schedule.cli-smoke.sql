-- Disposable project only. Every fixture rolls back.
BEGIN;
DO $$
DECLARE u uuid := gen_random_uuid(); suffix text := replace(gen_random_uuid()::text,'-','');
  profile jsonb; practice_id uuid; settings jsonb; denied boolean;
  future_day date; doctor_timezone text; clinic_session uuid; online_session uuid; home_session uuid; clinic_service uuid; selected_sessions uuid[];
BEGIN
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',suffix||'@example.test',now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  profile:=public.complete_onboarding('solo_doctor',jsonb_build_object('full_name','Fixture Schedule Doctor',
    'registration_authority','Fixture Council','registration_number',suffix,'practice_started_on','2020-01-01',
    'clinic_name','Fixture Schedule Clinic','address','Clinic Street 123','latitude',12.97,'longitude',77.59));
  practice_id:=(public.list_my_practices()->0->>'practice_id')::uuid;
  IF practice_id IS NULL THEN RAISE EXCEPTION 'Doctor practice missing'; END IF;
  denied:=false;
  BEGIN PERFORM public.set_my_doctor_presence(true); EXCEPTION WHEN SQLSTATE '42501' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unverified doctor became present'; END IF;
  settings:=public.save_my_schedule_preferences(practice_id,jsonb_build_object('working_days',jsonb_build_array(1,2,3,4,5),
    'clinic_start','09:00','clinic_end','17:00','slot_minutes',15,
    'online_slot_minutes',30,'home_slot_minutes',60,'online_daily_limit',2,'walkin_daily_limit',6,
    'auto_accept',true,'auto_accept_limit',3,'home_visits',false,'online_fee_minor',30000,'clinic_fee_minor',25000,
    'home_fee_minor',null),0);
  IF settings->>'clinic_start'<>'09:00:00' OR (settings->>'row_version')::int<>1
    OR (settings->>'online_slot_minutes')::int<>30 OR (settings->>'home_slot_minutes')::int<>60 THEN
    RAISE EXCEPTION 'Doctor schedule did not persist'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.save_my_schedule_preferences(practice_id,settings || jsonb_build_object('home_visits',true,'home_fee_minor',40000),1);
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Home visit enabled without a radius'; END IF;
  settings:=public.save_my_schedule_preferences(practice_id,
    settings || jsonb_build_object('home_visits',true,'home_fee_minor',40000,'home_radius_km',5.5),1);
  IF (settings->>'home_radius_km')::numeric <> 5.5 OR settings->>'home_visits' <> 'true' THEN
    RAISE EXCEPTION 'Home visit radius did not persist'; END IF;
  denied:=false;
  BEGIN PERFORM public.save_my_schedule_preferences(practice_id,settings,0); EXCEPTION WHEN SQLSTATE '40001' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Stale schedule overwrite succeeded'; END IF;
  EXECUTE 'RESET ROLE';
  PERFORM clinzo.record_manual_credential_review('doctor',(profile->'doctor'->>'id')::uuid,'verified','fixture-company','fixture-evidence');
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  IF public.set_my_doctor_presence(true) IS DISTINCT FROM true OR public.get_my_doctor_presence() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Verified doctor presence failed'; END IF;
  PERFORM public.update_my_doctor_profile('Fixture Schedule Doctor','Updated biography for patient view',ARRAY['en']);
  doctor_timezone:=public.get_my_doctor_profile()->>'booking_timezone';
  future_day:=date_trunc('week',now() AT TIME ZONE doctor_timezone)::date+14;
  clinic_session:=public.publish_doctor_service_session(practice_id,'clinic',
    (future_day+time '09:00') AT TIME ZONE doctor_timezone,(future_day+time '10:00') AT TIME ZONE doctor_timezone,15,25000,'INR');
  online_session:=public.publish_doctor_service_session(practice_id,'online',
    (future_day+time '10:00') AT TIME ZONE doctor_timezone,(future_day+time '11:00') AT TIME ZONE doctor_timezone,30,30000,'INR');
  home_session:=public.publish_doctor_service_session(practice_id,'home',
    (future_day+time '11:00') AT TIME ZONE doctor_timezone,(future_day+time '12:00') AT TIME ZONE doctor_timezone,60,40000,'INR');
  EXECUTE 'RESET ROLE';
  IF (SELECT count(*) FROM clinzo.session WHERE id IN (clinic_session,online_session,home_session))<>3 THEN
    RAISE EXCEPTION 'Three service blocks on one day were not published'; END IF;
  SELECT practice_service_id INTO clinic_service FROM clinzo.session_service WHERE session_id=clinic_session;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  IF public.get_public_practice_bio(practice_id,clinic_service) <> 'Updated biography for patient view' THEN
    RAISE EXCEPTION 'Updated doctor biography did not reach public profile'; END IF;
  IF jsonb_array_length(public.list_practice_clinic_slots(practice_id,NULL,now(),100))<>7 THEN
    RAISE EXCEPTION 'Published service slots did not reach the patient slot API'; END IF;
  IF (SELECT count(DISTINCT item->>'service_mode') FROM jsonb_array_elements(public.list_my_clinic_sessions(practice_id)) item
      WHERE (item->>'id')::uuid IN (clinic_session,online_session,home_session))<>3 THEN
    RAISE EXCEPTION 'Published service modes were not visible in doctor schedule'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.publish_doctor_service_session(practice_id,'clinic',
      (future_day+time '09:30') AT TIME ZONE doctor_timezone,(future_day+time '10:00') AT TIME ZONE doctor_timezone,15,25000,'INR');
  EXCEPTION WHEN exclusion_violation OR check_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Overlapping doctor service block was accepted'; END IF;
  selected_sessions:=public.publish_selected_doctor_slots(practice_id,'clinic',ARRAY[
    (future_day+time '13:00') AT TIME ZONE doctor_timezone,
    (future_day+time '13:30') AT TIME ZONE doctor_timezone
  ],15,25000,'INR');
  EXECUTE 'RESET ROLE';
  IF cardinality(selected_sessions)<>2 OR
    (SELECT count(*) FROM clinzo.appointment_window WHERE session_id=ANY(selected_sessions))<>2 OR
    EXISTS(SELECT 1 FROM clinzo.appointment_window
      WHERE session_id=ANY(selected_sessions)
        AND starts_at=(future_day+time '13:15') AT TIME ZONE doctor_timezone) THEN
    RAISE EXCEPTION 'Manual slot selection published an unselected time'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  IF (public.get_my_doctor_daily_slot_usage(practice_id,future_day)->>'clinic')::integer<>6
    OR (public.get_my_doctor_daily_slot_usage(practice_id,future_day)->>'online')::integer<>2
    OR (public.get_my_doctor_daily_slot_usage(practice_id,future_day)->>'home')::integer<>1 THEN
    RAISE EXCEPTION 'Daily usage did not count published slots by service mode'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.publish_selected_doctor_slots(practice_id,'clinic',ARRAY[
      (future_day+time '14:00') AT TIME ZONE doctor_timezone
    ],15,25000,'INR');
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Clinic daily slot limit was exceeded'; END IF;
  denied:=false;
  BEGIN
    PERFORM public.publish_selected_doctor_slots(practice_id,'online',ARRAY[
      (future_day+time '14:15') AT TIME ZONE doctor_timezone
    ],30,30000,'INR');
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Online daily slot limit was exceeded'; END IF;
  denied:=false;
  BEGIN PERFORM public.get_my_doctor_daily_slot_usage(gen_random_uuid(),future_day);
  EXCEPTION WHEN SQLSTATE '42501' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unrelated practice usage was exposed'; END IF;
  settings:=public.save_my_schedule_preferences(practice_id,
    settings || jsonb_build_object('clinic_end','24:00'),2);
  IF settings->>'clinic_end'<>'24:00:00' THEN
    RAISE EXCEPTION 'End-of-day clinic hours did not persist'; END IF;
  selected_sessions:=public.publish_selected_doctor_slots(practice_id,'clinic',ARRAY[
    ((future_day+1)+time '23:30') AT TIME ZONE doctor_timezone,
    ((future_day+1)+time '23:45') AT TIME ZONE doctor_timezone
  ],15,25000,'INR');
  EXECUTE 'RESET ROLE';
  IF cardinality(selected_sessions)<>1 OR
    (SELECT count(*) FROM clinzo.appointment_window
      WHERE session_id=ANY(selected_sessions)
        AND (ends_at AT TIME ZONE doctor_timezone)=((future_day+2)::timestamp))<>1 THEN
    RAISE EXCEPTION 'A slot ending exactly at midnight was not published'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  denied:=false;
  BEGIN
    PERFORM public.publish_doctor_service_session(practice_id,'clinic',
      ((future_day+1)+time '23:45') AT TIME ZONE doctor_timezone,
      ((future_day+2)+time '00:15') AT TIME ZONE doctor_timezone,15,25000,'INR');
  EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'A slot ending after midnight was accepted'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS doctor_schedule_smoke_passed;
ROLLBACK;
