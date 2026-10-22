-- Preserve existing total capacity. Existing app allocations retain that total;
-- reception starts at zero until a doctor/facility explicitly allocates it.
ALTER TABLE clinzo.doctor_schedule_preferences
  ADD COLUMN clinic_app_daily_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN clinic_walkin_daily_limit integer NOT NULL DEFAULT 0;
UPDATE clinzo.doctor_schedule_preferences SET clinic_app_daily_limit=walkin_daily_limit;
ALTER TABLE clinzo.doctor_schedule_preferences ADD CONSTRAINT clinic_channel_limits_check
  CHECK (clinic_app_daily_limit BETWEEN 0 AND 100 AND clinic_walkin_daily_limit BETWEEN 0 AND 100
    AND clinic_app_daily_limit+clinic_walkin_daily_limit<=walkin_daily_limit);

-- Extend the existing versioned settings owner, preserving its authorization,
-- validation, publication integration and single optimistic version increment.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('public.get_my_schedule_preferences(uuid)'::regprocedure);
  IF position('''row_version'',s.row_version::text' in definition)=0 THEN RAISE EXCEPTION 'Unexpected settings projection'; END IF;
  EXECUTE replace(definition,'''row_version'',s.row_version::text',
    '''clinic_app_daily_limit'',s.clinic_app_daily_limit,''clinic_walkin_daily_limit'',s.clinic_walkin_daily_limit,''row_version'',s.row_version::text');
  definition:=pg_get_functiondef('public.save_my_schedule_preferences(uuid,jsonb,bigint)'::regprocedure);
  IF position('online_limit int; walkin_limit int; accept_limit int;' in definition)=0
    OR position('walkin_daily_limit=walkin_limit,' in definition)=0 THEN RAISE EXCEPTION 'Unexpected settings mutation'; END IF;
  definition:=replace(definition,'online_limit int; walkin_limit int; accept_limit int;',
    'online_limit int; walkin_limit int; accept_limit int; app_limit int; reception_limit int;');
  definition:=replace(definition,'walkin_limit:=(p_settings->>''walkin_daily_limit'')::int;',
    'walkin_limit:=(p_settings->>''walkin_daily_limit'')::int;
    app_limit:=coalesce((p_settings->>''clinic_app_daily_limit'')::int,least(previous.clinic_app_daily_limit,walkin_limit),walkin_limit);
    reception_limit:=coalesce((p_settings->>''clinic_walkin_daily_limit'')::int,least(previous.clinic_walkin_daily_limit,greatest(walkin_limit-app_limit,0)),0);');
  definition:=replace(definition,'OR clinic_fee NOT BETWEEN',
    'OR app_limit NOT BETWEEN 0 AND 100 OR reception_limit NOT BETWEEN 0 AND 100 OR app_limit+reception_limit>walkin_limit
    OR clinic_fee NOT BETWEEN');
  definition:=replace(definition,'walkin_daily_limit,auto_accept,auto_accept_limit',
    'walkin_daily_limit,clinic_app_daily_limit,clinic_walkin_daily_limit,auto_accept,auto_accept_limit');
  definition:=replace(definition,'home_duration,online_limit,walkin_limit,',
    'home_duration,online_limit,walkin_limit,app_limit,reception_limit,');
  definition:=replace(definition,'walkin_daily_limit=walkin_limit,',
    'walkin_daily_limit=walkin_limit,clinic_app_daily_limit=app_limit,clinic_walkin_daily_limit=reception_limit,');
  EXECUTE definition;
END $$;

CREATE FUNCTION clinzo.remaining_clinic_channel_capacity(p_session_id uuid,p_source text,p_exclude_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE target clinzo.session; settings clinzo.doctor_schedule_preferences; used_total int; used_channel int; channel_limit int;
BEGIN
  SELECT * INTO target FROM clinzo.session WHERE id=p_session_id;
  IF target.id IS NULL THEN RETURN 0; END IF;
  SELECT * INTO settings FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=target.doctor_facility_id;
  IF settings.doctor_facility_id IS NULL THEN RETURN 2147483647; END IF;
  channel_limit:=CASE WHEN p_source='patient_online' THEN settings.clinic_app_daily_limit ELSE settings.clinic_walkin_daily_limit END;
  SELECT count(*)::int,count(*) FILTER (WHERE (a.source='patient_online')=(p_source='patient_online'))::int
    INTO used_total,used_channel
  FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id
  WHERE s.booking_day_id=target.booking_day_id AND s.doctor_facility_id=target.doctor_facility_id
    AND clinzo.service_mode_for_session(s.id)='clinic' AND (p_exclude_id IS NULL OR a.id<>p_exclude_id)
    AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL)
      OR (a.status='pending' AND a.request_expires_at>now()));
  RETURN greatest(least(settings.walkin_daily_limit-used_total,channel_limit-used_channel),0);
END $$;
REVOKE ALL ON FUNCTION clinzo.remaining_clinic_channel_capacity(uuid,text,uuid) FROM PUBLIC,anon,authenticated;

-- The existing booking-day lock serializes admission across both sources.
DO $$
DECLARE definition text; fn regprocedure; start_at int; end_at int;
BEGIN
  definition:=pg_get_functiondef('clinzo.enforce_daily_booking_capacity()'::regprocedure);
  IF position('IF NOT clinzo.has_daily_booking_capacity(NEW.session_id,NEW.id) THEN' in definition)=0 THEN RAISE EXCEPTION 'Unexpected admission guard'; END IF;
  definition:=replace(definition,'IF NOT clinzo.has_daily_booking_capacity(NEW.session_id,NEW.id) THEN',
    'IF clinzo.service_mode_for_session(NEW.session_id)=''clinic'' AND clinzo.remaining_clinic_channel_capacity(NEW.session_id,NEW.source,NEW.id)<1 THEN
      RAISE EXCEPTION ''Clinic booking quota reached for this registration source'' USING ERRCODE=''23514'';
    END IF;
    IF NOT clinzo.has_daily_booking_capacity(NEW.session_id,NEW.id) THEN');
  EXECUTE definition;
  FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('list_clinic_slots','list_practice_clinic_slots','list_practice_service_slots') LOOP
    definition:=pg_get_functiondef(fn);
    start_at:=position('CASE WHEN clinzo.service_mode_for_session(s.id)=''clinic'' THEN (' in definition);
    end_at:=position('ELSE NULL END AS _daily_remaining' in definition);
    IF start_at=0 OR end_at<=start_at THEN RAISE EXCEPTION 'Unexpected ranked availability: %',fn; END IF;
    definition:=substring(definition FROM 1 FOR start_at-1)||
      'CASE WHEN clinzo.service_mode_for_session(s.id)=''clinic'' THEN clinzo.remaining_clinic_channel_capacity(s.id,''patient_online'') '||
      substring(definition FROM end_at);
    EXECUTE definition;
  END LOOP;
END $$;

-- A staff-only full-day view; booked/past/blocked times remain visible.
CREATE FUNCTION public.get_portal_clinic_day(p_practice_id uuid,p_local_day date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor(); settings clinzo.doctor_schedule_preferences; zone text; day date;
  total_used int; app_used int; walkin_used int; slots jsonb;
BEGIN
  IF NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  SELECT d.booking_timezone INTO zone FROM clinzo.doctor d JOIN clinzo.doctor_facility p ON p.doctor_id=d.id WHERE p.id=p_practice_id;
  SELECT * INTO settings FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id;
  IF settings.doctor_facility_id IS NULL THEN RAISE EXCEPTION 'Configure clinic capacity in Doctor Schedules first' USING ERRCODE='22023'; END IF;
  SELECT coalesce(p_local_day,min((s.starts_at AT TIME ZONE zone)::date),(now() AT TIME ZONE zone)::date) INTO day
    FROM clinzo.session s WHERE s.doctor_facility_id=p_practice_id AND s.state IN ('published','open') AND s.ends_at>now() AND clinzo.service_mode_for_session(s.id)='clinic';
  SELECT count(*)::int,count(*) FILTER(WHERE a.source='patient_online')::int,count(*) FILTER(WHERE a.source<>'patient_online')::int
    INTO total_used,app_used,walkin_used
  FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id
  JOIN clinzo.doctor_booking_day bd ON bd.id=s.booking_day_id
  WHERE s.doctor_facility_id=p_practice_id AND bd.local_date=day AND clinzo.service_mode_for_session(s.id)='clinic'
    AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now()));
  SELECT coalesce(jsonb_agg(jsonb_build_object('window_id',w.id,'practice_service_id',ps.id,'practice_id',p_practice_id,
    'doctor_name',d.full_name,'facility_name',f.name,'address',f.address,'starts_at',w.starts_at,'ends_at',w.ends_at,
    'timezone',s.timezone,'fee_minor',ps.fee_minor::text,'currency',ps.currency,'service_mode','clinic',
    'state',CASE WHEN w.starts_at<=now() THEN 'past' WHEN occupied.used>=w.hard_capacity OR occupied.session_used>=s.hard_capacity THEN 'booked'
      WHEN w.state<>'open' OR s.state NOT IN ('published','open') OR NOT d.active OR d.credential_status<>'verified' OR NOT p.active OR NOT f.active OR f.verification_status<>'verified' OR NOT o.active OR EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=s.doctor_id AND e.state='active'
        AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p_practice_id) AND e.service_mode IN ('all','clinic') AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at) THEN 'unavailable' ELSE 'open' END
    ) ORDER BY w.starts_at,w.id,ps.id),'[]'::jsonb) INTO slots
  FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
  JOIN clinzo.session_service ss ON ss.session_id=s.id JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id AND ps.active
  JOIN clinzo.doctor d ON d.id=s.doctor_id JOIN clinzo.doctor_facility p ON p.id=s.doctor_facility_id JOIN clinzo.facility f ON f.id=p.facility_id
  JOIN clinzo.organization o ON o.id=f.organization_id
  CROSS JOIN LATERAL(SELECT count(*) FILTER(WHERE a.window_id=w.id) AS used,count(*) AS session_used FROM clinzo.appointment a WHERE a.session_id=s.id
    AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now()))) occupied
  WHERE s.doctor_facility_id=p_practice_id AND (w.starts_at AT TIME ZONE zone)::date=day AND clinzo.service_mode_for_session(s.id)='clinic' AND s.state<>'cancelled';
  RETURN jsonb_build_object('local_day',day,'timezone',zone,'clinic_start',settings.clinic_start,'clinic_end',settings.clinic_end,
    'total_limit',settings.walkin_daily_limit,'app_limit',settings.clinic_app_daily_limit,'walkin_limit',settings.clinic_walkin_daily_limit,
    'total_used',total_used,'app_used',app_used,'walkin_used',walkin_used,
    'app_remaining',greatest(least(settings.clinic_app_daily_limit-app_used,settings.walkin_daily_limit-total_used),0),
    'walkin_remaining',greatest(least(settings.clinic_walkin_daily_limit-walkin_used,settings.walkin_daily_limit-total_used),0),'slots',slots);
END $$;
REVOKE ALL ON FUNCTION public.get_portal_clinic_day(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_portal_clinic_day(uuid,date) TO authenticated;

-- Keep the seven-argument endpoint for older reception clients. A distinct
-- ten-argument overload adds demographics and optional same-day check-in.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('public.book_portal_walk_in_appointment(uuid,uuid,uuid,text,text,text,uuid)'::regprocedure);
  definition:=replace(definition,'p_idempotency_key uuid)',
    'p_idempotency_key uuid, p_patient_age integer, p_patient_gender text, p_check_in boolean)');
  definition:=replace(definition,'IF p_practice_id IS NULL',
    'IF (p_patient_age IS NOT NULL AND p_patient_age NOT BETWEEN 0 AND 120)
      OR (p_patient_gender IS NOT NULL AND p_patient_gender NOT IN (''Male'',''Female'',''Other'',''Prefer not to say'')) THEN
      RAISE EXCEPTION ''Invalid patient age or gender'' USING ERRCODE=''22023'';
    END IF;
    IF p_practice_id IS NULL');
  definition:=replace(definition,'AND e.starts_at<w.ends_at', 'AND e.service_mode IN (''all'',''clinic'') AND e.starts_at<w.ends_at');
  definition:=replace(definition,'nullif(btrim(p_reason),''''))::text',
    'nullif(btrim(p_reason),''''),p_patient_age,p_patient_gender,p_check_in)::text');
  definition:=replace(definition,'INSERT INTO clinzo.patient(public_code,full_name,contact_phone)',
    'INSERT INTO clinzo.patient(public_code,full_name,contact_phone,reported_age_years,reported_age_on,gender_identity)');
  definition:=replace(definition,'btrim(p_patient_name),nullif(btrim(p_patient_phone),''''))',
    'btrim(p_patient_name),nullif(btrim(p_patient_phone),''''),p_patient_age,CASE WHEN p_patient_age IS NULL THEN NULL ELSE current_date END,p_patient_gender)');
  definition:=replace(definition,'PERFORM clinzo.appointment_event(appointment_id,actor,''staff_booked'');',
    'PERFORM clinzo.appointment_event(appointment_id,actor,''staff_booked'');
    IF coalesce(p_check_in,false) THEN
      PERFORM public.transition_clinic_appointment(appointment_id,(SELECT row_version FROM clinzo.appointment WHERE id=appointment_id),''check_in'',NULL);
    END IF;');
  EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION public.book_portal_walk_in_appointment(uuid,uuid,uuid,text,text,text,uuid,integer,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.book_portal_walk_in_appointment(uuid,uuid,uuid,text,text,text,uuid,integer,text,boolean) TO authenticated;

-- Reception receives demographics only for practices it already manages.
CREATE OR REPLACE FUNCTION public.list_care_appointments(p_practice_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(items.value || jsonb_build_object(
    'visit_mode',a.visit_mode,'practice_id',s.doctor_facility_id,'practice_service_id',a.practice_service_id,'source',a.source
  ) || CASE WHEN coalesce(clinzo.can_manage_practice(clinzo.require_care_actor(),s.doctor_facility_id),false) THEN jsonb_build_object(
    'patient_phone',p.contact_phone,'patient_gender',p.gender_identity,'patient_age_years',
    CASE WHEN p.birth_date IS NOT NULL THEN extract(year FROM age(current_date,p.birth_date))::integer
      WHEN p.reported_age_years IS NOT NULL THEN p.reported_age_years+extract(year FROM age(current_date,p.reported_age_on))::integer END,
    'reason',a.reason
  ) ELSE '{}'::jsonb END ORDER BY items.ordinality),'[]'::jsonb)
  FROM jsonb_array_elements(public.list_clinic_appointments(p_practice_id)) WITH ORDINALITY items(value,ordinality)
  JOIN clinzo.appointment a ON a.id=(items.value->>'id')::uuid JOIN clinzo.session s ON s.id=a.session_id JOIN clinzo.patient p ON p.id=a.patient_id;
$$;
