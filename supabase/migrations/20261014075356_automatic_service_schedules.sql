-- Automatic recurring availability is shared by the doctor and facility editors.
ALTER TABLE clinzo.doctor_schedule_preferences
  ADD COLUMN online_start time NOT NULL DEFAULT '13:00',
  ADD COLUMN online_end time NOT NULL DEFAULT '15:00',
  ADD COLUMN home_start time NOT NULL DEFAULT '16:00',
  ADD COLUMN home_end time NOT NULL DEFAULT '17:00',
  ADD CONSTRAINT schedule_service_hours_check CHECK (online_start < online_end AND home_start < home_end);
ALTER TABLE clinzo.schedule_rule
  ADD COLUMN service_mode text NOT NULL DEFAULT 'clinic' CHECK (service_mode IN ('clinic','online','home')),
  ADD COLUMN automatic boolean NOT NULL DEFAULT false,
  ADD COLUMN materialized_through date,
  ADD COLUMN fee_minor integer NOT NULL DEFAULT 0 CHECK (fee_minor BETWEEN 0 AND 100000000);
CREATE UNIQUE INDEX published_service_schedule_uq ON clinzo.schedule_rule(doctor_facility_id,service_mode) WHERE state='published' AND automatic;
ALTER TABLE clinzo.schedule_exception
  ADD COLUMN service_mode text NOT NULL DEFAULT 'all' CHECK (service_mode IN ('all','clinic','online','home'));

