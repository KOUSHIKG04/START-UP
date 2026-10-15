-- One UI action saves all intake observations in one transaction.
CREATE FUNCTION public.record_consultation_intake(p_appointment_id uuid,p_vitals jsonb,p_diagnosis text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE observation jsonb;
BEGIN
  IF jsonb_typeof(p_vitals) IS DISTINCT FROM 'array' OR jsonb_array_length(p_vitals)>7
    OR (jsonb_array_length(p_vitals)=0 AND nullif(trim(p_diagnosis),'') IS NULL)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_vitals) v GROUP BY v->>'code' HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Enter valid vitals or a diagnosis' USING ERRCODE='22023'; END IF;
  FOR observation IN SELECT value FROM jsonb_array_elements(p_vitals) LOOP
    PERFORM public.record_consultation_vital(p_appointment_id,observation->>'code',(observation->>'value')::numeric,observation->>'unit');
  END LOOP;
  IF nullif(trim(p_diagnosis),'') IS NOT NULL THEN
    PERFORM public.record_consultation_diagnosis(p_appointment_id,trim(p_diagnosis),true);
  END IF;
  RETURN p_appointment_id;
END $$;
REVOKE ALL ON FUNCTION public.record_consultation_intake(uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_consultation_intake(uuid,jsonb,text) TO authenticated;

-- Only the treating doctor can reopen an unfinished clinical flow.
CREATE FUNCTION public.get_doctor_consultation_draft(p_appointment_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); c clinzo.consultation;
BEGIN
  SELECT c0.* INTO c FROM clinzo.consultation c0 JOIN clinzo.doctor d ON d.id=c0.doctor_id
    WHERE c0.appointment_id=p_appointment_id AND c0.status='active' AND d.identity_id=actor
      AND d.active AND d.credential_status='verified';
  IF c.id IS NULL THEN RAISE EXCEPTION 'Active consultation access required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'vitals',(SELECT coalesce(jsonb_agg(to_jsonb(latest)),'[]'::jsonb) FROM (
      SELECT DISTINCT ON (v.code) v.code,v.value_numeric AS value,v.unit_code AS unit
      FROM clinzo.vital_observation v WHERE v.consultation_id=c.id AND v.void_reason IS NULL
        AND NOT EXISTS(SELECT 1 FROM clinzo.vital_observation newer WHERE newer.supersedes_id=v.id)
      ORDER BY v.code,v.measured_at DESC,v.id DESC) latest),
    'diagnosis',(SELECT d.description FROM clinzo.consultation_diagnosis d WHERE d.consultation_id=c.id AND d.is_primary
      AND NOT EXISTS(SELECT 1 FROM clinzo.consultation_diagnosis newer WHERE newer.supersedes_id=d.id) LIMIT 1),
    'prescription_issued',EXISTS(SELECT 1 FROM clinzo.prescription p WHERE p.consultation_id=c.id),
    'followup',(SELECT jsonb_build_object('date',f.recommended_date,'reason',f.reason) FROM clinzo.followup_recommendation f
      WHERE f.consultation_id=c.id AND f.status='active' ORDER BY f.created_at DESC LIMIT 1));
END $$;
REVOKE ALL ON FUNCTION public.get_doctor_consultation_draft(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctor_consultation_draft(uuid) TO authenticated;
