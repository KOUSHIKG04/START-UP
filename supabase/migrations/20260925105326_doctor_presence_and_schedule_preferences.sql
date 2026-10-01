-- Doctor presence is a deliberate clinic check-in indicator. It does not
-- authorize booking, mark a consultation complete, or imply an online shift.
CREATE TABLE clinzo.doctor_presence (
  doctor_id uuid PRIMARY KEY REFERENCES clinzo.doctor(id) ON DELETE RESTRICT,
  present boolean NOT NULL DEFAULT false,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clinzo.doctor_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.doctor_presence FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.get_my_doctor_presence() RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT p.present FROM clinzo.doctor d LEFT JOIN clinzo.doctor_presence p ON p.doctor_id=d.id
    WHERE d.identity_id=actor AND d.active),false);
END $$;

CREATE FUNCTION public.set_my_doctor_presence(p_present boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); did uuid;
BEGIN
  IF p_present IS NULL THEN RAISE EXCEPTION 'Presence is required' USING ERRCODE='22023'; END IF;
  SELECT id INTO did FROM clinzo.doctor WHERE identity_id=actor AND active AND credential_status='verified' FOR UPDATE;
  IF did IS NULL THEN RAISE EXCEPTION 'Verified doctor account required' USING ERRCODE='42501'; END IF;
  INSERT INTO clinzo.doctor_presence(doctor_id,present,changed_at) VALUES(did,p_present,now())
    ON CONFLICT(doctor_id) DO UPDATE SET present=excluded.present,changed_at=excluded.changed_at;
  RETURN p_present;
END $$;

-- Preferences preserve the designed schedule controls per doctor/facility.
-- They are not a booking schedule until sessions are explicitly published.
CREATE TABLE clinzo.doctor_schedule_preferences (
  doctor_facility_id uuid PRIMARY KEY REFERENCES clinzo.doctor_facility(id) ON DELETE RESTRICT,
  working_days smallint[] NOT NULL,
  clinic_start time NOT NULL,
  clinic_end time NOT NULL,
  slot_minutes smallint NOT NULL,
  online_daily_limit smallint NOT NULL,
  walkin_daily_limit smallint NOT NULL,
  auto_accept boolean NOT NULL DEFAULT false,
  auto_accept_limit smallint NOT NULL DEFAULT 0,
  home_visits boolean NOT NULL DEFAULT false,
  online_fee_minor integer,
  clinic_fee_minor integer NOT NULL,
  home_fee_minor integer,
  row_version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_schedule_days_ck CHECK(array_length(working_days,1) BETWEEN 1 AND 7 AND working_days <@ ARRAY[1,2,3,4,5,6,7]::smallint[]),
  CONSTRAINT doctor_schedule_time_ck CHECK(clinic_end>clinic_start),
  CONSTRAINT doctor_schedule_minutes_ck CHECK(slot_minutes BETWEEN 5 AND 120),
  CONSTRAINT doctor_schedule_limits_ck CHECK(online_daily_limit BETWEEN 0 AND 100 AND walkin_daily_limit BETWEEN 0 AND 100 AND auto_accept_limit BETWEEN 0 AND 100),
  CONSTRAINT doctor_schedule_fees_ck CHECK(clinic_fee_minor BETWEEN 0 AND 100000000 AND (online_fee_minor IS NULL OR online_fee_minor BETWEEN 0 AND 100000000) AND (home_fee_minor IS NULL OR home_fee_minor BETWEEN 0 AND 100000000)),
  CONSTRAINT doctor_schedule_version_ck CHECK(row_version>0)
);
ALTER TABLE clinzo.doctor_schedule_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.doctor_schedule_preferences FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.get_my_schedule_preferences(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility p JOIN clinzo.doctor d ON d.id=p.doctor_id
    WHERE p.id=p_practice_id AND d.identity_id=actor AND d.active) THEN
    RAISE EXCEPTION 'Own practice required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT jsonb_build_object('practice_id',s.doctor_facility_id,'working_days',s.working_days,
    'clinic_start',s.clinic_start,'clinic_end',s.clinic_end,'slot_minutes',s.slot_minutes,
    'online_daily_limit',s.online_daily_limit,'walkin_daily_limit',s.walkin_daily_limit,
    'auto_accept',s.auto_accept,'auto_accept_limit',s.auto_accept_limit,'home_visits',s.home_visits,
    'online_fee_minor',s.online_fee_minor,'clinic_fee_minor',s.clinic_fee_minor,'home_fee_minor',s.home_fee_minor,
    'row_version',s.row_version::text)
    FROM clinzo.doctor_schedule_preferences s WHERE s.doctor_facility_id=p_practice_id);
