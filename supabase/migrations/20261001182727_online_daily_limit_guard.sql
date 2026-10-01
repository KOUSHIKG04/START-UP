-- A saved online_daily_limit is a per-doctor, per-local-day cap across every
-- active practice. Lock the doctor row before counting/publishing so concurrent
-- requests at different facilities cannot both pass the same daily check.
CREATE OR REPLACE FUNCTION public.publish_online_session(
  p_practice_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,
  p_slot_minutes integer,p_fee_minor bigint,p_currency text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  actor uuid := clinzo.require_care_actor();
  doctor_row clinzo.doctor;
  sid uuid;
  online_limit integer;
  slot_count integer;
  already_published integer;
BEGIN
  SELECT d.* INTO doctor_row FROM clinzo.doctor_facility p
    JOIN clinzo.doctor d ON d.id=p.doctor_id WHERE p.id=p_practice_id FOR UPDATE OF d;
  IF doctor_row.id IS NULL OR NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  SELECT s.online_daily_limit INTO online_limit FROM clinzo.doctor_schedule_preferences s
    WHERE s.doctor_facility_id=p_practice_id;
  IF coalesce(online_limit,0)<1 THEN
    RAISE EXCEPTION 'Enable online slots in your saved schedule first' USING ERRCODE='22023'; END IF;
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_slot_minutes IS NULL OR p_slot_minutes<1
    OR p_ends_at<=p_starts_at OR p_slot_minutes>120 THEN
    RAISE EXCEPTION 'Invalid online session' USING ERRCODE='22023'; END IF;
  slot_count:=extract(epoch FROM p_ends_at-p_starts_at)::integer/(p_slot_minutes*60);
  SELECT coalesce(sum(s.hard_capacity),0)::integer INTO already_published
    FROM clinzo.session s
    JOIN clinzo.doctor_booking_day day ON day.id=s.booking_day_id
    JOIN clinzo.session_service ss ON ss.session_id=s.id
    JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
    WHERE s.doctor_id=doctor_row.id AND s.state IN ('published','open')
      AND day.local_date=(p_starts_at AT TIME ZONE doctor_row.booking_timezone)::date
      AND ps.code LIKE 'online-%';
  IF slot_count<1 OR slot_count+already_published>online_limit OR EXISTS(
    SELECT 1 FROM clinzo.session WHERE doctor_facility_id=p_practice_id AND starts_at=p_starts_at
  ) THEN RAISE EXCEPTION 'Online daily slot limit exceeded or session already exists' USING ERRCODE='22023'; END IF;
  sid:=public.publish_clinic_session(p_practice_id,p_starts_at,p_ends_at,p_slot_minutes,p_fee_minor,p_currency);
  UPDATE clinzo.practice_service ps SET code='online-'||sid::text,name='Video consultation'
    FROM clinzo.session_service ss WHERE ss.session_id=sid AND ss.practice_service_id=ps.id;
  RETURN sid;
END $$;
