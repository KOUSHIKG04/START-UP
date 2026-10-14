-- Save every selected service in a single transaction. A conflicting service
-- rolls back the entire selection rather than leaving a partial block.
CREATE FUNCTION public.add_doctor_unavailability_for_services(
  p_practice_id uuid, p_starts_at timestamptz, p_ends_at timestamptz,
  p_reason text, p_service_modes text[]
) RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor(); doctor_id uuid; mode text; ids uuid[]:='{}';
BEGIN
  IF p_service_modes IS NULL OR cardinality(p_service_modes) NOT BETWEEN 1 AND 3
    OR EXISTS(SELECT 1 FROM unnest(p_service_modes) m WHERE m IS NULL OR m NOT IN ('all','clinic','online','home'))
    OR cardinality(p_service_modes)<>(SELECT count(DISTINCT m) FROM unnest(p_service_modes) m)
    OR ('all'=ANY(p_service_modes) AND cardinality(p_service_modes)<>1) THEN
    RAISE EXCEPTION 'Choose All or one or more services' USING ERRCODE='22023';
  END IF;
  IF NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501';
  END IF;
  SELECT d.id INTO doctor_id FROM clinzo.doctor d JOIN clinzo.doctor_facility p ON p.doctor_id=d.id
    WHERE p.id=p_practice_id AND p.active FOR UPDATE OF d;
  IF doctor_id IS NULL THEN RAISE EXCEPTION 'Active practice required' USING ERRCODE='42501'; END IF;
  PERFORM s.id FROM clinzo.session s WHERE s.doctor_facility_id=p_practice_id
    AND s.starts_at<p_ends_at AND s.ends_at>p_starts_at
    AND ('all'=ANY(p_service_modes) OR clinzo.service_mode_for_session(s.id)=ANY(p_service_modes))
    ORDER BY s.id FOR UPDATE OF s;
  FOR mode IN SELECT m FROM unnest(p_service_modes) m ORDER BY m LOOP
    ids:=array_append(ids,public.add_doctor_unavailability(p_practice_id,p_starts_at,p_ends_at,p_reason,mode));
  END LOOP;
  RETURN ids;
END $$;
REVOKE ALL ON FUNCTION public.add_doctor_unavailability_for_services(uuid,timestamptz,timestamptz,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_doctor_unavailability_for_services(uuid,timestamptz,timestamptz,text,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_clinic_sessions(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor();
BEGIN
  IF NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(session_row)) FROM (
    SELECT s.id,s.starts_at,s.ends_at,s.timezone,s.hard_capacity,s.auto_confirm_limit,
      s.state,s.row_version::text AS row_version,clinzo.service_mode_for_session(s.id) AS service_mode,
      coalesce((SELECT jsonb_agg(jsonb_build_object('starts_at',w.starts_at,'ends_at',w.ends_at) ORDER BY w.starts_at)
        FROM clinzo.appointment_window w WHERE w.session_id=s.id AND w.state='open' AND w.starts_at>now()
          AND s.state IN ('published','open')
          AND w.hard_capacity>(SELECT count(*) FROM clinzo.appointment a WHERE a.window_id=w.id
            AND a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL)
          AND NOT EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=s.doctor_id AND e.state='active'
            AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=s.doctor_facility_id)
            AND e.service_mode IN ('all',clinzo.service_mode_for_session(s.id))
            AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at)), '[]'::jsonb) AS available_slots
    FROM clinzo.session s WHERE s.doctor_facility_id=p_practice_id AND s.ends_at>now()-interval '7 days'
      AND s.state<>'cancelled' ORDER BY s.starts_at ASC LIMIT 300
  ) session_row),'[]'::jsonb);
END $$;
