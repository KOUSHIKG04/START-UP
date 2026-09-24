CREATE FUNCTION public.list_clinic_unavailability(p_practice_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor();
BEGIN
  IF NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(unavailable_row)) FROM (
    SELECT e.id,e.starts_at,e.ends_at,e.reason,e.state,e.row_version::text AS row_version
    FROM clinzo.schedule_exception e WHERE e.doctor_facility_id=p_practice_id
      AND e.ends_at>now()-interval '7 days' ORDER BY e.starts_at DESC LIMIT 100
  ) unavailable_row),'[]'::jsonb);
END $$;

CREATE FUNCTION public.add_clinic_unavailability(p_practice_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); v_doctor_id uuid; exception_id uuid; old_id uuid;
BEGIN
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_starts_at<=now() OR p_ends_at<=p_starts_at
    OR p_ends_at>p_starts_at+interval '30 days' OR p_starts_at>now()+interval '1 year'
    OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 2 AND 500 THEN
    RAISE EXCEPTION 'Invalid unavailable dates or reason' USING ERRCODE='22023'; END IF;
  SELECT p.doctor_id INTO v_doctor_id FROM clinzo.doctor_facility p WHERE p.id=p_practice_id AND p.active;
  IF v_doctor_id IS NULL OR NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  -- Booking locks its session first. Lock all affected sessions in a stable order
  -- so a concurrent booking cannot pass the availability check during leave setup.
  PERFORM s.id FROM clinzo.session s WHERE s.doctor_facility_id=p_practice_id
    AND s.starts_at<p_ends_at AND s.ends_at>p_starts_at ORDER BY s.id FOR UPDATE OF s;
  IF EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.appointment_window w ON w.id=a.window_id
    JOIN clinzo.session s ON s.id=a.session_id WHERE s.doctor_facility_id=p_practice_id
      AND w.starts_at<p_ends_at AND w.ends_at>p_starts_at
      AND a.status IN ('confirmed','in_consultation')) THEN
    RAISE EXCEPTION 'Resolve confirmed appointments before adding unavailability' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=v_doctor_id AND e.state='active'
    AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p_practice_id)
    AND e.starts_at<p_ends_at AND e.ends_at>p_starts_at) THEN
    RAISE EXCEPTION 'An overlapping unavailable period already exists' USING ERRCODE='23505'; END IF;
  INSERT INTO clinzo.schedule_exception(doctor_id,doctor_facility_id,starts_at,ends_at,reason,state)
    VALUES(v_doctor_id,p_practice_id,p_starts_at,p_ends_at,trim(p_reason),'active') RETURNING id INTO exception_id;
  FOR old_id IN UPDATE clinzo.appointment a SET status='rejected',decision_by=actor,
    decision_reason='Doctor unavailable: '||trim(p_reason)
    WHERE a.status='pending' AND EXISTS(SELECT 1 FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
      WHERE w.id=a.window_id AND s.doctor_facility_id=p_practice_id AND w.starts_at<p_ends_at AND w.ends_at>p_starts_at)
    RETURNING a.id LOOP
    PERFORM clinzo.appointment_event(old_id,actor,'rejected_unavailable');
  END LOOP;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','schedule.unavailability_added','schedule_exception',exception_id,gen_random_uuid(),'allowed','{}');
  RETURN exception_id;
END $$;

CREATE FUNCTION public.revoke_clinic_unavailability(p_exception_id uuid,p_expected_version bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); e clinzo.schedule_exception;
BEGIN
  SELECT * INTO e FROM clinzo.schedule_exception WHERE id=p_exception_id FOR UPDATE;
  IF e.id IS NULL OR e.doctor_facility_id IS NULL OR NOT clinzo.can_manage_practice(actor,e.doctor_facility_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  IF p_expected_version IS NULL OR e.row_version<>p_expected_version THEN
    RAISE EXCEPTION 'Unavailable period changed; refresh and retry' USING ERRCODE='40001'; END IF;
  IF e.state<>'active' OR e.ends_at<=now() THEN
    RAISE EXCEPTION 'Only active future unavailability can be revoked' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.schedule_exception SET state='revoked' WHERE id=e.id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','schedule.unavailability_revoked','schedule_exception',e.id,gen_random_uuid(),'allowed','{}');
  RETURN e.id;
END $$;

REVOKE ALL ON FUNCTION public.list_clinic_unavailability(uuid),
  public.add_clinic_unavailability(uuid,timestamptz,timestamptz,text),
  public.revoke_clinic_unavailability(uuid,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_clinic_unavailability(uuid),
  public.add_clinic_unavailability(uuid,timestamptz,timestamptz,text),
  public.revoke_clinic_unavailability(uuid,bigint) TO authenticated;
