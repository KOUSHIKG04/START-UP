-- A signed prescription can be read by the patient's own verified identity even
-- while the consultation remains active. Draft assessment, vitals, diagnosis,
-- and follow-up remain hidden until the consultation is signed.
CREATE OR REPLACE FUNCTION public.list_my_clinical_records() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(record_row)) FROM (
    SELECT a.public_code AS appointment_code,a.id AS appointment_id,
      c.started_at,c.signed_at,a.doctor_name_snapshot AS doctor_name,
      a.facility_name_snapshot AS facility_name,
      d.qualification AS doctor_qualification,
      (SELECT string_agg(sp.name, ', ' ORDER BY sp.name) FROM clinzo.doctor_specialty ds
        JOIN clinzo.specialty sp ON sp.id=ds.specialty_id WHERE ds.doctor_id=d.id AND sp.active) AS doctor_specialty,
      (SELECT round(avg(r.rating)::numeric,1)::text FROM clinzo.doctor_review r
        JOIN clinzo.appointment ra ON ra.id=r.appointment_id JOIN clinzo.session rs ON rs.id=ra.session_id
        WHERE rs.doctor_id=d.id AND r.moderation_state='published') AS doctor_rating,
      (SELECT count(*)::integer FROM clinzo.doctor_review r
        JOIN clinzo.appointment ra ON ra.id=r.appointment_id JOIN clinzo.session rs ON rs.id=ra.session_id
        WHERE rs.doctor_id=d.id AND r.moderation_state='published') AS doctor_review_count,
      (SELECT p.public_code FROM clinzo.prescription p
        JOIN LATERAL (SELECT revision.action FROM clinzo.prescription_revision revision
          WHERE revision.prescription_id=p.id ORDER BY revision.revision_number DESC LIMIT 1) latest
          ON latest.action <> 'discontinue'
        WHERE p.consultation_id=c.id
        ORDER BY p.created_at DESC LIMIT 1) AS prescription_code,
      (SELECT n.body FROM clinzo.clinical_note n WHERE c.status IN ('signed','amended') AND n.consultation_id=c.id
        AND n.kind='assessment' ORDER BY n.signed_at DESC LIMIT 1) AS assessment,
      coalesce((SELECT jsonb_agg(jsonb_build_object('description',d.description,'is_primary',d.is_primary)
        ORDER BY d.is_primary DESC,d.created_at)
        FROM clinzo.consultation_diagnosis d WHERE c.status IN ('signed','amended') AND d.consultation_id=c.id
          AND NOT EXISTS(SELECT 1 FROM clinzo.consultation_diagnosis newer WHERE newer.supersedes_id=d.id)), '[]'::jsonb) AS diagnoses,
      coalesce((SELECT jsonb_agg(jsonb_build_object('code',v.code,'value',v.value_numeric::text,'unit',v.unit_code,
        'measured_at',v.measured_at) ORDER BY v.measured_at,v.code)
        FROM clinzo.vital_observation v WHERE c.status IN ('signed','amended') AND v.consultation_id=c.id AND v.void_reason IS NULL
          AND NOT EXISTS(SELECT 1 FROM clinzo.vital_observation newer WHERE newer.supersedes_id=v.id)), '[]'::jsonb) AS vitals,
      coalesce((SELECT jsonb_agg(jsonb_build_object('medicine_name',item.medicine_name,'strength',item.strength,
        'form',item.form,'route',item.route,'instructions',item.instructions,
        'schedule',(SELECT jsonb_build_object('dose_quantity',phase.dose_quantity::text,'dose_unit',phase.dose_unit,
          'starts_on',phase.starts_on,'ends_on',phase.ends_on,
          'timings',coalesce((SELECT jsonb_agg(jsonb_build_object('meal_anchor',mt.meal_anchor,
            'meal_relation',mt.meal_relation) ORDER BY mt.sequence) FROM clinzo.medication_timing mt
            WHERE mt.phase_id=phase.id),'[]'::jsonb))
          FROM clinzo.medication_phase phase WHERE phase.prescription_item_id=item.id ORDER BY phase.phase_number LIMIT 1))
        ORDER BY item.line_number)
        FROM clinzo.prescription p
        JOIN LATERAL (SELECT r.id,r.action FROM clinzo.prescription_revision r WHERE r.prescription_id=p.id
          ORDER BY r.revision_number DESC LIMIT 1) latest ON latest.action <> 'discontinue'
        JOIN clinzo.prescription_item item ON item.revision_id=latest.id WHERE p.consultation_id=c.id), '[]'::jsonb) AS medicines,
      (SELECT jsonb_build_object('recommended_date',f.recommended_date,'reason',f.reason,'status',f.status)
        FROM clinzo.followup_recommendation f WHERE c.status IN ('signed','amended') AND f.consultation_id=c.id AND f.status='active'
        ORDER BY f.created_at DESC LIMIT 1) AS followup
    FROM clinzo.consultation c JOIN clinzo.appointment a ON a.id=c.appointment_id JOIN clinzo.doctor d ON d.id=c.doctor_id
    WHERE (c.status IN ('signed','amended') OR (c.status='active' AND EXISTS (
      SELECT 1 FROM clinzo.prescription issued
      JOIN LATERAL (SELECT revision.action FROM clinzo.prescription_revision revision
        WHERE revision.prescription_id=issued.id ORDER BY revision.revision_number DESC LIMIT 1) latest
        ON latest.action <> 'discontinue'
      WHERE issued.consultation_id=c.id))) AND a.patient_id=c.patient_id
      AND EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
        WHERE pa.patient_id=c.patient_id AND pa.identity_id=actor AND pa.relationship='self'
          AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL)
    ORDER BY coalesce(c.signed_at,c.started_at) DESC,c.id DESC LIMIT 100
  ) record_row), '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.list_my_clinical_records() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_my_clinical_records() TO authenticated;
