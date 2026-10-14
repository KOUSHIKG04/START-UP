-- Preserve existing service behavior, then allow independent edits.
ALTER TABLE clinzo.doctor_schedule_preferences
  ADD COLUMN online_working_days smallint[], ADD COLUMN home_working_days smallint[],
  ADD COLUMN online_auto_accept boolean, ADD COLUMN online_auto_accept_limit smallint,
  ADD COLUMN home_auto_accept boolean, ADD COLUMN home_auto_accept_limit smallint;
UPDATE clinzo.doctor_schedule_preferences SET online_working_days=working_days,home_working_days=working_days,
  online_auto_accept=auto_accept,home_auto_accept=auto_accept,online_auto_accept_limit=auto_accept_limit,home_auto_accept_limit=auto_accept_limit;
ALTER TABLE clinzo.doctor_schedule_preferences
  ALTER COLUMN online_working_days SET NOT NULL, ALTER COLUMN online_working_days SET DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  ALTER COLUMN home_working_days SET NOT NULL, ALTER COLUMN home_working_days SET DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  ALTER COLUMN online_auto_accept SET NOT NULL, ALTER COLUMN online_auto_accept SET DEFAULT false,
  ALTER COLUMN home_auto_accept SET NOT NULL, ALTER COLUMN home_auto_accept SET DEFAULT false,
  ALTER COLUMN online_auto_accept_limit SET NOT NULL, ALTER COLUMN online_auto_accept_limit SET DEFAULT 0,
  ALTER COLUMN home_auto_accept_limit SET NOT NULL, ALTER COLUMN home_auto_accept_limit SET DEFAULT 0,
  ADD CONSTRAINT schedule_service_days_check CHECK(cardinality(online_working_days) BETWEEN 1 AND 7 AND cardinality(home_working_days) BETWEEN 1 AND 7 AND online_working_days <@ ARRAY[1,2,3,4,5,6,7]::smallint[] AND home_working_days <@ ARRAY[1,2,3,4,5,6,7]::smallint[]),
  ADD CONSTRAINT schedule_service_approval_limits_check CHECK(online_auto_accept_limit BETWEEN 0 AND 100 AND home_auto_accept_limit BETWEEN 0 AND 100);

