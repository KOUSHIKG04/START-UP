-- Resolve PL/pgSQL variable/column ambiguity during company case finalization.
-- Document approvals already recorded remain unchanged.
CREATE OR REPLACE FUNCTION public.finalize_company_verification(p_case_id uuid,p_driver_details jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.company_reviewer_identity(); c clinzo.verification_case;
  required_kinds text[]; v_required_kind text; app clinzo.driver_registration_application;
  org_id uuid; driver_id uuid; vehicle_id uuid; capability_id uuid;
  license_expiry date; inspection_expiry date; approved_until timestamptz;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Company reviewer required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM clinzo.verification_case WHERE id=p_case_id FOR UPDATE;
  IF c.id IS NULL OR c.status NOT IN ('pending','under_review') THEN
    RAISE EXCEPTION 'Case is not ready for verification' USING ERRCODE='22023'; END IF;
  required_kinds:=CASE WHEN c.doctor_id IS NOT NULL THEN ARRAY['medical_registration','medical_degree']
    WHEN c.facility_id IS NOT NULL THEN ARRAY['registration_certificate','operating_licence']
    ELSE ARRAY['aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images'] END;
  FOREACH v_required_kind IN ARRAY required_kinds LOOP
    IF NOT EXISTS(SELECT 1 FROM clinzo.verification_document d WHERE d.case_id=c.id AND d.kind=v_required_kind
      AND d.status='approved' AND NOT EXISTS(SELECT 1 FROM clinzo.verification_document newer
        WHERE newer.case_id=c.id AND newer.kind=v_required_kind AND newer.version>d.version)) THEN
      RAISE EXCEPTION 'Required document not approved: %',v_required_kind USING ERRCODE='22023'; END IF;
  END LOOP;
  IF c.doctor_id IS NOT NULL THEN
    UPDATE clinzo.doctor SET credential_status='verified' WHERE id=c.doctor_id AND active;
  ELSIF c.facility_id IS NOT NULL THEN
    UPDATE clinzo.facility SET verification_status='verified' WHERE id=c.facility_id AND active;
  ELSE
    SELECT * INTO app FROM clinzo.driver_registration_application WHERE id=c.driver_application_id FOR UPDATE;
    IF app.status<>'submitted' OR jsonb_typeof(p_driver_details) IS DISTINCT FROM 'object'
      OR length(trim(coalesce(p_driver_details->>'license_number',''))) NOT BETWEEN 4 AND 80
      OR length(trim(coalesce(p_driver_details->>'equipment_notes',''))) NOT BETWEEN 10 AND 1000
      OR length(trim(coalesce(p_driver_details->>'crew_notes',''))) NOT BETWEEN 10 AND 1000 THEN
      RAISE EXCEPTION 'Reviewed driver licence, equipment and crew details required' USING ERRCODE='22023'; END IF;
    license_expiry:=(p_driver_details->>'license_expires_on')::date;
    inspection_expiry:=(p_driver_details->>'inspection_expires_on')::date;
    approved_until:=(p_driver_details->>'capability_approved_until')::timestamptz;
    IF license_expiry<=current_date OR inspection_expiry<=current_date
      OR approved_until<=now() OR approved_until>now()+interval '1 year'
      OR approved_until>inspection_expiry::timestamptz THEN
      RAISE EXCEPTION 'Licence, inspection and capability approval must be current' USING ERRCODE='22023'; END IF;
    SELECT id INTO capability_id FROM clinzo.capability WHERE code=app.capability_code;
    IF capability_id IS NULL THEN RAISE EXCEPTION 'Ambulance capability missing' USING ERRCODE='22023'; END IF;
    INSERT INTO clinzo.organization(public_code,name,kind)
      VALUES('ORG-'||gen_random_uuid()::text,app.full_name||' Ambulance','ambulance_operator') RETURNING id INTO org_id;
    INSERT INTO clinzo.driver(identity_id,organization_id,public_code,full_name,license_number,
      license_expires_on,verification_status,date_of_birth,city,contact_phone,profile_photo_path,verification_consent_at)
      VALUES(app.identity_id,org_id,'DRV-'||gen_random_uuid()::text,app.full_name,
        trim(p_driver_details->>'license_number'),license_expiry,'verified',app.date_of_birth,
        app.city,app.contact_phone,app.profile_photo_path,app.consent_at) RETURNING id INTO driver_id;
    INSERT INTO clinzo.vehicle(organization_id,registration_number,display_label,inspection_expires_on)
      VALUES(org_id,app.registration_number,coalesce(nullif(trim(p_driver_details->>'vehicle_label'),''),app.registration_number),
        inspection_expiry) RETURNING id INTO vehicle_id;
    INSERT INTO clinzo.vehicle_review_request(driver_id,vehicle_id,capability_id,equipment_notes,crew_notes,
      status,reviewed_at,approved_until,reviewer_reference,evidence_reference,review_note)
      VALUES(driver_id,vehicle_id,capability_id,trim(p_driver_details->>'equipment_notes'),
        trim(p_driver_details->>'crew_notes'),'approved',now(),approved_until,actor::text,
        c.id::text,'Company document verification');
    INSERT INTO clinzo.vehicle_capability(vehicle_id,capability_id,verified_at,expires_at)
      VALUES(vehicle_id,capability_id,now(),approved_until);
    INSERT INTO clinzo.driver_document(driver_id,vehicle_id,kind,storage_path)
      SELECT driver_id,vehicle_id,d.kind,d.storage_path FROM clinzo.verification_document d
      WHERE d.case_id=c.id AND d.status='approved';
    UPDATE clinzo.driver_registration_application SET status='approved' WHERE id=app.id;
  END IF;
  UPDATE clinzo.verification_case SET status='verified',reviewed_at=now() WHERE id=c.id;
  INSERT INTO clinzo.verification_event(case_id,action,actor_id) VALUES(c.id,'verified',actor);
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','verification.case_verified','verification_case',c.id,gen_random_uuid(),
      'allowed',jsonb_build_object('subject_type',CASE WHEN c.doctor_id IS NOT NULL THEN 'doctor'
        WHEN c.facility_id IS NOT NULL THEN 'facility' ELSE 'driver' END));
  PERFORM clinzo.emit_verification_notice(c.id,'verified');
  RETURN public.get_company_verification_case(c.id);
END $$;


REVOKE ALL ON FUNCTION public.finalize_company_verification(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_company_verification(uuid,jsonb) TO authenticated;
