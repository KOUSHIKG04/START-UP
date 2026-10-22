-- Execute within BEGIN/ROLLBACK only. Uses an existing managed practice with no
-- reserved appointments from the chosen effective date, plus transient test data.
DO $$
DECLARE practice uuid; actor uuid; identity_id uuid; doctor_key uuid; zone text; day date;
  settings jsonb; result jsonb; view jsonb; slot jsonb; version_before bigint; denied boolean;
  patient uuid; appointment_key uuid; original_window uuid; home_session clinzo.session;
BEGIN
  SELECT p.id,u.id,i.id,d.id,d.booking_timezone INTO practice,actor,identity_id,doctor_key,zone
    FROM clinzo.doctor_schedule_preferences prefs JOIN clinzo.doctor_facility p ON p.id=prefs.doctor_facility_id
    JOIN clinzo.doctor d ON d.id=p.doctor_id JOIN clinzo.identity i ON i.disabled_at IS NULL
    JOIN auth.users u ON i.issuer='supabase' AND i.subject=u.id::text
    WHERE clinzo.can_edit_practice_schedule(i.id,p.id) AND clinzo.can_manage_practice(i.id,p.id)
      AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL) AND (u.banned_until IS NULL OR u.banned_until<now())
      AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id
        WHERE s.doctor_id=d.id AND s.ends_at>((now() AT TIME ZONE d.booking_timezone)::date+7)::timestamp AT TIME ZONE d.booking_timezone
          AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now())))
    LIMIT 1;
  IF practice IS NULL THEN RAISE EXCEPTION 'No empty managed future schedule available for rollback verification'; END IF;
  day:=(now() AT TIME ZONE zone)::date+7;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  settings:=public.get_my_schedule_preferences(practice);
  -- Withdraw future unbooked online/home blocks through the real owner first.
  result:=public.publish_doctor_schedule_from_date(practice,'online',settings||jsonb_build_object('online_daily_limit',0),(settings->>'row_version')::bigint,day);
  settings:=result->'settings';
  result:=public.publish_doctor_schedule_from_date(practice,'home',settings||jsonb_build_object('home_visits',false),(settings->>'row_version')::bigint,day);
  settings:=result->'settings';
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings||jsonb_build_object(
    'working_days',jsonb_build_array(1,2,3,4,5,6,7),'slot_minutes',30,'walkin_daily_limit',12,'clinic_app_daily_limit',12,'clinic_walkin_daily_limit',0,
    'clinic_time_blocks',jsonb_build_array(jsonb_build_object('start','09:00','end','10:00'),jsonb_build_object('start','11:00','end','12:00'),jsonb_build_object('start','14:00','end','16:00'))),
    (settings->>'row_version')::bigint,day);
  settings:=result->'settings';
  IF jsonb_array_length(settings->'clinic_time_blocks')<>3 OR (result->>'slot_count')::int<8 THEN RAISE EXCEPTION 'Split clinic blocks failed'; END IF;
  result:=public.publish_doctor_schedule_from_date(practice,'online',settings||jsonb_build_object(
    'online_working_days',jsonb_build_array(1,2,3,4,5,6,7),'online_daily_limit',2,'online_slot_minutes',30,
    'online_time_blocks',jsonb_build_array(jsonb_build_object('start','10:00','end','11:00'),jsonb_build_object('start','16:30','end','17:30'))),
    (settings->>'row_version')::bigint,day);
  settings:=result->'settings';
  result:=public.publish_doctor_schedule_from_date(practice,'home',settings||jsonb_build_object(
    'home_working_days',jsonb_build_array(1,2,3,4,5,6,7),'home_visits',true,'home_radius_km',10,'home_fee_minor',10000,'home_slot_minutes',60,
    'home_time_blocks',jsonb_build_array(jsonb_build_object('start','12:30','end','13:30')),'home_travel_buffer_minutes',15),
    (settings->>'row_version')::bigint,day);
  settings:=result->'settings';
  version_before:=(settings->>'row_version')::bigint;
  view:=public.get_portal_clinic_day(practice,day);
  IF jsonb_array_length(view->'doctor_timeline')<>6 OR jsonb_array_length(view->'clinic_time_blocks')<>3
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(view->'doctor_timeline') x WHERE x->>'service_mode'='home' AND x->>'travel_buffer_minutes'='15') THEN
    RAISE EXCEPTION 'Reception mixed calendar or travel buffer is missing'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) x
    WHERE ((x->>'starts_at')::timestamptz AT TIME ZONE zone)::date=day)<>8 THEN RAISE EXCEPTION 'Patient clinic availability does not match split blocks'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(view->'slots') x WHERE x->>'state'='open'
    AND ((x->>'starts_at')::timestamptz AT TIME ZONE zone)::time>=time '10:00'
    AND ((x->>'starts_at')::timestamptz AT TIME ZONE zone)::time<time '11:00') THEN RAISE EXCEPTION 'Online time remains available for clinic registration'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.session a JOIN clinzo.session b ON a.doctor_id=b.doctor_id AND a.id<b.id
    WHERE a.doctor_id=doctor_key AND a.state<>'cancelled' AND b.state<>'cancelled'
      AND a.starts_at<b.ends_at AND a.ends_at>b.starts_at) THEN RAISE EXCEPTION 'Doctor calendar contains overlapping sessions'; END IF;
  denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule_from_date(practice,'clinic',settings||jsonb_build_object('clinic_time_blocks',jsonb_build_array(jsonb_build_object('start','09:00','end','10:30'))),version_before,day);
    EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-mode overlap accepted'; END IF;
  denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule_from_date(practice,'home',settings||jsonb_build_object('home_time_blocks',jsonb_build_array(jsonb_build_object('start','12:05','end','13:05'))),version_before,day);
    EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied OR (public.get_my_schedule_preferences(practice)->>'row_version')::bigint<>version_before THEN RAISE EXCEPTION 'Travel conflict accepted or failed edit mutated settings'; END IF;
  SELECT s.* INTO home_session FROM clinzo.session s WHERE s.doctor_id=doctor_key AND s.state='published' AND clinzo.service_mode_for_session(s.id)='home' AND (s.starts_at AT TIME ZONE zone)::date=day LIMIT 1;
  denied:=false;
  BEGIN INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
    VALUES(practice,doctor_key,home_session.booking_day_id,(day+time '12:10') AT TIME ZONE zone,(day+time '12:25') AT TIME ZONE zone,zone,1,'published');
    EXCEPTION WHEN check_violation THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Manual publisher bypassed home travel reservation'; END IF;
  SELECT x INTO slot FROM jsonb_array_elements(view->'slots') x WHERE x->>'state'='open' AND ((x->>'starts_at')::timestamptz AT TIME ZONE zone)::time=time '09:00' LIMIT 1;
  original_window:=(slot->>'window_id')::uuid;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Mixed schedule verification') RETURNING id INTO patient;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient,identity_id,'delegate',now());
  appointment_key:=public.book_clinic_appointment(patient,original_window,(slot->>'practice_service_id')::uuid,'Rollback verification',gen_random_uuid());
  denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule_from_date(practice,'clinic',settings||jsonb_build_object('clinic_time_blocks',jsonb_build_array(jsonb_build_object('start','14:00','end','16:00'))),version_before,day);
    EXCEPTION WHEN check_violation THEN denied:=true; END;
  IF NOT denied OR NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.id=appointment_key AND a.window_id=original_window AND a.capacity_released_at IS NULL) THEN RAISE EXCEPTION 'Existing reservation was moved or lost'; END IF;
  denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule_from_date(practice,'clinic',settings,version_before-1,day); EXCEPTION WHEN SQLSTATE 'PT409' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Stale schedule version accepted'; END IF;
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);denied:=false;
  BEGIN PERFORM public.publish_doctor_schedule_from_date(practice,'clinic',settings,version_before,day); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unauthorized mixed schedule edit accepted'; END IF;
END $$;
SELECT true AS multi_block_workflow_smoke_passed;