CREATE OR REPLACE FUNCTION public.get_my_schedule_preferences(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF NOT clinzo.can_edit_practice_schedule(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Doctor or associated facility administrator required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('practice_id',s.doctor_facility_id,'working_days',s.working_days,
    'clinic_start',s.clinic_start,'clinic_end',s.clinic_end,'online_start',s.online_start,'online_end',s.online_end,'home_start',s.home_start,'home_end',s.home_end,
    'published_modes',(SELECT coalesce(jsonb_agg(r.service_mode),'[]'::jsonb) FROM clinzo.schedule_rule r WHERE r.doctor_facility_id=s.doctor_facility_id AND r.state='published' AND r.automatic),
    'slot_minutes',s.slot_minutes,
    'online_slot_minutes',s.online_slot_minutes,'home_slot_minutes',s.home_slot_minutes,
    'online_daily_limit',s.online_daily_limit,'walkin_daily_limit',s.walkin_daily_limit,
    'online_working_days',s.online_working_days,'home_working_days',s.home_working_days,
    'online_auto_accept',s.online_auto_accept,'online_auto_accept_limit',s.online_auto_accept_limit,
    'home_auto_accept',s.home_auto_accept,'home_auto_accept_limit',s.home_auto_accept_limit,
    'auto_accept',s.auto_accept,'auto_accept_limit',s.auto_accept_limit,'home_visits',s.home_visits,
    'home_radius_km',s.home_radius_km,
    'online_fee_minor',s.online_fee_minor,'clinic_fee_minor',s.clinic_fee_minor,'home_fee_minor',s.home_fee_minor,
    'row_version',s.row_version::text)
    FROM clinzo.doctor_schedule_preferences s WHERE s.doctor_facility_id=p_practice_id);
END $$;

CREATE OR REPLACE FUNCTION public.save_my_schedule_preferences(p_practice_id uuid,p_settings jsonb,p_expected_version bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); days smallint[]; previous clinzo.doctor_schedule_preferences;
  start_time time; end_time time; online_start_time time; online_end_time time; home_start_time time; home_end_time time; duration int; online_duration int; home_duration int;
  online_limit int; walkin_limit int; accept_limit int;
  clinic_fee int; online_fee int; home_fee int; home_radius numeric(6,2); home_enabled boolean;
  online_days smallint[]; home_days smallint[]; online_accept boolean; home_accept boolean; online_accept_limit int; home_accept_limit int;
BEGIN
  IF jsonb_typeof(p_settings) IS DISTINCT FROM 'object' OR jsonb_typeof(p_settings->'working_days') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Schedule settings are required' USING ERRCODE='22023'; END IF;
  IF NOT clinzo.can_edit_practice_schedule(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Doctor or associated facility administrator required' USING ERRCODE='42501'; END IF;
  SELECT array_agg(value::smallint ORDER BY value::smallint) INTO days
    FROM jsonb_array_elements_text(p_settings->'working_days') AS t(value);
  IF cardinality(days) NOT BETWEEN 1 AND 7 OR EXISTS(SELECT 1 FROM unnest(days) x WHERE x NOT BETWEEN 1 AND 7)
    OR cardinality(days)<>(SELECT count(DISTINCT x) FROM unnest(days) x) THEN
    RAISE EXCEPTION 'Choose unique working days' USING ERRCODE='22023'; END IF;
  SELECT * INTO previous FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id FOR UPDATE;
  IF (p_settings ? 'online_working_days' AND jsonb_typeof(p_settings->'online_working_days') IS DISTINCT FROM 'array')
    OR (p_settings ? 'home_working_days' AND jsonb_typeof(p_settings->'home_working_days') IS DISTINCT FROM 'array') THEN
    RAISE EXCEPTION 'Choose service working days' USING ERRCODE='22023'; END IF;
  SELECT array_agg(value::smallint ORDER BY value::smallint) INTO online_days FROM jsonb_array_elements_text(coalesce(p_settings->'online_working_days',to_jsonb(previous.online_working_days),p_settings->'working_days')) t(value);
  SELECT array_agg(value::smallint ORDER BY value::smallint) INTO home_days FROM jsonb_array_elements_text(coalesce(p_settings->'home_working_days',to_jsonb(previous.home_working_days),p_settings->'working_days')) t(value);
  IF online_days IS NULL OR home_days IS NULL OR cardinality(online_days) NOT BETWEEN 1 AND 7 OR cardinality(home_days) NOT BETWEEN 1 AND 7
    OR EXISTS(SELECT 1 FROM unnest(online_days||home_days) x WHERE x NOT BETWEEN 1 AND 7)
    OR cardinality(online_days)<>(SELECT count(DISTINCT x) FROM unnest(online_days) x)
    OR cardinality(home_days)<>(SELECT count(DISTINCT x) FROM unnest(home_days) x) THEN
    RAISE EXCEPTION 'Choose unique service working days' USING ERRCODE='22023'; END IF;
  online_accept:=coalesce((p_settings->>'online_auto_accept')::boolean,previous.online_auto_accept,(p_settings->>'auto_accept')::boolean,false);
  home_accept:=coalesce((p_settings->>'home_auto_accept')::boolean,previous.home_auto_accept,(p_settings->>'auto_accept')::boolean,false);
  online_accept_limit:=coalesce((p_settings->>'online_auto_accept_limit')::int,previous.online_auto_accept_limit,(p_settings->>'auto_accept_limit')::int,0);
  home_accept_limit:=coalesce((p_settings->>'home_auto_accept_limit')::int,previous.home_auto_accept_limit,(p_settings->>'auto_accept_limit')::int,0);
  IF online_accept_limit NOT BETWEEN 0 AND 100 OR home_accept_limit NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid service approval limit' USING ERRCODE='22023'; END IF;
  start_time:=(p_settings->>'clinic_start')::time;
  end_time:=(p_settings->>'clinic_end')::time;
  online_start_time:=coalesce((p_settings->>'online_start')::time,previous.online_start,time '13:00');
  online_end_time:=coalesce((p_settings->>'online_end')::time,previous.online_end,time '15:00');
  home_start_time:=coalesce((p_settings->>'home_start')::time,previous.home_start,time '16:00');
  home_end_time:=coalesce((p_settings->>'home_end')::time,previous.home_end,time '17:00');
  duration:=(p_settings->>'slot_minutes')::int;
  online_duration:=coalesce((p_settings->>'online_slot_minutes')::int,duration);
  home_duration:=coalesce((p_settings->>'home_slot_minutes')::int,60);
  online_limit:=(p_settings->>'online_daily_limit')::int;
  walkin_limit:=(p_settings->>'walkin_daily_limit')::int;
  accept_limit:=(p_settings->>'auto_accept_limit')::int;
  clinic_fee:=(p_settings->>'clinic_fee_minor')::int;
  online_fee:=nullif(p_settings->>'online_fee_minor','')::int;
  home_fee:=nullif(p_settings->>'home_fee_minor','')::int;
  home_radius:=nullif(p_settings->>'home_radius_km','')::numeric(6,2);
  home_enabled:=coalesce((p_settings->>'home_visits')::boolean,false);
  IF start_time IS NULL OR end_time IS NULL OR end_time<=start_time OR online_end_time<=online_start_time OR home_end_time<=home_start_time OR duration NOT BETWEEN 5 AND 120
    OR online_duration NOT BETWEEN 5 AND 120 OR home_duration NOT BETWEEN 30 AND 120
    OR online_limit NOT BETWEEN 0 AND 100 OR walkin_limit NOT BETWEEN 0 AND 100 OR accept_limit NOT BETWEEN 0 AND 100
    OR clinic_fee NOT BETWEEN 0 AND 100000000 OR (online_fee IS NOT NULL AND online_fee NOT BETWEEN 0 AND 100000000)
    OR (home_fee IS NOT NULL AND home_fee NOT BETWEEN 0 AND 100000000)
    OR (home_radius IS NOT NULL AND home_radius <= 0)
    OR (home_enabled AND (home_radius IS NULL OR home_fee IS NULL)) THEN
    RAISE EXCEPTION 'Invalid schedule values or home visit coverage' USING ERRCODE='22023'; END IF;

  IF previous.doctor_facility_id IS NULL THEN
    IF p_expected_version IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='PT409'; END IF;
    INSERT INTO clinzo.doctor_schedule_preferences(doctor_facility_id,working_days,clinic_start,clinic_end,online_start,online_end,home_start,home_end,slot_minutes,
      online_slot_minutes,home_slot_minutes,online_daily_limit,walkin_daily_limit,auto_accept,auto_accept_limit,
      home_visits,home_radius_km,online_fee_minor,clinic_fee_minor,home_fee_minor,online_working_days,home_working_days,online_auto_accept,online_auto_accept_limit,home_auto_accept,home_auto_accept_limit)
      VALUES(p_practice_id,days,start_time,end_time,online_start_time,online_end_time,home_start_time,home_end_time,duration,online_duration,home_duration,online_limit,walkin_limit,
        coalesce((p_settings->>'auto_accept')::boolean,false),accept_limit,home_enabled,home_radius,
        online_fee,clinic_fee,home_fee,online_days,home_days,online_accept,online_accept_limit,home_accept,home_accept_limit);
  ELSE
    IF p_expected_version IS DISTINCT FROM previous.row_version THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='PT409'; END IF;
    UPDATE clinzo.doctor_schedule_preferences SET online_working_days=online_days,home_working_days=home_days,online_auto_accept=online_accept,online_auto_accept_limit=online_accept_limit,home_auto_accept=home_accept,home_auto_accept_limit=home_accept_limit,working_days=days,clinic_start=start_time,clinic_end=end_time,online_start=online_start_time,online_end=online_end_time,home_start=home_start_time,home_end=home_end_time,
      slot_minutes=duration,online_slot_minutes=online_duration,home_slot_minutes=home_duration,
      online_daily_limit=online_limit,walkin_daily_limit=walkin_limit,
      auto_accept=coalesce((p_settings->>'auto_accept')::boolean,false),auto_accept_limit=accept_limit,
      home_visits=home_enabled,home_radius_km=home_radius,online_fee_minor=online_fee,
      clinic_fee_minor=clinic_fee,home_fee_minor=home_fee,row_version=row_version+1,updated_at=now()
      WHERE doctor_facility_id=p_practice_id;
  END IF;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,facility_id,request_id,outcome,metadata)
    SELECT actor,'identity','practice.schedule.updated','doctor_facility',p.id,p.facility_id,gen_random_uuid(),'allowed','{}'::jsonb
    FROM clinzo.doctor_facility p WHERE p.id=p_practice_id;
  RETURN public.get_my_schedule_preferences(p_practice_id);
END $$;

-- These helpers are private. Public mutations authorize before invoking them;
-- the daily scheduler runs as the database owner, without a user JWT.
CREATE FUNCTION clinzo.service_mode_for_session(p_session_id uuid) RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT CASE WHEN ps.code LIKE 'online-%' THEN 'online' WHEN ps.code LIKE 'home-%' THEN 'home' ELSE 'clinic' END
  FROM clinzo.session_service ss JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
  WHERE ss.session_id=p_session_id LIMIT 1;
$$;

CREATE FUNCTION clinzo.insert_generated_schedule_session(p_rule_id uuid,p_start timestamptz,p_end timestamptz) RETURNS integer
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r clinzo.schedule_rule; d clinzo.doctor; sid uuid; service uuid; day_id uuid; existing clinzo.session; slot_start timestamptz; n int;
BEGIN
  SELECT * INTO STRICT r FROM clinzo.schedule_rule WHERE id=p_rule_id AND state='published' AND automatic;
  SELECT d0.* INTO STRICT d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id WHERE p.id=r.doctor_facility_id;
  n:=extract(epoch FROM p_end-p_start)::int/(r.window_minutes*60);
  IF n<1 OR p_start<=now() OR p_end-p_start>interval '8 hours' THEN RAISE EXCEPTION 'Invalid generated time block'; END IF;
  INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone)
    VALUES(d.id,(p_start AT TIME ZONE r.timezone)::date,r.timezone)
    ON CONFLICT(doctor_id,local_date) DO UPDATE SET timezone=excluded.timezone RETURNING id INTO day_id;
  SELECT * INTO existing FROM clinzo.session WHERE doctor_facility_id=r.doctor_facility_id AND starts_at=p_start FOR UPDATE;
  IF existing.id IS NOT NULL THEN
    IF existing.state<>'cancelled' OR EXISTS(SELECT 1 FROM clinzo.appointment WHERE session_id=existing.id) THEN RETURN 0; END IF;
    -- Reuse an empty cancelled block at the same start; booked windows are immutable.
    DELETE FROM clinzo.appointment_window WHERE session_id=existing.id;
    UPDATE clinzo.session SET ends_at=p_end,timezone=r.timezone,hard_capacity=n,auto_confirm_limit=r.auto_confirm_limit,
      state='published',schedule_rule_id=r.id WHERE id=existing.id;
    sid:=existing.id;
    SELECT practice_service_id INTO service FROM clinzo.session_service WHERE session_id=sid LIMIT 1;
    UPDATE clinzo.practice_service SET code=r.service_mode||'-'||sid::text,
      name=CASE r.service_mode WHEN 'online' THEN 'Video consultation' WHEN 'home' THEN 'Home visit' ELSE 'Clinic consultation' END,
      fee_minor=r.fee_minor,currency='INR',duration_minutes=r.window_minutes,active=true WHERE id=service;
  ELSE
    INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,schedule_rule_id,starts_at,ends_at,timezone,hard_capacity,auto_confirm_limit,state)
      VALUES(r.doctor_facility_id,d.id,day_id,r.id,p_start,p_end,r.timezone,n,r.auto_confirm_limit,'published') RETURNING id INTO sid;
    INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
      VALUES(r.doctor_facility_id,r.service_mode||'-'||sid::text,
        CASE r.service_mode WHEN 'online' THEN 'Video consultation' WHEN 'home' THEN 'Home visit' ELSE 'Clinic consultation' END,
        r.fee_minor,'INR',r.window_minutes) RETURNING id INTO service;
    INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(sid,service);
    INSERT INTO clinzo.session_queue(session_id) VALUES(sid);
  END IF;
  slot_start:=p_start;
  WHILE slot_start<p_end LOOP
    INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
      VALUES(sid,slot_start,slot_start+make_interval(mins=>r.window_minutes),1,'open');
    slot_start:=slot_start+make_interval(mins=>r.window_minutes);
  END LOOP;
  RETURN n;
