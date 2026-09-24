-- A signed consultation is visible only to the patient's own verified identity.
-- Draft notes and internal identifiers are deliberately absent from this projection.
CREATE FUNCTION public.list_my_clinical_records() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(record_row)) FROM (
    SELECT a.public_code AS appointment_code,a.id AS appointment_id,
      c.started_at,c.signed_at,a.doctor_name_snapshot AS doctor_name,
      a.facility_name_snapshot AS facility_name,
      (SELECT n.body FROM clinzo.clinical_note n WHERE n.consultation_id=c.id
        AND n.kind='assessment' ORDER BY n.signed_at DESC LIMIT 1) AS assessment,
      coalesce((SELECT jsonb_agg(jsonb_build_object('description',d.description,'is_primary',d.is_primary)
        ORDER BY d.is_primary DESC,d.created_at)
        FROM clinzo.consultation_diagnosis d WHERE d.consultation_id=c.id
          AND NOT EXISTS(SELECT 1 FROM clinzo.consultation_diagnosis newer WHERE newer.supersedes_id=d.id)), '[]'::jsonb) AS diagnoses,
      coalesce((SELECT jsonb_agg(jsonb_build_object('code',v.code,'value',v.value_numeric::text,'unit',v.unit_code,
        'measured_at',v.measured_at) ORDER BY v.measured_at,v.code)
        FROM clinzo.vital_observation v WHERE v.consultation_id=c.id AND v.void_reason IS NULL
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
        FROM clinzo.followup_recommendation f WHERE f.consultation_id=c.id AND f.status='active'
        ORDER BY f.created_at DESC LIMIT 1) AS followup
    FROM clinzo.consultation c JOIN clinzo.appointment a ON a.id=c.appointment_id
    WHERE c.status IN ('signed','amended') AND a.patient_id=c.patient_id
      AND EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
        WHERE pa.patient_id=c.patient_id AND pa.identity_id=actor AND pa.relationship='self'
          AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL)
    ORDER BY c.signed_at DESC,c.id DESC LIMIT 100
  ) record_row), '[]'::jsonb);
END $$;

CREATE FUNCTION public.record_consultation_diagnosis(p_appointment_id uuid,p_description text,p_is_primary boolean DEFAULT true) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); c clinzo.consultation; diagnosis_id uuid;
BEGIN
  IF p_description IS NULL OR length(trim(p_description)) NOT BETWEEN 2 AND 1000 OR p_is_primary IS NULL THEN
    RAISE EXCEPTION 'Invalid diagnosis' USING ERRCODE='22023'; END IF;
  SELECT c0.* INTO c FROM clinzo.consultation c0 WHERE c0.appointment_id=p_appointment_id FOR UPDATE;
  IF c.id IS NULL OR c.status <> 'active' OR NOT EXISTS(SELECT 1 FROM clinzo.doctor d
    WHERE d.id=c.doctor_id AND d.identity_id=actor AND d.active AND d.credential_status='verified') THEN
    RAISE EXCEPTION 'Active consultation access required' USING ERRCODE='42501'; END IF;
  IF p_is_primary AND EXISTS(SELECT 1 FROM clinzo.consultation_diagnosis d WHERE d.consultation_id=c.id AND d.is_primary
    AND NOT EXISTS(SELECT 1 FROM clinzo.consultation_diagnosis newer WHERE newer.supersedes_id=d.id)) THEN
    RAISE EXCEPTION 'A primary diagnosis already exists' USING ERRCODE='23505'; END IF;
  INSERT INTO clinzo.consultation_diagnosis(consultation_id,description,is_primary,recorded_by)
    VALUES(c.id,trim(p_description),p_is_primary,actor) RETURNING id INTO diagnosis_id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','consultation.diagnosis_recorded','consultation',c.id,gen_random_uuid(),'allowed','{}');
  RETURN diagnosis_id;
END $$;

