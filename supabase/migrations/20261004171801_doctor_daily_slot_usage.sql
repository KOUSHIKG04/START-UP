-- Match the per-doctor, per-local-day counting rule used when publishing.
-- The caller can inspect only a practice they are allowed to manage.
CREATE FUNCTION public.get_my_doctor_daily_slot_usage(
  p_practice_id uuid,
  p_local_day date
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := clinzo.require_care_actor();
  doctor_row clinzo.doctor;
  clinic_count integer;
  online_count integer;
  home_count integer;
BEGIN
  IF p_local_day IS NULL THEN
    RAISE EXCEPTION 'Choose a date' USING ERRCODE='22023';
  END IF;
  SELECT d.* INTO doctor_row FROM clinzo.doctor_facility df
    JOIN clinzo.doctor d ON d.id=df.doctor_id WHERE df.id=p_practice_id;
  IF doctor_row.id IS NULL OR NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501';
  END IF;
  SELECT
    coalesce(sum(s.hard_capacity) FILTER (WHERE ps.code NOT LIKE 'online-%' AND ps.code NOT LIKE 'home-%'),0)::integer,
    coalesce(sum(s.hard_capacity) FILTER (WHERE ps.code LIKE 'online-%'),0)::integer,
    coalesce(sum(s.hard_capacity) FILTER (WHERE ps.code LIKE 'home-%'),0)::integer
  INTO clinic_count,online_count,home_count
  FROM clinzo.session s
  JOIN clinzo.session_service ss ON ss.session_id=s.id
  JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
  WHERE s.doctor_id=doctor_row.id AND s.state IN ('published','open')
    AND (s.starts_at AT TIME ZONE doctor_row.booking_timezone)::date=p_local_day;
  RETURN jsonb_build_object('clinic',clinic_count,'online',online_count,'home',home_count);
END $$;
REVOKE ALL ON FUNCTION public.get_my_doctor_daily_slot_usage(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_doctor_daily_slot_usage(uuid,date) TO authenticated;