END $$;

CREATE FUNCTION clinzo.materialize_schedule_rule(p_rule_id uuid) RETURNS integer
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r clinzo.schedule_rule; d clinzo.doctor; local_day date; local_clock timestamp;
  candidate timestamptz; candidate_end timestamptz; group_start timestamptz; group_end timestamptz;
  remaining int; created int:=0; available boolean; first_offset int; today date;
BEGIN
  SELECT * INTO r FROM clinzo.schedule_rule WHERE id=p_rule_id AND state='published' AND automatic;
  IF r.id IS NULL THEN RETURN 0; END IF;
  today:=(now() AT TIME ZONE r.timezone)::date;
  first_offset:=greatest(0,coalesce(r.materialized_through-today+1,0));
  IF first_offset>29 THEN RETURN 0; END IF;
  SELECT d0.* INTO d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE p.id=r.doctor_facility_id AND p.active AND d0.active AND d0.credential_status='verified'
      AND f.active AND f.verification_status='verified' AND o.active FOR UPDATE OF d0;
  IF d.id IS NULL THEN RETURN 0; END IF;
  -- Re-read after taking the doctor lock: publication may have retired this
  -- version or another worker may already have extended its horizon.
  SELECT * INTO r FROM clinzo.schedule_rule WHERE id=p_rule_id AND state='published' AND automatic;
  IF r.id IS NULL THEN RETURN 0; END IF;
  first_offset:=greatest(0,coalesce(r.materialized_through-today+1,0));
  IF first_offset>29 THEN RETURN 0; END IF;
  FOR day_offset IN first_offset..29 LOOP
    local_day:=today+day_offset;
    IF local_day<r.effective_from OR (r.effective_until IS NOT NULL AND local_day>r.effective_until)
      OR extract(isodow FROM local_day)::int<>ALL(r.iso_weekdays) THEN CONTINUE; END IF;
    SELECT greatest(0,r.session_capacity-coalesce(sum((SELECT sum(w.hard_capacity) FROM clinzo.appointment_window w
      WHERE w.session_id=s.id AND w.state='open')),0))::int INTO remaining
      FROM clinzo.session s WHERE s.doctor_id=d.id AND s.state IN ('published','open')
        AND (s.starts_at AT TIME ZONE r.timezone)::date=local_day
        AND clinzo.service_mode_for_session(s.id)=r.service_mode;
    group_start:=NULL; group_end:=NULL;
    FOR local_clock IN SELECT generate_series(local_day+r.local_start,
      local_day+r.local_end-make_interval(mins=>r.window_minutes),make_interval(mins=>r.window_minutes)) LOOP
      candidate:=local_clock AT TIME ZONE r.timezone;
      candidate_end:=(local_clock+make_interval(mins=>r.window_minutes)) AT TIME ZONE r.timezone;
      available:=remaining>0 AND candidate>now()
        AND candidate AT TIME ZONE r.timezone=local_clock
        AND candidate_end-candidate=make_interval(mins=>r.window_minutes)
        AND NOT EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_id=d.id AND s.state<>'cancelled'
          AND s.starts_at<candidate_end AND s.ends_at>candidate)
        AND NOT EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_facility_id=r.doctor_facility_id
          AND s.starts_at=candidate AND EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.session_id=s.id))
        AND NOT EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=d.id AND e.state='active'
          AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=r.doctor_facility_id)
          AND e.service_mode IN ('all',r.service_mode) AND e.starts_at<candidate_end AND e.ends_at>candidate);
      IF group_start IS NOT NULL AND (NOT available OR candidate<>group_end OR candidate_end-group_start>interval '8 hours') THEN
        created:=created+clinzo.insert_generated_schedule_session(r.id,group_start,group_end);
        group_start:=NULL; group_end:=NULL;
      END IF;
      IF available THEN
        IF group_start IS NULL THEN group_start:=candidate; END IF;
        group_end:=candidate_end; remaining:=remaining-1;
      END IF;
    END LOOP;
    IF group_start IS NOT NULL THEN created:=created+clinzo.insert_generated_schedule_session(r.id,group_start,group_end); END IF;
  END LOOP;
  UPDATE clinzo.schedule_rule SET materialized_through=today+29 WHERE id=r.id;
  RETURN created;
