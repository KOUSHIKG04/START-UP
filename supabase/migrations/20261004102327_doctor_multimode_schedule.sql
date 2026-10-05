-- A doctor can publish distinct, non-overlapping clinic, video and home-visit
-- blocks on one local date. The existing session exclusion constraint remains
-- the final protection against double booking across all practices.
CREATE FUNCTION public.publish_doctor_service_session(
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
  session_id uuid;
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
    OR p_slot_minutes <> settings.slot_minutes THEN
    RAISE EXCEPTION 'Choose a working day and the saved slot duration' USING ERRCODE='22023';
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
  session_id := public.publish_clinic_session(p_practice_id,p_starts_at,p_ends_at,p_slot_minutes,p_fee_minor,p_currency);
  IF p_mode <> 'clinic' THEN
    SELECT ss.practice_service_id INTO service_id FROM clinzo.session_service ss
      WHERE ss.session_id=session_id;
    UPDATE clinzo.practice_service SET code=p_mode||'-'||session_id::text,
      name=CASE p_mode WHEN 'online' THEN 'Video consultation' ELSE 'Home visit' END
      WHERE id=service_id;
  END IF;
  RETURN session_id;
END $$;
REVOKE ALL ON FUNCTION public.publish_doctor_service_session(uuid,text,timestamptz,timestamptz,integer,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_doctor_service_session(uuid,text,timestamptz,timestamptz,integer,bigint,text) TO authenticated;

-- Home visits are not bookable until the server can verify the patient's
-- geocoded address against the doctor's travel radius. Fail closed even if a
-- caller bypasses the mobile UI and invokes the generic booking RPC directly.
CREATE FUNCTION clinzo.guard_home_visit_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM clinzo.practice_service ps WHERE ps.id=NEW.practice_service_id AND ps.code LIKE 'home-%') THEN
    RAISE EXCEPTION 'Home visit booking requires verified address coverage' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_home_visit_booking BEFORE INSERT ON clinzo.appointment
  FOR EACH ROW EXECUTE FUNCTION clinzo.guard_home_visit_booking();
