-- Extend existing recurring schedules; no existing session, appointment, quota,
-- price or working day changes during migration.
ALTER TABLE clinzo.doctor_schedule_preferences
  ADD COLUMN clinic_time_blocks jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN online_time_blocks jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN home_time_blocks jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN home_travel_buffer_minutes integer NOT NULL DEFAULT 0 CONSTRAINT schedule_home_travel_buffer_check CHECK(home_travel_buffer_minutes BETWEEN 0 AND 180);
UPDATE clinzo.doctor_schedule_preferences SET
  clinic_time_blocks=jsonb_build_array(jsonb_build_object('start',to_char(clinic_start,'HH24:MI'),'end',CASE WHEN clinic_end=time '24:00' THEN '24:00' ELSE to_char(clinic_end,'HH24:MI') END)),
  online_time_blocks=jsonb_build_array(jsonb_build_object('start',to_char(online_start,'HH24:MI'),'end',CASE WHEN online_end=time '24:00' THEN '24:00' ELSE to_char(online_end,'HH24:MI') END)),
  home_time_blocks=jsonb_build_array(jsonb_build_object('start',to_char(home_start,'HH24:MI'),'end',CASE WHEN home_end=time '24:00' THEN '24:00' ELSE to_char(home_end,'HH24:MI') END));
ALTER TABLE clinzo.schedule_rule ADD COLUMN travel_buffer_minutes integer NOT NULL DEFAULT 0 CONSTRAINT schedule_rule_travel_buffer_check CHECK(travel_buffer_minutes BETWEEN 0 AND 180);
DROP INDEX clinzo.published_service_schedule_uq;
CREATE UNIQUE INDEX published_service_schedule_uq ON clinzo.schedule_rule(doctor_facility_id,service_mode,local_start,local_end)
  WHERE state='published' AND automatic;