END $$;

CREATE FUNCTION public.publish_doctor_schedule(p_practice_id uuid,p_mode text,p_settings jsonb,p_expected_version bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor(); d clinzo.doctor; prefs clinzo.doctor_schedule_preferences;
  days smallint[]; start_time time; end_time time; duration int; daily_limit int; fee int;
  old_rule clinzo.schedule_rule; rule_id uuid; family uuid; next_version int; slot_count int:=0; local_day date;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('clinic','online','home') THEN RAISE EXCEPTION 'Choose a service' USING ERRCODE='22023'; END IF;
  IF NOT coalesce(clinzo.can_edit_practice_schedule(actor,p_practice_id),false)
    OR NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN RAISE EXCEPTION 'Verified practice access required' USING ERRCODE='42501'; END IF;
  SELECT d0.* INTO d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE p.id=p_practice_id AND p.active AND d0.active AND d0.credential_status='verified'
      AND f.active AND f.verification_status='verified' AND o.active FOR UPDATE OF d0;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Verified practice access required' USING ERRCODE='42501'; END IF;
  PERFORM public.save_my_schedule_preferences(p_practice_id,p_settings,p_expected_version);
  SELECT * INTO STRICT prefs FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id;
  days:=CASE p_mode WHEN 'online' THEN prefs.online_working_days WHEN 'home' THEN prefs.home_working_days ELSE prefs.working_days END;
  start_time:=CASE p_mode WHEN 'online' THEN prefs.online_start WHEN 'home' THEN prefs.home_start ELSE prefs.clinic_start END;
  end_time:=CASE p_mode WHEN 'online' THEN prefs.online_end WHEN 'home' THEN prefs.home_end ELSE prefs.clinic_end END;
  duration:=CASE p_mode WHEN 'online' THEN prefs.online_slot_minutes WHEN 'home' THEN prefs.home_slot_minutes ELSE prefs.slot_minutes END;
  daily_limit:=CASE p_mode WHEN 'online' THEN prefs.online_daily_limit WHEN 'home' THEN CASE WHEN prefs.home_visits THEN 100 ELSE 0 END ELSE prefs.walkin_daily_limit END;
  fee:=CASE p_mode WHEN 'online' THEN prefs.online_fee_minor WHEN 'home' THEN prefs.home_fee_minor ELSE prefs.clinic_fee_minor END;
  local_day:=(now() AT TIME ZONE d.booking_timezone)::date;
  IF daily_limit>0 AND (fee IS NULL OR extract(epoch FROM end_time-start_time)<duration*60) THEN
    RAISE EXCEPTION 'Set a fee and hours that fit at least one slot' USING ERRCODE='22023'; END IF;
  IF daily_limit>0 AND EXISTS(SELECT 1 FROM clinzo.schedule_rule r JOIN clinzo.doctor_facility p ON p.id=r.doctor_facility_id
    WHERE p.doctor_id=d.id AND r.state='published' AND NOT (r.doctor_facility_id=p_practice_id AND r.service_mode=p_mode)
      AND r.iso_weekdays && days AND r.local_start<end_time AND r.local_end>start_time) THEN
    RAISE EXCEPTION 'These hours overlap another published service or practice. Choose separate hours.' USING ERRCODE='22023'; END IF;
  SELECT * INTO old_rule FROM clinzo.schedule_rule WHERE doctor_facility_id=p_practice_id AND service_mode=p_mode AND state='published' AND automatic FOR UPDATE;
  family:=coalesce(old_rule.family_id,gen_random_uuid()); next_version:=coalesce(old_rule.version,0)+1;
  -- A booking locks its session before checking availability. Match that order
  -- before deciding which empty future blocks can be replaced.
  PERFORM s.id FROM clinzo.session s JOIN clinzo.schedule_rule r ON r.id=s.schedule_rule_id
    WHERE s.doctor_facility_id=p_practice_id AND r.service_mode=p_mode AND r.automatic AND s.starts_at>now()
    ORDER BY s.id FOR UPDATE OF s;
  UPDATE clinzo.appointment_window w SET state='blocked' WHERE w.session_id IN (
    SELECT s.id FROM clinzo.session s JOIN clinzo.schedule_rule r ON r.id=s.schedule_rule_id
    WHERE s.doctor_facility_id=p_practice_id AND r.service_mode=p_mode AND r.automatic AND s.starts_at>now())
    AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.window_id=w.id
      AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR a.status='pending'));
  UPDATE clinzo.session s SET state='cancelled' FROM clinzo.schedule_rule r
    WHERE r.id=s.schedule_rule_id AND s.doctor_facility_id=p_practice_id AND r.service_mode=p_mode AND r.automatic AND s.starts_at>now()
      AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.session_id=s.id);
  UPDATE clinzo.schedule_rule SET state='retired' WHERE id=old_rule.id;
  IF daily_limit>0 THEN
    INSERT INTO clinzo.schedule_rule(doctor_facility_id,version,family_id,effective_from,iso_weekdays,local_start,local_end,
      window_minutes,window_capacity,session_capacity,auto_confirm_limit,timezone,state,service_mode,fee_minor,automatic)
      VALUES(p_practice_id,next_version,family,local_day,days,start_time,end_time,duration,1,daily_limit,
        CASE WHEN prefs.auto_accept THEN prefs.auto_accept_limit ELSE 0 END,d.booking_timezone,'published',p_mode,fee,true) RETURNING id INTO rule_id;
    slot_count:=clinzo.materialize_schedule_rule(rule_id);
  END IF;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,facility_id,request_id,outcome,metadata)
    SELECT actor,'identity','schedule.recurring_published','doctor_facility',p.id,p.facility_id,gen_random_uuid(),'allowed',
      jsonb_build_object('service_mode',p_mode,'slot_count',slot_count,'horizon_days',30) FROM clinzo.doctor_facility p WHERE p.id=p_practice_id;
  RETURN jsonb_build_object('settings',public.get_my_schedule_preferences(p_practice_id),'slot_count',slot_count,'horizon_days',30);
