-- Existing managed practice, with all changes and measurements rolled back.
BEGIN;
SET LOCAL statement_timeout='8s';
SET LOCAL lock_timeout='2s';
CREATE TEMP TABLE schedule_performance_report(action text,elapsed_ms numeric);
DO $$
DECLARE practice uuid; actor text; doctor_key uuid; zone text; settings jsonb; result jsonb;
  windows_before uuid[]; windows_after uuid[]; rules_before uuid[]; day date; started timestamptz;
  denied boolean; app_limit int; original_bookings jsonb; current_bookings jsonb; split_blocks jsonb;
BEGIN
  SELECT p.id,i.subject,d.id,d.booking_timezone INTO practice,actor,doctor_key,zone
    FROM clinzo.doctor_facility p JOIN clinzo.doctor d ON d.id=p.doctor_id JOIN clinzo.identity i ON i.id=d.identity_id
    WHERE p.active AND d.active AND d.credential_status='verified'
      AND EXISTS(SELECT 1 FROM clinzo.schedule_rule r WHERE r.doctor_facility_id=p.id AND r.automatic AND r.state='published' AND r.service_mode='clinic')
      AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id
        WHERE s.doctor_id=d.id AND s.ends_at>((now() AT TIME ZONE d.booking_timezone)::date+7)::timestamp AT TIME ZONE d.booking_timezone
          AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now())))
    ORDER BY (d.full_name='Doctor-02') DESC,p.id LIMIT 1;
  IF practice IS NULL THEN RAISE EXCEPTION 'No managed future schedule fixture'; END IF;
  day:=(now() AT TIME ZONE zone)::date+7;
  PERFORM set_config('request.jwt.claim.sub',actor,true);
  settings:=public.get_my_schedule_preferences(practice);
  SELECT array_agg(w.id ORDER BY w.id) INTO windows_before FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='clinic' AND w.state='open';
  SELECT array_agg(id ORDER BY id) INTO rules_before FROM clinzo.schedule_rule WHERE doctor_facility_id=practice AND service_mode='clinic' AND state='published' AND automatic;
  SELECT jsonb_agg(jsonb_build_array(a.id,a.window_id,a.status,a.fee_minor) ORDER BY a.id) INTO original_bookings FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id WHERE s.doctor_id=doctor_key;
  started:=clock_timestamp();
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings,(settings->>'row_version')::bigint,day);
  INSERT INTO schedule_performance_report VALUES('unchanged',1000*extract(epoch FROM clock_timestamp()-started));
  IF (result->>'slot_count')::int<>0 THEN RAISE EXCEPTION 'Unchanged grid regenerated slots'; END IF;
  settings:=result->'settings';
  app_limit:=(settings->>'clinic_app_daily_limit')::int;
  settings:=settings||jsonb_build_object('clinic_app_daily_limit',app_limit+CASE WHEN app_limit<199 THEN 1 ELSE -1 END,
    'walkin_daily_limit',(settings->>'walkin_daily_limit')::int+CASE WHEN app_limit<199 THEN 1 ELSE -1 END);
  started:=clock_timestamp();
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings,(settings->>'row_version')::bigint,day);
  INSERT INTO schedule_performance_report VALUES('quota-only',1000*extract(epoch FROM clock_timestamp()-started));
  IF (result->>'slot_count')::int<>0 OR rules_before IS DISTINCT FROM (SELECT array_agg(id ORDER BY id) FROM clinzo.schedule_rule WHERE doctor_facility_id=practice AND service_mode='clinic' AND state='published' AND automatic) THEN
    RAISE EXCEPTION 'Quota-only edit replaced the schedule'; END IF;
  SELECT array_agg(w.id ORDER BY w.id) INTO windows_after FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='clinic' AND w.state='open';
  IF windows_before IS DISTINCT FROM windows_after THEN RAISE EXCEPTION 'Quota edit changed window IDs'; END IF;
  settings:=result->'settings';
  -- A fee change takes the real regeneration path, not the unchanged-grid path.
  started:=clock_timestamp();
  result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings||jsonb_build_object('clinic_fee_minor',(settings->>'clinic_fee_minor')::int+100),(settings->>'row_version')::bigint,day);
  INSERT INTO schedule_performance_report VALUES('fee-change-rebuild',1000*extract(epoch FROM clock_timestamp()-started));
  IF (result->>'slot_count')::int<=0 THEN RAISE EXCEPTION 'Changed fee skipped regeneration'; END IF;
  settings:=result->'settings';
  IF (settings->>'slot_minutes')::int<>5 THEN
    started:=clock_timestamp();
    result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings||jsonb_build_object('slot_minutes',5),(settings->>'row_version')::bigint,day);
    INSERT INTO schedule_performance_report VALUES('duration-change-rebuild',1000*extract(epoch FROM clock_timestamp()-started));
    IF (result->>'slot_count')::int<=0 OR EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
      WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='clinic' AND w.state='open'
        AND (w.starts_at AT TIME ZONE zone)::date>=day AND w.ends_at-w.starts_at<>interval '5 minutes'
        AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.window_id=w.id)) THEN
      RAISE EXCEPTION 'Duration change did not regenerate future unbooked windows'; END IF;
  END IF;
  -- Exercise the supported maximum number of blocks as well as typical edits.
  IF NOT EXISTS(SELECT 1 FROM clinzo.schedule_rule r JOIN clinzo.doctor_facility p ON p.id=r.doctor_facility_id
    WHERE p.doctor_id=doctor_key AND r.state='published' AND r.service_mode<>'clinic') THEN
    settings:=result->'settings';
    SELECT jsonb_agg(jsonb_build_object('start',to_char(time '09:00'+make_interval(hours=>i),'HH24:MI'),
      'end',to_char(time '09:50'+make_interval(hours=>i),'HH24:MI')) ORDER BY i) INTO split_blocks FROM generate_series(0,7) i;
    started:=clock_timestamp();
    result:=public.publish_doctor_schedule_from_date(practice,'clinic',settings||jsonb_build_object('slot_minutes',5,
      'working_days',jsonb_build_array(1,2,3,4,5,6,7),'clinic_time_blocks',split_blocks),(settings->>'row_version')::bigint,day);
    INSERT INTO schedule_performance_report VALUES('eight-block-rebuild',1000*extract(epoch FROM clock_timestamp()-started));
    IF jsonb_array_length(result->'settings'->'clinic_time_blocks')<>8 OR (result->>'slot_count')::int<=0 THEN
      RAISE EXCEPTION 'Eight-block publication did not generate availability'; END IF;
  END IF;
  SELECT jsonb_agg(jsonb_build_array(a.id,a.window_id,a.status,a.fee_minor) ORDER BY a.id) INTO current_bookings FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id WHERE s.doctor_id=doctor_key;
  IF original_bookings IS DISTINCT FROM current_bookings THEN RAISE EXCEPTION 'Schedule edit changed existing appointments'; END IF;
  denied:=false;
  BEGIN UPDATE clinzo.doctor_booking_day SET timezone='Invalid/ScheduleZone' WHERE id=(SELECT booking_day_id FROM clinzo.session WHERE doctor_facility_id=practice LIMIT 1);
  EXCEPTION WHEN check_violation THEN IF SQLERRM='Invalid IANA timezone' THEN denied:=true; ELSE RAISE; END IF; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid timezone update accepted'; END IF;
  denied:=false;
  BEGIN INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone) VALUES(doctor_key,day+1000,'Invalid/ScheduleZone');
  EXCEPTION WHEN check_violation THEN IF SQLERRM='Invalid IANA timezone' THEN denied:=true; ELSE RAISE; END IF; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid timezone insertion accepted'; END IF;
END $$;
SELECT true AS schedule_performance_workflow_passed,jsonb_agg(to_jsonb(r)) AS timings FROM schedule_performance_report r;
ROLLBACK;
