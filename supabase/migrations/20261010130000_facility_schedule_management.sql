-- Facility owners/admins manage only accepted practices in their verified facility.
-- Doctor access, schedule validation and optimistic row versions remain intact.
CREATE FUNCTION clinzo.can_edit_practice_schedule(actor uuid, practice uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinzo.doctor_facility p JOIN clinzo.doctor d ON d.id = p.doctor_id
      JOIN clinzo.facility f ON f.id = p.facility_id
      JOIN clinzo.organization o ON o.id = f.organization_id
      JOIN clinzo.identity i ON i.id = actor AND i.disabled_at IS NULL
    WHERE p.id = practice AND d.active AND (
      (d.identity_id = actor AND d.credential_status <> 'suspended') OR
      (p.active AND f.active AND o.active AND f.verification_status = 'verified'
        AND d.credential_status = 'verified' AND EXISTS (
          SELECT 1 FROM clinzo.organization_member m
          WHERE m.identity_id = actor AND m.organization_id = f.organization_id AND m.active
            AND (m.facility_id IS NULL OR m.facility_id = f.id)
            AND m.role IN ('owner', 'organization_admin', 'facility_admin')))
    )
  );
$$;
REVOKE ALL ON FUNCTION clinzo.can_edit_practice_schedule(uuid,uuid) FROM PUBLIC, anon, authenticated;

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
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,facility_id,request_id,outcome,metadata)
    SELECT actor,'identity','practice.schedule.updated','doctor_facility',p.id,p.facility_id,gen_random_uuid(),'allowed','{}'::jsonb
    FROM clinzo.doctor_facility p WHERE p.id=p_practice_id;
  RETURN public.get_my_schedule_preferences(p_practice_id);
END $$;


-- Presence is clinic check-in only. It is not an online-call state.
CREATE OR REPLACE FUNCTION public.list_my_facility_doctors() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(roster_row) ORDER BY roster_row.name) FROM (
    SELECT d.id, p.id AS practice_id, d.full_name AS name, d.booking_timezone, d.public_code AS clinzo_id,
      coalesce((SELECT string_agg(s.name, ', ' ORDER BY s.name)
        FROM clinzo.doctor_specialty ds JOIN clinzo.specialty s ON s.id=ds.specialty_id
        WHERE ds.doctor_id=d.id AND s.active), '') AS specialization,
      coalesce(i.verified_phone, '') AS phone,
      d.credential_status='verified' AS verified,
      coalesce(presence.present,false) AS present,
      EXISTS (SELECT 1 FROM clinzo.schedule_exception e
        WHERE e.doctor_id=d.id AND e.state='active'
          AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p.id)
          AND lower(trim(e.reason))='leave'
          AND e.starts_at<=now() AND e.ends_at>now()) AS on_leave
    FROM clinzo.doctor_facility p
    JOIN clinzo.doctor d ON d.id=p.doctor_id
    JOIN clinzo.facility f ON f.id=p.facility_id
    JOIN clinzo.organization o ON o.id=f.organization_id
    LEFT JOIN clinzo.identity i ON i.id=d.identity_id
    LEFT JOIN clinzo.doctor_presence presence ON presence.doctor_id=d.id
    WHERE p.active AND d.active AND f.active AND o.active
      AND clinzo.can_manage_practice(actor,p.id)
    ORDER BY d.full_name LIMIT 500
  ) roster_row), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.get_my_schedule_preferences(uuid), public.save_my_schedule_preferences(uuid,jsonb,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_schedule_preferences(uuid), public.save_my_schedule_preferences(uuid,jsonb,bigint) TO authenticated;