END $$;

CREATE FUNCTION clinzo.refresh_automatic_schedules() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; created int:=0;
BEGIN
  FOR r IN SELECT sr.id FROM clinzo.schedule_rule sr JOIN clinzo.doctor_facility p ON p.id=sr.doctor_facility_id
    WHERE sr.state='published' AND sr.automatic ORDER BY p.doctor_id,sr.id LOOP
    created:=created+clinzo.materialize_schedule_rule(r.id);
  END LOOP;
  RETURN created;
END $$;
REVOKE ALL ON FUNCTION clinzo.service_mode_for_session(uuid),clinzo.insert_generated_schedule_session(uuid,timestamptz,timestamptz),
  clinzo.materialize_schedule_rule(uuid),clinzo.refresh_automatic_schedules() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.publish_doctor_schedule(uuid,text,jsonb,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_doctor_schedule(uuid,text,jsonb,bigint) TO authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('refresh-automatic-doctor-schedules','0 0 * * *','SELECT clinzo.refresh_automatic_schedules()');


CREATE OR REPLACE FUNCTION public.list_clinic_unavailability(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor();
BEGIN
  IF NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(unavailable_row)) FROM (
    SELECT e.id,e.starts_at,e.ends_at,e.reason,e.service_mode,e.state,e.row_version::text AS row_version
    FROM clinzo.schedule_exception e WHERE e.doctor_facility_id=p_practice_id
      AND e.ends_at>now()-interval '7 days' ORDER BY e.starts_at DESC LIMIT 100
  ) unavailable_row),'[]'::jsonb);
