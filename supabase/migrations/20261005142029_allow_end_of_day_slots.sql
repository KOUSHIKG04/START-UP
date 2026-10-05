-- 24:00 is a valid exclusive end boundary. Slot starts remain on the chosen
-- working day; only an end exactly at the next local midnight may cross it.
-- Keep publication groups at or below the existing eight-hour session limit.

CREATE OR REPLACE FUNCTION public.publish_clinic_session(p_practice_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,
  p_slot_minutes integer,p_fee_minor bigint,p_currency text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); d clinzo.doctor; sid uuid; service uuid; day_id uuid; slot_start timestamptz;
  n integer; existing clinzo.session;
BEGIN
  SELECT d0.* INTO d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id WHERE p.id=p_practice_id FOR UPDATE OF d0;
  IF NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) OR d.id IS NULL OR NOT d.active OR d.credential_status <> 'verified' THEN
    RAISE EXCEPTION 'Verified practice access required' USING ERRCODE='42501'; END IF;
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_slot_minutes IS NULL OR p_fee_minor IS NULL OR p_currency IS NULL
    OR p_starts_at <= now() OR p_starts_at > now()+interval '90 days' OR p_ends_at <= p_starts_at
    OR p_ends_at-p_starts_at > interval '8 hours' OR p_slot_minutes NOT BETWEEN 5 AND 120
    OR extract(epoch FROM p_ends_at-p_starts_at)::bigint % (p_slot_minutes*60) <> 0
    OR ((p_ends_at AT TIME ZONE d.booking_timezone)::date <> (p_starts_at AT TIME ZONE d.booking_timezone)::date
      AND (p_ends_at AT TIME ZONE d.booking_timezone) <> (((p_starts_at AT TIME ZONE d.booking_timezone)::date + 1)::timestamp))
    OR p_fee_minor NOT BETWEEN 0 AND 100000000 OR p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid session times, slot duration or fee' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing FROM clinzo.session WHERE doctor_facility_id=p_practice_id AND starts_at=p_starts_at;
  IF existing.id IS NOT NULL THEN
    IF existing.ends_at=p_ends_at AND existing.state IN ('open','published')
      AND EXISTS(SELECT 1 FROM clinzo.session_service ss JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
        WHERE ss.session_id=existing.id AND ps.fee_minor=p_fee_minor AND ps.currency=p_currency AND ps.duration_minutes=p_slot_minutes) THEN RETURN existing.id; END IF;
    RAISE EXCEPTION 'A different session already starts at this time' USING ERRCODE='23505';
  END IF;
  n := extract(epoch FROM p_ends_at-p_starts_at)::integer/(p_slot_minutes*60);
  INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone)
    VALUES(d.id,(p_starts_at AT TIME ZONE d.booking_timezone)::date,d.booking_timezone)
    ON CONFLICT(doctor_id,local_date) DO UPDATE SET timezone=excluded.timezone RETURNING id INTO day_id;
  INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
    VALUES(p_practice_id,d.id,day_id,p_starts_at,p_ends_at,d.booking_timezone,n,'published') RETURNING id INTO sid;
  INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
    VALUES(p_practice_id,'clinic-'||sid::text,'Clinic consultation',p_fee_minor,p_currency,p_slot_minutes) RETURNING id INTO service;
  INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(sid,service);
  slot_start := p_starts_at;
  WHILE slot_start < p_ends_at LOOP
    INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
      VALUES(sid,slot_start,slot_start+make_interval(mins=>p_slot_minutes),1,'open');
    slot_start := slot_start+make_interval(mins=>p_slot_minutes);
  END LOOP;
  INSERT INTO clinzo.session_queue(session_id) VALUES(sid);
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','session.published','session',sid,gen_random_uuid(),'allowed','{}');
  RETURN sid;
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
  RETURN published_ids;
END $$;