CREATE FUNCTION clinzo.normalize_schedule_blocks(p_blocks jsonb,p_duration integer,p_buffer integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE block jsonb; start_min int; end_min int; previous_end int; result jsonb:='[]';
BEGIN
  IF jsonb_typeof(p_blocks) IS DISTINCT FROM 'array' OR jsonb_array_length(p_blocks) NOT BETWEEN 1 AND 8
    OR p_duration IS NULL OR p_duration<5 OR p_buffer IS NULL OR p_buffer NOT BETWEEN 0 AND 180 THEN
    RAISE EXCEPTION 'Add between 1 and 8 valid time blocks' USING ERRCODE='22023'; END IF;
  FOR block IN SELECT value FROM jsonb_array_elements(p_blocks) ORDER BY value->>'start' LOOP
    IF jsonb_typeof(block) IS DISTINCT FROM 'object' OR coalesce(block->>'start','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR coalesce(block->>'end','')!~'^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$' THEN
      RAISE EXCEPTION 'Time blocks require HH:MM start and end times' USING ERRCODE='22023'; END IF;
    start_min:=extract(epoch FROM (block->>'start')::time)::int/60;
    end_min:=extract(epoch FROM (block->>'end')::time)::int/60;
    IF end_min-start_min<p_duration OR start_min-p_buffer<0 OR end_min+p_buffer>1440
      OR (previous_end IS NOT NULL AND previous_end+p_buffer>start_min-p_buffer) THEN
      RAISE EXCEPTION 'Time blocks must fit an appointment and cannot overlap, including travel buffers' USING ERRCODE='22023'; END IF;
    previous_end:=end_min;
    result:=result||jsonb_build_array(jsonb_build_object('start',block->>'start','end',block->>'end'));
  END LOOP;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION clinzo.normalize_schedule_blocks(jsonb,integer,integer) FROM PUBLIC,anon,authenticated;

-- Preserve the existing authorization/version/audit owner and old-client fields.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('public.get_my_schedule_preferences(uuid)'::regprocedure);
  IF position('''row_version'',s.row_version::text' in definition)=0 THEN RAISE EXCEPTION 'Unexpected schedule settings projection'; END IF;
  definition:=replace(definition,'''row_version'',s.row_version::text',
    '''clinic_time_blocks'',s.clinic_time_blocks,''online_time_blocks'',s.online_time_blocks,''home_time_blocks'',s.home_time_blocks,''home_travel_buffer_minutes'',s.home_travel_buffer_minutes,''row_version'',s.row_version::text');
  definition:=replace(definition,'jsonb_agg(r.service_mode)','jsonb_agg(DISTINCT r.service_mode)');
  EXECUTE definition;
  definition:=pg_get_functiondef('public.save_my_schedule_preferences(uuid,jsonb,bigint)'::regprocedure);
  IF position('IF start_time IS NULL' in definition)=0 OR position('walkin_daily_limit=walkin_limit,' in definition)=0 THEN RAISE EXCEPTION 'Unexpected schedule settings mutation'; END IF;
  definition:=replace(definition,'online_limit int; walkin_limit int;',
    'clinic_blocks jsonb; online_blocks jsonb; home_blocks jsonb; travel_buffer int; online_limit int; walkin_limit int;');
  definition:=replace(definition,'IF start_time IS NULL',
    'travel_buffer:=coalesce((p_settings->>''home_travel_buffer_minutes'')::int,previous.home_travel_buffer_minutes,0);
    clinic_blocks:=clinzo.normalize_schedule_blocks(coalesce(p_settings->''clinic_time_blocks'',
      CASE WHEN start_time IS DISTINCT FROM previous.clinic_start OR end_time IS DISTINCT FROM previous.clinic_end OR previous.doctor_facility_id IS NULL THEN
        jsonb_build_array(jsonb_build_object(''start'',to_char(start_time,''HH24:MI''),''end'',CASE WHEN end_time=time ''24:00'' THEN ''24:00'' ELSE to_char(end_time,''HH24:MI'') END)) ELSE previous.clinic_time_blocks END),duration,0);
    online_blocks:=clinzo.normalize_schedule_blocks(coalesce(p_settings->''online_time_blocks'',
      CASE WHEN online_start_time IS DISTINCT FROM previous.online_start OR online_end_time IS DISTINCT FROM previous.online_end OR previous.doctor_facility_id IS NULL THEN
        jsonb_build_array(jsonb_build_object(''start'',to_char(online_start_time,''HH24:MI''),''end'',CASE WHEN online_end_time=time ''24:00'' THEN ''24:00'' ELSE to_char(online_end_time,''HH24:MI'') END)) ELSE previous.online_time_blocks END),online_duration,0);
    home_blocks:=clinzo.normalize_schedule_blocks(coalesce(p_settings->''home_time_blocks'',
      CASE WHEN home_start_time IS DISTINCT FROM previous.home_start OR home_end_time IS DISTINCT FROM previous.home_end OR previous.doctor_facility_id IS NULL THEN
        jsonb_build_array(jsonb_build_object(''start'',to_char(home_start_time,''HH24:MI''),''end'',CASE WHEN home_end_time=time ''24:00'' THEN ''24:00'' ELSE to_char(home_end_time,''HH24:MI'') END)) ELSE previous.home_time_blocks END),home_duration,travel_buffer);
    start_time:=(clinic_blocks->0->>''start'')::time; end_time:=(clinic_blocks->-1->>''end'')::time;
    online_start_time:=(online_blocks->0->>''start'')::time; online_end_time:=(online_blocks->-1->>''end'')::time;
    home_start_time:=(home_blocks->0->>''start'')::time; home_end_time:=(home_blocks->-1->>''end'')::time;
    IF start_time IS NULL');
  definition:=replace(definition,'walkin_daily_limit,clinic_app_daily_limit,',
    'walkin_daily_limit,clinic_time_blocks,online_time_blocks,home_time_blocks,home_travel_buffer_minutes,clinic_app_daily_limit,');
  definition:=replace(definition,'home_duration,online_limit,walkin_limit,',
    'home_duration,online_limit,walkin_limit,clinic_blocks,online_blocks,home_blocks,travel_buffer,');
  definition:=replace(definition,'walkin_daily_limit=walkin_limit,',
    'walkin_daily_limit=walkin_limit,clinic_time_blocks=clinic_blocks,online_time_blocks=online_blocks,home_time_blocks=home_blocks,home_travel_buffer_minutes=travel_buffer,');
  EXECUTE definition;
END $$;

-- All session publishers share the doctor lock and travel reservation check.
CREATE OR REPLACE FUNCTION clinzo.reject_overlapping_doctor_session() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE buffer int:=0;
BEGIN
  IF NEW.state='cancelled' THEN RETURN NEW; END IF;
  PERFORM id FROM clinzo.doctor WHERE id=NEW.doctor_id FOR UPDATE;
  SELECT coalesce(r.travel_buffer_minutes,0) INTO buffer FROM clinzo.schedule_rule r WHERE r.id=NEW.schedule_rule_id;
  buffer:=coalesce(buffer,0);
  IF EXISTS(SELECT 1 FROM clinzo.schedule_rule r JOIN clinzo.doctor_facility p ON p.id=r.doctor_facility_id
    WHERE p.doctor_id=NEW.doctor_id AND r.automatic AND r.service_mode='home' AND r.id IS DISTINCT FROM NEW.schedule_rule_id
      AND (r.state='published' OR (r.state='retired' AND r.effective_until IS NOT NULL))
      AND (NEW.starts_at AT TIME ZONE r.timezone)::date>=r.effective_from
      AND (r.effective_until IS NULL OR (NEW.starts_at AT TIME ZONE r.timezone)::date<=r.effective_until)
      AND extract(isodow FROM NEW.starts_at AT TIME ZONE r.timezone)::int=ANY(r.iso_weekdays)
      AND NEW.starts_at<(((NEW.starts_at AT TIME ZONE r.timezone)::date+r.local_end) AT TIME ZONE r.timezone)+make_interval(mins=>r.travel_buffer_minutes)
      AND NEW.ends_at>(((NEW.starts_at AT TIME ZONE r.timezone)::date+r.local_start) AT TIME ZONE r.timezone)-make_interval(mins=>r.travel_buffer_minutes)) THEN
    RAISE EXCEPTION 'Doctor is away for a home visit or travel buffer' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.session s LEFT JOIN clinzo.schedule_rule r ON r.id=s.schedule_rule_id
    WHERE s.doctor_id=NEW.doctor_id AND s.id<>NEW.id AND s.state<>'cancelled'
      AND ((s.starts_at<NEW.ends_at AND s.ends_at>NEW.starts_at)
        OR (s.schedule_rule_id IS DISTINCT FROM NEW.schedule_rule_id AND
          s.starts_at-make_interval(mins=>coalesce(r.travel_buffer_minutes,0))<NEW.ends_at+make_interval(mins=>buffer)
          AND s.ends_at+make_interval(mins=>coalesce(r.travel_buffer_minutes,0))>NEW.starts_at-make_interval(mins=>buffer)))) THEN
    RAISE EXCEPTION 'Doctor calendar overlaps another appointment block or home-visit travel buffer' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER reject_overlapping_doctor_session ON clinzo.session;
CREATE TRIGGER reject_overlapping_doctor_session BEFORE INSERT OR UPDATE OF starts_at,ends_at,state,schedule_rule_id ON clinzo.session
  FOR EACH ROW EXECUTE FUNCTION clinzo.reject_overlapping_doctor_session();
REVOKE ALL ON FUNCTION clinzo.reject_overlapping_doctor_session() FROM PUBLIC,anon,authenticated;

-- Materialization still creates every eligible physical time; daily quota is
-- enforced by the existing admission/availability owners across all blocks.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('clinzo.materialize_schedule_rule(uuid)'::regprocedure);
  IF position('AND s.starts_at<candidate_end AND s.ends_at>candidate)' in definition)=0 THEN RAISE EXCEPTION 'Unexpected schedule materializer'; END IF;
  definition:=replace(definition,'AND s.starts_at<candidate_end AND s.ends_at>candidate)',
    'AND ((s.starts_at<candidate_end AND s.ends_at>candidate) OR (s.schedule_rule_id IS DISTINCT FROM r.id
      AND s.starts_at-make_interval(mins=>coalesce((SELECT old.travel_buffer_minutes FROM clinzo.schedule_rule old WHERE old.id=s.schedule_rule_id),0))<candidate_end+make_interval(mins=>r.travel_buffer_minutes)
      AND s.ends_at+make_interval(mins=>coalesce((SELECT old.travel_buffer_minutes FROM clinzo.schedule_rule old WHERE old.id=s.schedule_rule_id),0))>candidate-make_interval(mins=>r.travel_buffer_minutes))))');
  EXECUTE definition;
END $$;

CREATE OR REPLACE FUNCTION public.publish_doctor_schedule_from_date(p_practice_id uuid,p_mode text,p_settings jsonb,p_expected_version bigint,p_effective_from date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor(); d clinzo.doctor; prefs clinzo.doctor_schedule_preferences;
  days smallint[]; duration int; daily_limit int; fee int; blocks jsonb; block jsonb; buffer int;
  start_time time; end_time time; rule_id uuid; slot_count int:=0; local_day date; booked record;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('clinic','online','home') THEN RAISE EXCEPTION 'Choose a service' USING ERRCODE='22023'; END IF;
  IF NOT coalesce(clinzo.can_edit_practice_schedule(actor,p_practice_id),false)
    OR NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN RAISE EXCEPTION 'Verified practice access required' USING ERRCODE='42501'; END IF;
  SELECT d0.* INTO d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE p.id=p_practice_id AND p.active AND d0.active AND d0.credential_status='verified'
      AND f.active AND f.verification_status='verified' AND o.active FOR UPDATE OF d0;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Verified practice access required' USING ERRCODE='42501'; END IF;
  local_day:=coalesce(p_effective_from,(now() AT TIME ZONE d.booking_timezone)::date);
  IF local_day<(now() AT TIME ZONE d.booking_timezone)::date OR local_day>(now() AT TIME ZONE d.booking_timezone)::date+365 THEN
    RAISE EXCEPTION 'Schedule changes must start today or a later date within one year' USING ERRCODE='22023'; END IF;
  PERFORM public.save_my_schedule_preferences(p_practice_id,p_settings,p_expected_version);
  SELECT * INTO STRICT prefs FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id;
  days:=CASE p_mode WHEN 'online' THEN prefs.online_working_days WHEN 'home' THEN prefs.home_working_days ELSE prefs.working_days END;
  blocks:=CASE p_mode WHEN 'online' THEN prefs.online_time_blocks WHEN 'home' THEN prefs.home_time_blocks ELSE prefs.clinic_time_blocks END;
  buffer:=CASE WHEN p_mode='home' THEN prefs.home_travel_buffer_minutes ELSE 0 END;
  duration:=CASE p_mode WHEN 'online' THEN prefs.online_slot_minutes WHEN 'home' THEN prefs.home_slot_minutes ELSE prefs.slot_minutes END;
  daily_limit:=CASE p_mode WHEN 'online' THEN prefs.online_daily_limit WHEN 'home' THEN CASE WHEN prefs.home_visits THEN 100 ELSE 0 END ELSE prefs.walkin_daily_limit END;
  fee:=CASE p_mode WHEN 'online' THEN prefs.online_fee_minor WHEN 'home' THEN prefs.home_fee_minor ELSE prefs.clinic_fee_minor END;
  IF daily_limit>0 AND fee IS NULL THEN RAISE EXCEPTION 'Set a consultation fee first' USING ERRCODE='22023'; END IF;
  -- Lock affected sessions before inspecting reservations, matching bookings.
  PERFORM s.id FROM clinzo.session s WHERE s.doctor_id=d.id AND s.ends_at>now()
    AND (s.starts_at AT TIME ZONE d.booking_timezone)::date>=local_day ORDER BY s.id FOR UPDATE OF s;
  IF daily_limit>0 THEN
    FOR block IN SELECT value FROM jsonb_array_elements(blocks) LOOP
      start_time:=(block->>'start')::time; end_time:=(block->>'end')::time;
      IF EXISTS(SELECT 1 FROM clinzo.schedule_rule r JOIN clinzo.doctor_facility p ON p.id=r.doctor_facility_id
        WHERE p.doctor_id=d.id AND (r.state='published' OR (r.state='retired' AND r.automatic AND r.effective_until IS NOT NULL))
          AND (r.effective_until IS NULL OR r.effective_until>=local_day) AND NOT(r.doctor_facility_id=p_practice_id AND r.service_mode=p_mode)
          AND r.iso_weekdays && days
          AND extract(epoch FROM r.local_start)/60-r.travel_buffer_minutes<extract(epoch FROM end_time)/60+buffer
          AND extract(epoch FROM r.local_end)/60+r.travel_buffer_minutes>extract(epoch FROM start_time)/60-buffer) THEN
        RAISE EXCEPTION 'Time blocks overlap another published service, practice or home-visit travel buffer. Split that schedule first.' USING ERRCODE='22023'; END IF;
    END LOOP;
    FOR booked IN SELECT a.id,w.starts_at,w.ends_at,s.starts_at AS session_start,s.ends_at AS session_end,s.doctor_facility_id,clinzo.service_mode_for_session(s.id) AS mode
      FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id JOIN clinzo.appointment_window w ON w.id=a.window_id
      WHERE s.doctor_id=d.id AND w.ends_at>now() AND (w.starts_at AT TIME ZONE d.booking_timezone)::date>=local_day
        AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now())) LOOP
      IF booked.doctor_facility_id=p_practice_id AND booked.mode=p_mode THEN
        IF extract(isodow FROM booked.starts_at AT TIME ZONE d.booking_timezone)::int<>ALL(days)
          OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(blocks) b WHERE
            (booked.starts_at AT TIME ZONE d.booking_timezone)::time>=(b->>'start')::time
            AND (booked.ends_at AT TIME ZONE d.booking_timezone)::time<=(b->>'end')::time) THEN
          RAISE EXCEPTION 'Existing appointments would fall outside these blocks. Choose a later effective date or keep their time block.' USING ERRCODE='23514'; END IF;
      ELSIF extract(isodow FROM booked.starts_at AT TIME ZONE d.booking_timezone)::int=ANY(days) AND EXISTS(
        SELECT 1 FROM jsonb_array_elements(blocks) b WHERE
          booked.session_start < (((booked.starts_at AT TIME ZONE d.booking_timezone)::date+(b->>'end')::time) AT TIME ZONE d.booking_timezone) + make_interval(mins=>buffer)
          AND booked.session_end > (((booked.starts_at AT TIME ZONE d.booking_timezone)::date+(b->>'start')::time) AT TIME ZONE d.booking_timezone) - make_interval(mins=>buffer)) THEN
        RAISE EXCEPTION 'An existing booked session conflicts with these blocks. Choose another time or a later effective date.' USING ERRCODE='23514'; END IF;
    END LOOP;
  END IF;
  UPDATE clinzo.appointment_window w SET state='blocked' WHERE w.session_id IN (
    SELECT s.id FROM clinzo.session s JOIN clinzo.schedule_rule r ON r.id=s.schedule_rule_id
    WHERE s.doctor_facility_id=p_practice_id AND r.service_mode=p_mode AND r.automatic AND s.starts_at>now()
      AND (s.starts_at AT TIME ZONE d.booking_timezone)::date>=local_day)
    AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.window_id=w.id
      AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now())));
  UPDATE clinzo.session s SET state='cancelled' FROM clinzo.schedule_rule r WHERE r.id=s.schedule_rule_id
    AND s.doctor_facility_id=p_practice_id AND r.service_mode=p_mode AND r.automatic AND s.starts_at>now()
    AND (s.starts_at AT TIME ZONE d.booking_timezone)::date>=local_day AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.session_id=s.id);
  UPDATE clinzo.schedule_rule SET state='retired', effective_until=CASE WHEN effective_from<local_day THEN least(coalesce(effective_until,local_day-1),local_day-1) ELSE NULL END
    WHERE doctor_facility_id=p_practice_id AND service_mode=p_mode AND automatic
      AND (state='published' OR (state='retired' AND effective_until IS NOT NULL AND effective_until>=local_day));
  IF daily_limit>0 THEN
    FOR block IN SELECT value FROM jsonb_array_elements(blocks) LOOP
      INSERT INTO clinzo.schedule_rule(doctor_facility_id,version,family_id,effective_from,iso_weekdays,local_start,local_end,
        window_minutes,window_capacity,session_capacity,auto_confirm_limit,timezone,state,service_mode,fee_minor,automatic,travel_buffer_minutes)
        VALUES(p_practice_id,1,gen_random_uuid(),local_day,days,(block->>'start')::time,(block->>'end')::time,duration,1,daily_limit,
          CASE WHEN prefs.auto_accept THEN prefs.auto_accept_limit ELSE 0 END,d.booking_timezone,'published',p_mode,fee,true,buffer) RETURNING id INTO rule_id;
      slot_count:=slot_count+clinzo.materialize_schedule_rule(rule_id);
    END LOOP;
  END IF;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,facility_id,request_id,outcome,metadata)
    SELECT actor,'identity','schedule.recurring_published','doctor_facility',p.id,p.facility_id,gen_random_uuid(),'allowed',
      jsonb_build_object('service_mode',p_mode,'time_blocks',blocks,'travel_buffer_minutes',buffer,'slot_count',slot_count,'horizon_days',30,'effective_from',local_day)
      FROM clinzo.doctor_facility p WHERE p.id=p_practice_id;
  RETURN jsonb_build_object('settings',public.get_my_schedule_preferences(p_practice_id),'slot_count',slot_count,'horizon_days',30);
END $$;

-- Reception sees all visit types on the same clinic day and a travel reservation
-- beside each home-visit block. Clinic registration still accepts clinic slots only.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('public.get_portal_clinic_day(uuid,date)'::regprocedure);
  IF position('''slots'',slots' in definition)=0 THEN RAISE EXCEPTION 'Unexpected reception day projection'; END IF;
  definition:=replace(definition,'''slots'',slots',
    '''clinic_time_blocks'',settings.clinic_time_blocks,''doctor_timeline'',coalesce((SELECT jsonb_agg(jsonb_build_object(
      ''session_id'',s.id,''practice_id'',s.doctor_facility_id,''service_mode'',clinzo.service_mode_for_session(s.id),''starts_at'',s.starts_at,''ends_at'',s.ends_at,
      ''travel_buffer_minutes'',coalesce(r.travel_buffer_minutes,0),''state'',s.state) ORDER BY s.starts_at,s.id)
      FROM clinzo.session s LEFT JOIN clinzo.schedule_rule r ON r.id=s.schedule_rule_id
      WHERE s.doctor_id=(SELECT doctor_id FROM clinzo.doctor_facility WHERE id=p_practice_id)
        AND (s.starts_at AT TIME ZONE zone)::date=day AND s.state<>''cancelled''),''[]''::jsonb),''slots'',slots');
  EXECUTE definition;
END $$;