END $$;

CREATE FUNCTION public.add_doctor_unavailability(p_practice_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text,p_service_mode text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); v_doctor_id uuid; exception_id uuid; old_id uuid;
BEGIN
  IF p_service_mode IS NULL OR p_service_mode NOT IN ('all','clinic','online','home') OR p_starts_at IS NULL OR p_ends_at IS NULL OR p_starts_at<=now() OR p_ends_at<=p_starts_at
    OR p_ends_at>p_starts_at+interval '30 days' OR p_starts_at>now()+interval '1 year'
    OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 2 AND 500 THEN
    RAISE EXCEPTION 'Invalid unavailable dates or reason' USING ERRCODE='22023'; END IF;
  SELECT p.doctor_id INTO v_doctor_id FROM clinzo.doctor_facility p WHERE p.id=p_practice_id AND p.active;
  IF v_doctor_id IS NULL OR NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  -- Booking locks its session first. Lock all affected sessions in a stable order
  -- so a concurrent booking cannot pass the availability check during leave setup.
  PERFORM s.id FROM clinzo.session s WHERE s.doctor_facility_id=p_practice_id
    AND s.starts_at<p_ends_at AND s.ends_at>p_starts_at AND (p_service_mode='all' OR clinzo.service_mode_for_session(s.id)=p_service_mode) ORDER BY s.id FOR UPDATE OF s;
  IF EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.appointment_window w ON w.id=a.window_id
    JOIN clinzo.session s ON s.id=a.session_id WHERE s.doctor_facility_id=p_practice_id
      AND w.starts_at<p_ends_at AND w.ends_at>p_starts_at
      AND (p_service_mode='all' OR clinzo.service_mode_for_session(s.id)=p_service_mode) AND a.status IN ('confirmed','in_consultation')) THEN
    RAISE EXCEPTION 'Resolve confirmed appointments before adding unavailability' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=v_doctor_id AND e.state='active'
    AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p_practice_id)
    AND (p_service_mode='all' OR e.service_mode IN ('all',p_service_mode)) AND e.starts_at<p_ends_at AND e.ends_at>p_starts_at) THEN
    RAISE EXCEPTION 'An overlapping unavailable period already exists' USING ERRCODE='23505'; END IF;
  INSERT INTO clinzo.schedule_exception(doctor_id,doctor_facility_id,starts_at,ends_at,reason,state,service_mode)
    VALUES(v_doctor_id,p_practice_id,p_starts_at,p_ends_at,trim(p_reason),'active',p_service_mode) RETURNING id INTO exception_id;
  FOR old_id IN UPDATE clinzo.appointment a SET status='rejected',decision_by=actor,
    decision_reason='Doctor unavailable: '||trim(p_reason)
    WHERE a.status='pending' AND EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
      WHERE w.id=a.window_id AND s.doctor_facility_id=p_practice_id AND w.starts_at<p_ends_at AND w.ends_at>p_starts_at AND (p_service_mode='all' OR clinzo.service_mode_for_session(s.id)=p_service_mode))
    RETURNING a.id LOOP
    PERFORM clinzo.appointment_event(old_id,actor,'rejected_unavailable');
  END LOOP;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','schedule.unavailability_added','schedule_exception',exception_id,gen_random_uuid(),'allowed','{}');
  RETURN exception_id;