CREATE OR REPLACE FUNCTION public.get_my_schedule_preferences(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF NOT clinzo.can_edit_practice_schedule(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Doctor or associated facility administrator required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('practice_id',s.doctor_facility_id,'working_days',s.working_days,
    'clinic_start',s.clinic_start,'clinic_end',s.clinic_end,'slot_minutes',s.slot_minutes,
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
  start_time time; end_time time; duration int; online_duration int; home_duration int;
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
  IF start_time IS NULL OR end_time IS NULL OR end_time<=start_time OR duration NOT BETWEEN 5 AND 120
    OR online_duration NOT BETWEEN 5 AND 120 OR home_duration NOT BETWEEN 30 AND 120
    OR online_limit NOT BETWEEN 0 AND 100 OR walkin_limit NOT BETWEEN 0 AND 100 OR accept_limit NOT BETWEEN 0 AND 100
    OR clinic_fee NOT BETWEEN 0 AND 100000000 OR (online_fee IS NOT NULL AND online_fee NOT BETWEEN 0 AND 100000000)
    OR (home_fee IS NOT NULL AND home_fee NOT BETWEEN 0 AND 100000000)
    OR (home_radius IS NOT NULL AND home_radius <= 0)
    OR (home_enabled AND (home_radius IS NULL OR home_fee IS NULL)) THEN
    RAISE EXCEPTION 'Invalid schedule values or home visit coverage' USING ERRCODE='22023'; END IF;

  IF previous.doctor_facility_id IS NULL THEN
    IF p_expected_version IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='PT409'; END IF;
    INSERT INTO clinzo.doctor_schedule_preferences(doctor_facility_id,working_days,clinic_start,clinic_end,slot_minutes,
      online_slot_minutes,home_slot_minutes,online_daily_limit,walkin_daily_limit,auto_accept,auto_accept_limit,
      home_visits,home_radius_km,online_fee_minor,clinic_fee_minor,home_fee_minor,online_working_days,home_working_days,online_auto_accept,online_auto_accept_limit,home_auto_accept,home_auto_accept_limit)
      VALUES(p_practice_id,days,start_time,end_time,duration,online_duration,home_duration,online_limit,walkin_limit,
        coalesce((p_settings->>'auto_accept')::boolean,false),accept_limit,home_enabled,home_radius,
        online_fee,clinic_fee,home_fee,online_days,home_days,online_accept,online_accept_limit,home_accept,home_accept_limit);
  ELSE
    IF p_expected_version IS DISTINCT FROM previous.row_version THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='PT409'; END IF;
    UPDATE clinzo.doctor_schedule_preferences SET online_working_days=online_days,home_working_days=home_days,online_auto_accept=online_accept,online_auto_accept_limit=online_accept_limit,home_auto_accept=home_accept,home_auto_accept_limit=home_accept_limit,working_days=days,clinic_start=start_time,clinic_end=end_time,
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

CREATE OR REPLACE FUNCTION public.publish_doctor_service_session(
  p_practice_id uuid, p_mode text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_slot_minutes integer, p_fee_minor bigint,
  p_currency text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := clinzo.require_care_actor();
  doctor_row clinzo.doctor;
  settings clinzo.doctor_schedule_preferences;
  existing_count integer;
  slot_count integer;
  service_id uuid;
  published_session_id uuid;
  local_day date;
  weekday integer;
BEGIN
  IF p_mode NOT IN ('clinic','online','home') OR p_starts_at IS NULL OR p_ends_at IS NULL
    OR p_slot_minutes IS NULL OR p_slot_minutes NOT BETWEEN 5 AND 120 OR p_ends_at <= p_starts_at
    OR extract(epoch FROM p_ends_at-p_starts_at)::bigint % (p_slot_minutes*60) <> 0 THEN
    RAISE EXCEPTION 'Invalid service time block' USING ERRCODE='22023';
  END IF;
  SELECT d.* INTO doctor_row FROM clinzo.doctor_facility df
    JOIN clinzo.doctor d ON d.id=df.doctor_id WHERE df.id=p_practice_id FOR UPDATE OF d;
  IF doctor_row.id IS NULL OR NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO settings FROM clinzo.doctor_schedule_preferences
    WHERE doctor_facility_id=p_practice_id;
  IF settings.doctor_facility_id IS NULL THEN
    RAISE EXCEPTION 'Save schedule preferences before publishing' USING ERRCODE='22023';
  END IF;
  local_day := (p_starts_at AT TIME ZONE doctor_row.booking_timezone)::date;
  weekday := extract(isodow FROM local_day)::integer;
  IF weekday <> ALL(CASE p_mode WHEN 'online' THEN settings.online_working_days WHEN 'home' THEN settings.home_working_days ELSE settings.working_days END)
    OR ((p_ends_at AT TIME ZONE doctor_row.booking_timezone)::date <> local_day
      AND (p_ends_at AT TIME ZONE doctor_row.booking_timezone) <> ((local_day + 1)::timestamp))
    OR (p_mode='clinic' AND p_slot_minutes <> settings.slot_minutes)
    OR (p_mode='online' AND p_slot_minutes <> settings.online_slot_minutes)
    OR (p_mode='home' AND p_slot_minutes <> settings.home_slot_minutes) THEN
    RAISE EXCEPTION 'Choose a working day and the saved duration for this service' USING ERRCODE='22023';
  END IF;
  IF p_mode='home' AND (NOT settings.home_visits OR settings.home_radius_km IS NULL) THEN
    RAISE EXCEPTION 'Enable home visits and set a travel radius first' USING ERRCODE='22023';
  END IF;
  slot_count := extract(epoch FROM p_ends_at-p_starts_at)::integer/(p_slot_minutes*60);
  SELECT coalesce(sum(s.hard_capacity),0)::integer INTO existing_count
    FROM clinzo.session s
    JOIN clinzo.session_service ss ON ss.session_id=s.id
    JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
    WHERE s.doctor_id=doctor_row.id AND s.state IN ('published','open')
      AND (s.starts_at AT TIME ZONE doctor_row.booking_timezone)::date=local_day
      AND (CASE WHEN ps.code LIKE 'online-%' THEN 'online'
                WHEN ps.code LIKE 'home-%' THEN 'home' ELSE 'clinic' END)=p_mode;
  IF (p_mode='online' AND existing_count+slot_count>settings.online_daily_limit)
    OR (p_mode='clinic' AND existing_count+slot_count>settings.walkin_daily_limit)
    OR (p_mode='home' AND slot_count>100) THEN
    RAISE EXCEPTION 'Daily slot limit exceeded' USING ERRCODE='22023';
  END IF;
  published_session_id := public.publish_clinic_session(p_practice_id,p_starts_at,p_ends_at,p_slot_minutes,p_fee_minor,p_currency);
  IF p_mode <> 'clinic' THEN
    SELECT ss.practice_service_id INTO service_id FROM clinzo.session_service ss
      WHERE ss.session_id=published_session_id;
    UPDATE clinzo.practice_service SET code=p_mode||'-'||published_session_id::text,
      name=CASE p_mode WHEN 'online' THEN 'Video consultation' ELSE 'Home visit' END
      WHERE id=service_id;
  END IF;
  RETURN published_session_id;
END $$;


CREATE OR REPLACE FUNCTION public.publish_selected_doctor_slots(
  p_practice_id uuid, p_mode text, p_slot_starts timestamptz[],
  p_slot_minutes integer, p_fee_minor bigint, p_currency text
) RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  ordered_starts timestamptz[];
  published_ids uuid[] := '{}'::uuid[];
  group_start timestamptz;
  previous_start timestamptz;
  slot_start timestamptz;
  settings clinzo.doctor_schedule_preferences; zone text; local_day date;
  accept_enabled boolean; remaining int; already_allocated int; created record;
BEGIN
  IF p_slot_starts IS NULL OR cardinality(p_slot_starts) NOT BETWEEN 1 AND 100
    OR p_slot_minutes IS NULL OR p_slot_minutes NOT BETWEEN 5 AND 120
    OR array_position(p_slot_starts,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Choose between 1 and 100 valid slots' USING ERRCODE='22023';
  END IF;

  SELECT array_agg(candidate ORDER BY candidate) INTO ordered_starts
    FROM unnest(p_slot_starts) AS slots(candidate);
  group_start := ordered_starts[1];
  previous_start := group_start;

  FOR slot_index IN 2..cardinality(ordered_starts) LOOP
    slot_start := ordered_starts[slot_index];
    IF slot_start <= previous_start THEN
      RAISE EXCEPTION 'Selected slots must be unique' USING ERRCODE='22023';
    END IF;
    IF slot_start < previous_start + make_interval(mins => p_slot_minutes) THEN
      RAISE EXCEPTION 'Selected slots cannot overlap' USING ERRCODE='22023';
    END IF;
    IF slot_start > previous_start + make_interval(mins => p_slot_minutes)
      OR slot_start + make_interval(mins => p_slot_minutes) > group_start + interval '8 hours' THEN
      published_ids := array_append(published_ids,
        public.publish_doctor_service_session(p_practice_id,p_mode,group_start,
          previous_start + make_interval(mins => p_slot_minutes),
          p_slot_minutes,p_fee_minor,p_currency));
      group_start := slot_start;
    END IF;
    previous_start := slot_start;
  END LOOP;

  published_ids := array_append(published_ids,
    public.publish_doctor_service_session(p_practice_id,p_mode,group_start,
      previous_start + make_interval(mins => p_slot_minutes),
      p_slot_minutes,p_fee_minor,p_currency));
  SELECT * INTO settings FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id;
  SELECT d.booking_timezone INTO zone FROM clinzo.doctor d JOIN clinzo.doctor_facility p ON p.doctor_id=d.id WHERE p.id=p_practice_id;
  local_day := (ordered_starts[1] AT TIME ZONE zone)::date;
  accept_enabled := CASE p_mode WHEN 'online' THEN settings.online_auto_accept WHEN 'home' THEN settings.home_auto_accept ELSE settings.auto_accept END;
  remaining := CASE p_mode WHEN 'online' THEN settings.online_auto_accept_limit WHEN 'home' THEN settings.home_auto_accept_limit ELSE settings.auto_accept_limit END;
  SELECT coalesce(sum(s.auto_confirm_limit),0)::int INTO already_allocated
    FROM clinzo.session s JOIN clinzo.session_service ss ON ss.session_id=s.id JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
    WHERE s.doctor_facility_id=p_practice_id AND s.state<>'cancelled' AND (s.starts_at AT TIME ZONE zone)::date=local_day
      AND (CASE WHEN ps.code LIKE 'online-%' THEN 'online' WHEN ps.code LIKE 'home-%' THEN 'home' ELSE 'clinic' END)=p_mode;
  remaining := greatest(0,remaining-already_allocated);
  FOR created IN SELECT id,row_version,hard_capacity FROM clinzo.session WHERE id=ANY(published_ids) AND auto_confirm_limit IS NULL ORDER BY starts_at LOOP
    PERFORM public.set_clinic_auto_confirm_limit(created.id,created.row_version,CASE WHEN accept_enabled THEN least(remaining,created.hard_capacity) ELSE 0 END);
    remaining := greatest(0,remaining-created.hard_capacity);
  END LOOP;
  RETURN published_ids;
END $$;