CREATE FUNCTION public.issue_consultation_prescription(p_appointment_id uuid,p_items jsonb,p_timezone text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); c clinzo.consultation; prescription_id uuid; revision_id uuid;
  item_id uuid; phase_id uuid; medicine jsonb; timing jsonb; item_number integer := 0; timing_number integer;
  first_day date; last_day date; dose numeric;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20
    OR p_timezone IS NULL OR length(p_timezone) NOT BETWEEN 1 AND 64
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone) THEN
    RAISE EXCEPTION 'Invalid prescription details' USING ERRCODE='22023'; END IF;
  SELECT c0.* INTO c FROM clinzo.consultation c0 WHERE c0.appointment_id=p_appointment_id FOR UPDATE;
  IF c.id IS NULL OR c.status <> 'active' OR NOT EXISTS(SELECT 1 FROM clinzo.doctor d
    WHERE d.id=c.doctor_id AND d.identity_id=actor AND d.active AND d.credential_status='verified') THEN
    RAISE EXCEPTION 'Active consultation access required' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.prescription p WHERE p.consultation_id=c.id) THEN
    RAISE EXCEPTION 'Prescription already issued for this consultation' USING ERRCODE='23505'; END IF;
  FOR medicine IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    item_number := item_number + 1;
    IF jsonb_typeof(medicine) IS DISTINCT FROM 'object'
      OR length(trim(coalesce(medicine->>'medicine_name',''))) NOT BETWEEN 2 AND 160
      OR length(trim(coalesce(medicine->>'strength',''))) NOT BETWEEN 1 AND 80
      OR length(trim(coalesce(medicine->>'form',''))) NOT BETWEEN 1 AND 80
      OR length(trim(coalesce(medicine->>'route',''))) NOT BETWEEN 1 AND 80
      OR length(trim(coalesce(medicine->>'instructions',''))) NOT BETWEEN 1 AND 1000
      OR jsonb_typeof(medicine->'timings') IS DISTINCT FROM 'array'
      OR jsonb_array_length(medicine->'timings') NOT BETWEEN 1 AND 6 THEN
      RAISE EXCEPTION 'Invalid medicine details' USING ERRCODE='22023'; END IF;
    first_day := (medicine->>'starts_on')::date;
    last_day := (medicine->>'ends_on')::date;
    dose := (medicine->>'dose_quantity')::numeric;
    IF first_day IS NULL OR last_day IS NULL OR first_day < current_date-interval '1 day'
      OR last_day < first_day OR last_day > first_day+interval '365 days'
      OR dose IS NULL OR dose <= 0 OR dose > 1000
      OR length(trim(coalesce(medicine->>'dose_unit',''))) NOT BETWEEN 1 AND 40 THEN
      RAISE EXCEPTION 'Invalid medicine schedule' USING ERRCODE='22023'; END IF;
  END LOOP;
  INSERT INTO clinzo.prescription(consultation_id,public_code)
    VALUES(c.id,'RX-'||gen_random_uuid()::text) RETURNING id INTO prescription_id;
  INSERT INTO clinzo.prescription_revision(prescription_id,revision_number,signed_by,signed_at,action)
    VALUES(prescription_id,1,actor,now(),'issue') RETURNING id INTO revision_id;
  item_number := 0;
  FOR medicine IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    item_number := item_number + 1;
    INSERT INTO clinzo.prescription_item(revision_id,line_number,medicine_name,strength,form,route,instructions)
      VALUES(revision_id,item_number,trim(medicine->>'medicine_name'),trim(medicine->>'strength'),
        trim(medicine->>'form'),trim(medicine->>'route'),trim(medicine->>'instructions')) RETURNING id INTO item_id;
    INSERT INTO clinzo.medication_phase(prescription_item_id,phase_number,dose_quantity,dose_unit,starts_on,ends_on,frequency_kind,timezone)
      VALUES(item_id,1,(medicine->>'dose_quantity')::numeric,trim(medicine->>'dose_unit'),
        (medicine->>'starts_on')::date,(medicine->>'ends_on')::date,'daily_times',p_timezone) RETURNING id INTO phase_id;
    timing_number := 0;
    FOR timing IN SELECT value FROM jsonb_array_elements(medicine->'timings') LOOP
      timing_number := timing_number + 1;
      IF jsonb_typeof(timing) IS DISTINCT FROM 'object'
        OR (timing->>'meal_anchor') NOT IN ('breakfast','lunch','dinner','bedtime')
        OR (timing->>'meal_relation') NOT IN ('before','with','after','independent') THEN
        RAISE EXCEPTION 'Invalid medication timing' USING ERRCODE='22023'; END IF;
      INSERT INTO clinzo.medication_timing(phase_id,sequence,meal_anchor,meal_relation)
        VALUES(phase_id,timing_number,timing->>'meal_anchor',timing->>'meal_relation');
    END LOOP;
  END LOOP;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    VALUES('prescription.issued','prescription',prescription_id,1,actor,gen_random_uuid(),jsonb_build_object('consultation_id',c.id));
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','prescription.issued','prescription',prescription_id,gen_random_uuid(),'allowed','{}');
  RETURN prescription_id;