END $$;


CREATE OR REPLACE FUNCTION public.add_clinic_unavailability(p_practice_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT public.add_doctor_unavailability(p_practice_id,p_starts_at,p_ends_at,p_reason,'all');
$$;
REVOKE ALL ON FUNCTION public.add_doctor_unavailability(uuid,timestamptz,timestamptz,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_doctor_unavailability(uuid,timestamptz,timestamptz,text,text) TO authenticated;

-- Extend the existing booking/discovery checks without changing their capacity,
-- authorization, idempotency or shared auto-confirm rules.
DO $$
DECLARE fn regprocedure; definition text; updated text;
BEGIN
  FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('list_clinic_slots','list_practice_clinic_slots','book_clinic_appointment','transition_clinic_appointment') LOOP
    definition:=pg_get_functiondef(fn);
    updated:=replace(definition,'e.ends_at>w.starts_at',
      'e.ends_at>w.starts_at AND (e.service_mode=''all'' OR e.service_mode=clinzo.service_mode_for_session(s.id))');
    IF updated=definition THEN RAISE EXCEPTION 'Unavailable time predicate missing in %',fn; END IF;
    EXECUTE updated;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.list_my_clinic_sessions(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor();
BEGIN
  IF NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(session_row)) FROM (
    SELECT s.id,s.starts_at,s.ends_at,s.timezone,s.hard_capacity,s.auto_confirm_limit,
      s.state,s.row_version::text AS row_version,
      CASE WHEN ps.code LIKE 'online-%' THEN 'online'
           WHEN ps.code LIKE 'home-%' THEN 'home' ELSE 'clinic' END AS service_mode
    FROM clinzo.session s
    JOIN clinzo.session_service ss ON ss.session_id=s.id
    JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
    WHERE s.doctor_facility_id=p_practice_id AND s.ends_at>now()-interval '7 days' AND s.state<>'cancelled'
    ORDER BY s.starts_at ASC LIMIT 300
  ) session_row),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.revoke_clinic_unavailability(p_exception_id uuid,p_expected_version bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); e clinzo.schedule_exception; rule_id uuid;
BEGIN
  SELECT * INTO e FROM clinzo.schedule_exception WHERE id=p_exception_id FOR UPDATE;
  IF e.id IS NULL OR e.doctor_facility_id IS NULL OR NOT clinzo.can_manage_practice(actor,e.doctor_facility_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  IF p_expected_version IS NULL OR e.row_version<>p_expected_version THEN
    RAISE EXCEPTION 'Unavailable period changed; refresh and retry' USING ERRCODE='PT409'; END IF;
  IF e.state<>'active' OR e.ends_at<=now() THEN
    RAISE EXCEPTION 'Only active future unavailability can be revoked' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM clinzo.doctor WHERE id=e.doctor_id FOR UPDATE;
  UPDATE clinzo.schedule_exception SET state='revoked' WHERE id=e.id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','schedule.unavailability_revoked','schedule_exception',e.id,gen_random_uuid(),'allowed','{}');
  FOR rule_id IN SELECT r.id FROM clinzo.schedule_rule r WHERE r.doctor_facility_id=e.doctor_facility_id AND r.state='published' AND r.automatic
    AND (e.service_mode='all' OR r.service_mode=e.service_mode) LOOP
    UPDATE clinzo.schedule_rule SET materialized_through=NULL WHERE id=rule_id;
    PERFORM clinzo.materialize_schedule_rule(rule_id);
  END LOOP;
  RETURN e.id;
END $$;

