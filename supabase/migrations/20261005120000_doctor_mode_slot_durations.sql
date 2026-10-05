-- A doctor sets the consultation length for each service independently.
-- Existing online schedules keep their previous duration; home visits default
-- to one hour. Previously published sessions retain their historical windows.
ALTER TABLE clinzo.doctor_schedule_preferences
  ADD COLUMN online_slot_minutes smallint,
  ADD COLUMN home_slot_minutes smallint;
UPDATE clinzo.doctor_schedule_preferences
  SET online_slot_minutes = slot_minutes, home_slot_minutes = 60;
ALTER TABLE clinzo.doctor_schedule_preferences
  ALTER COLUMN online_slot_minutes SET NOT NULL,
  ALTER COLUMN home_slot_minutes SET NOT NULL,
  ALTER COLUMN online_slot_minutes SET DEFAULT 15,
  ALTER COLUMN home_slot_minutes SET DEFAULT 60,
  ADD CONSTRAINT doctor_schedule_online_minutes_ck CHECK (online_slot_minutes BETWEEN 5 AND 120),
  ADD CONSTRAINT doctor_schedule_home_minutes_ck CHECK (home_slot_minutes BETWEEN 30 AND 120);

CREATE OR REPLACE FUNCTION public.get_my_schedule_preferences(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility p JOIN clinzo.doctor d ON d.id=p.doctor_id
    WHERE p.id=p_practice_id AND d.identity_id=actor AND d.active) THEN
    RAISE EXCEPTION 'Own practice required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('practice_id',s.doctor_facility_id,'working_days',s.working_days,
    'clinic_start',s.clinic_start,'clinic_end',s.clinic_end,'slot_minutes',s.slot_minutes,
    'online_slot_minutes',s.online_slot_minutes,'home_slot_minutes',s.home_slot_minutes,
    'online_daily_limit',s.online_daily_limit,'walkin_daily_limit',s.walkin_daily_limit,
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
BEGIN
  IF jsonb_typeof(p_settings) IS DISTINCT FROM 'object' OR jsonb_typeof(p_settings->'working_days') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Schedule settings are required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility p JOIN clinzo.doctor d ON d.id=p.doctor_id
    WHERE p.id=p_practice_id AND d.identity_id=actor AND d.active AND d.credential_status<>'suspended') THEN
    RAISE EXCEPTION 'Own practice required' USING ERRCODE='42501'; END IF;
  SELECT array_agg(value::smallint ORDER BY value::smallint) INTO days
    FROM jsonb_array_elements_text(p_settings->'working_days') AS t(value);
  IF cardinality(days) NOT BETWEEN 1 AND 7 OR EXISTS(SELECT 1 FROM unnest(days) x WHERE x NOT BETWEEN 1 AND 7)
    OR cardinality(days)<>(SELECT count(DISTINCT x) FROM unnest(days) x) THEN
    RAISE EXCEPTION 'Choose unique working days' USING ERRCODE='22023'; END IF;
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
  SELECT * INTO previous FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id FOR UPDATE;
  IF previous.doctor_facility_id IS NULL THEN
    IF p_expected_version IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='40001'; END IF;
    INSERT INTO clinzo.doctor_schedule_preferences(doctor_facility_id,working_days,clinic_start,clinic_end,slot_minutes,
      online_slot_minutes,home_slot_minutes,online_daily_limit,walkin_daily_limit,auto_accept,auto_accept_limit,
      home_visits,home_radius_km,online_fee_minor,clinic_fee_minor,home_fee_minor)
      VALUES(p_practice_id,days,start_time,end_time,duration,online_duration,home_duration,online_limit,walkin_limit,
        coalesce((p_settings->>'auto_accept')::boolean,false),accept_limit,home_enabled,home_radius,
        online_fee,clinic_fee,home_fee);
  ELSE
    IF p_expected_version IS DISTINCT FROM previous.row_version THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='40001'; END IF;
    UPDATE clinzo.doctor_schedule_preferences SET working_days=days,clinic_start=start_time,clinic_end=end_time,
      slot_minutes=duration,online_slot_minutes=online_duration,home_slot_minutes=home_duration,
      online_daily_limit=online_limit,walkin_daily_limit=walkin_limit,
      auto_accept=coalesce((p_settings->>'auto_accept')::boolean,false),auto_accept_limit=accept_limit,
      home_visits=home_enabled,home_radius_km=home_radius,online_fee_minor=online_fee,
      clinic_fee_minor=clinic_fee,home_fee_minor=home_fee,row_version=row_version+1,updated_at=now()
      WHERE doctor_facility_id=p_practice_id;
  END IF;
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
  IF weekday <> ALL(settings.working_days)
    OR (p_ends_at AT TIME ZONE doctor_row.booking_timezone)::date <> local_day
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
