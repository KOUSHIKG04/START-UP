-- Cross-app schedule/version conflicts must return once, without PostgREST 14 retries.
CREATE OR REPLACE FUNCTION public.save_my_schedule_preferences(p_practice_id uuid,p_settings jsonb,p_expected_version bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); days smallint[]; previous clinzo.doctor_schedule_preferences;
  start_time time; end_time time; duration int; online_duration int; home_duration int;
  online_limit int; walkin_limit int; accept_limit int;
  clinic_fee int; online_fee int; home_fee int; home_radius numeric(6,2); home_enabled boolean;
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
    IF p_expected_version IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='PT409'; END IF;
    INSERT INTO clinzo.doctor_schedule_preferences(doctor_facility_id,working_days,clinic_start,clinic_end,slot_minutes,
      online_slot_minutes,home_slot_minutes,online_daily_limit,walkin_daily_limit,auto_accept,auto_accept_limit,
      home_visits,home_radius_km,online_fee_minor,clinic_fee_minor,home_fee_minor)
      VALUES(p_practice_id,days,start_time,end_time,duration,online_duration,home_duration,online_limit,walkin_limit,
        coalesce((p_settings->>'auto_accept')::boolean,false),accept_limit,home_enabled,home_radius,
        online_fee,clinic_fee,home_fee);
  ELSE
    IF p_expected_version IS DISTINCT FROM previous.row_version THEN RAISE EXCEPTION 'Schedule changed; refresh' USING ERRCODE='PT409'; END IF;
    UPDATE clinzo.doctor_schedule_preferences SET working_days=days,clinic_start=start_time,clinic_end=end_time,
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

CREATE OR REPLACE FUNCTION public.set_clinic_auto_confirm_limit(p_session_id uuid,p_expected_version bigint,p_limit integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); s clinzo.session;
BEGIN
  SELECT * INTO s FROM clinzo.session WHERE id=p_session_id FOR UPDATE;
  IF s.id IS NULL OR NOT clinzo.can_manage_practice(actor,s.doctor_facility_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  IF p_expected_version IS NULL OR s.row_version<>p_expected_version THEN
    RAISE EXCEPTION 'Session changed; refresh and retry' USING ERRCODE='PT409'; END IF;
  IF p_limit IS NULL OR p_limit < 0 OR p_limit > s.hard_capacity OR s.ends_at<=now()
    OR s.state NOT IN ('published','open') THEN
    RAISE EXCEPTION 'Invalid auto-confirm limit' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.session SET auto_confirm_limit=p_limit WHERE id=s.id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','session.auto_confirm_limit_updated','session',s.id,gen_random_uuid(),'allowed',jsonb_build_object('limit',p_limit));
  RETURN s.id;
END $$;