END $$;

CREATE FUNCTION public.save_my_schedule_preferences(p_practice_id uuid,p_settings jsonb,p_expected_version bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); days smallint[]; previous clinzo.doctor_schedule_preferences;
  start_time time; end_time time; duration int; online_limit int; walkin_limit int; accept_limit int;
  clinic_fee int; online_fee int; home_fee int;
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
  online_limit:=(p_settings->>'online_daily_limit')::int;
  walkin_limit:=(p_settings->>'walkin_daily_limit')::int;
  accept_limit:=(p_settings->>'auto_accept_limit')::int;
  clinic_fee:=(p_settings->>'clinic_fee_minor')::int;
  online_fee:=nullif(p_settings->>'online_fee_minor','')::int;
  home_fee:=nullif(p_settings->>'home_fee_minor','')::int;
  IF start_time IS NULL OR end_time IS NULL OR end_time<=start_time OR duration NOT BETWEEN 5 AND 120
    OR online_limit NOT BETWEEN 0 AND 100 OR walkin_limit NOT BETWEEN 0 AND 100 OR accept_limit NOT BETWEEN 0 AND 100
    OR clinic_fee NOT BETWEEN 0 AND 100000000 OR (online_fee IS NOT NULL AND online_fee NOT BETWEEN 0 AND 100000000)
    OR (home_fee IS NOT NULL AND home_fee NOT BETWEEN 0 AND 100000000) THEN
    RAISE EXCEPTION 'Invalid schedule values' USING ERRCODE='22023'; END IF;
  SELECT * INTO previous FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id FOR UPDATE;
  IF previous.doctor_facility_id IS NULL THEN
    IF p_expected_version IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='40001'; END IF;
    INSERT INTO clinzo.doctor_schedule_preferences(doctor_facility_id,working_days,clinic_start,clinic_end,slot_minutes,
      online_daily_limit,walkin_daily_limit,auto_accept,auto_accept_limit,home_visits,online_fee_minor,clinic_fee_minor,home_fee_minor)
      VALUES(p_practice_id,days,start_time,end_time,duration,online_limit,walkin_limit,
        coalesce((p_settings->>'auto_accept')::boolean,false),accept_limit,coalesce((p_settings->>'home_visits')::boolean,false),
        online_fee,clinic_fee,home_fee);
  ELSE
    IF p_expected_version IS DISTINCT FROM previous.row_version THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='40001'; END IF;
    UPDATE clinzo.doctor_schedule_preferences SET working_days=days,clinic_start=start_time,clinic_end=end_time,
      slot_minutes=duration,online_daily_limit=online_limit,walkin_daily_limit=walkin_limit,
      auto_accept=coalesce((p_settings->>'auto_accept')::boolean,false),auto_accept_limit=accept_limit,
      home_visits=coalesce((p_settings->>'home_visits')::boolean,false),online_fee_minor=online_fee,
      clinic_fee_minor=clinic_fee,home_fee_minor=home_fee,row_version=row_version+1,updated_at=now()
      WHERE doctor_facility_id=p_practice_id;
  END IF;
  RETURN public.get_my_schedule_preferences(p_practice_id);
END $$;

REVOKE ALL ON FUNCTION public.get_my_doctor_presence(),public.set_my_doctor_presence(boolean),
  public.get_my_schedule_preferences(uuid),public.save_my_schedule_preferences(uuid,jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_doctor_presence(),public.set_my_doctor_presence(boolean),
  public.get_my_schedule_preferences(uuid),public.save_my_schedule_preferences(uuid,jsonb,bigint) TO authenticated;