END $$;

CREATE FUNCTION public.recommend_consultation_followup(p_appointment_id uuid,p_date date,p_timezone text,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); c clinzo.consultation; followup_id uuid;
BEGIN
  IF p_date IS NULL OR p_date <= current_date OR p_date > current_date+interval '2 years'
    OR p_timezone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone)
    OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 2 AND 1000 THEN
    RAISE EXCEPTION 'Invalid follow-up recommendation' USING ERRCODE='22023'; END IF;
  SELECT c0.* INTO c FROM clinzo.consultation c0 WHERE c0.appointment_id=p_appointment_id FOR UPDATE;
  IF c.id IS NULL OR c.status <> 'active' OR NOT EXISTS(SELECT 1 FROM clinzo.doctor d
    WHERE d.id=c.doctor_id AND d.identity_id=actor AND d.active AND d.credential_status='verified') THEN
    RAISE EXCEPTION 'Active consultation access required' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.followup_recommendation f WHERE f.consultation_id=c.id AND f.status='active') THEN
    RAISE EXCEPTION 'An active follow-up recommendation already exists' USING ERRCODE='23505'; END IF;
  INSERT INTO clinzo.followup_recommendation(consultation_id,recommended_by,recommended_date,timezone,reason,status)
    VALUES(c.id,actor,p_date,p_timezone,trim(p_reason),'active') RETURNING id INTO followup_id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','consultation.followup_recommended','consultation',c.id,gen_random_uuid(),'allowed','{}');
  RETURN followup_id;
END $$;

CREATE FUNCTION public.record_consultation_vital(p_appointment_id uuid,p_code text,p_value numeric,p_unit text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); c clinzo.consultation; vital_id uuid;
BEGIN
  IF p_code NOT IN ('temperature_c','pulse_bpm','spo2_percent','systolic_mmhg','diastolic_mmhg','weight_kg','height_cm')
    OR p_value IS NULL OR p_value <= 0 OR p_value > 10000
    OR p_unit IS NULL OR length(trim(p_unit)) NOT BETWEEN 1 AND 24 THEN
    RAISE EXCEPTION 'Invalid vital observation' USING ERRCODE='22023'; END IF;
  SELECT c0.* INTO c FROM clinzo.consultation c0 WHERE c0.appointment_id=p_appointment_id FOR UPDATE;
  IF c.id IS NULL OR c.status <> 'active' OR NOT EXISTS(SELECT 1 FROM clinzo.doctor d
    WHERE d.id=c.doctor_id AND d.identity_id=actor AND d.active AND d.credential_status='verified') THEN
    RAISE EXCEPTION 'Active consultation access required' USING ERRCODE='42501'; END IF;
  INSERT INTO clinzo.vital_observation(consultation_id,code,value_numeric,unit_code,measured_at,recorded_by)
    VALUES(c.id,p_code,p_value,trim(p_unit),now(),actor) RETURNING id INTO vital_id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','consultation.vital_recorded','consultation',c.id,gen_random_uuid(),'allowed',jsonb_build_object('code',p_code));
  RETURN vital_id;
END $$;

REVOKE ALL ON FUNCTION public.list_my_clinical_records(),public.record_consultation_vital(uuid,text,numeric,text),
  public.record_consultation_diagnosis(uuid,text,boolean),public.issue_consultation_prescription(uuid,jsonb,text),
  public.recommend_consultation_followup(uuid,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_my_clinical_records(),public.record_consultation_vital(uuid,text,numeric,text),
  public.record_consultation_diagnosis(uuid,text,boolean),public.issue_consultation_prescription(uuid,jsonb,text),
  public.recommend_consultation_followup(uuid,date,text,text) TO authenticated;
