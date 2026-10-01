-- Preserve the designed portal columns without exposing extra clinical detail.
CREATE OR REPLACE FUNCTION public.list_clinic_appointments(p_practice_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor();
BEGIN
  IF p_practice_id IS NOT NULL AND NOT clinzo.can_manage_practice(actor,p_practice_id) THEN
    RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT a.id,a.public_code,a.status,a.row_version::text,a.patient_id,pat.full_name AS patient_name,
      pat.public_code AS patient_public_code,a.service_name_snapshot AS service_name,
      a.doctor_name_snapshot AS doctor_name,a.facility_name_snapshot AS facility_name,
      CASE WHEN (d.identity_id=actor AND d.active AND d.credential_status='verified') OR EXISTS(
        SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor
          AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) THEN a.reason ELSE NULL END AS reason,
      a.fee_minor::text,a.currency,
      w.starts_at,w.ends_at,s.timezone,a.request_expires_at,a.decision_reason,q.state AS queue_state,q.ticket_number,
      (SELECT count(*) FROM clinzo.queue_entry ahead WHERE ahead.queue_id=q.queue_id AND ahead.id<>q.id AND ahead.state IN ('waiting','called','in_service')
        AND (ahead.state IN ('called','in_service') OR ahead.order_key<q.order_key))::integer AS ahead_count,
      d.identity_id=actor AND d.active AND d.credential_status='verified' AS can_consult,
      CASE WHEN (d.identity_id=actor AND d.active AND d.credential_status='verified') OR EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id
        AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) THEN
        (SELECT n.body FROM clinzo.clinical_note n JOIN clinzo.consultation c ON c.id=n.consultation_id
          WHERE c.appointment_id=a.id AND n.kind='assessment' ORDER BY n.signed_at DESC LIMIT 1) ELSE NULL END AS assessment
    FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id JOIN clinzo.doctor d ON d.id=s.doctor_id
    JOIN clinzo.appointment_window w ON w.id=a.window_id JOIN clinzo.patient pat ON pat.id=a.patient_id
    LEFT JOIN clinzo.queue_entry q ON q.appointment_id=a.id
    WHERE (p_practice_id IS NOT NULL AND s.doctor_facility_id=p_practice_id) OR
      (p_practice_id IS NULL AND EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor
        AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND pat.archived_at IS NULL))
    ORDER BY w.starts_at DESC,a.id LIMIT 100
  ) x),'[]'::jsonb);
END $$;
