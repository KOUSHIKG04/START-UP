-- Storage policies run as the requesting role. A private, RLS-denied document
-- table cannot be consulted directly in the policy expression.
CREATE FUNCTION clinzo.reviewer_can_read_evidence(p_bucket text,p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT clinzo.company_reviewer_identity() IS NOT NULL AND EXISTS(
    SELECT 1 FROM clinzo.verification_document d
    WHERE d.bucket_id=p_bucket AND d.storage_path=p_path);
$$;
REVOKE ALL ON FUNCTION clinzo.reviewer_can_read_evidence(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION clinzo.reviewer_can_read_evidence(text,text) TO authenticated;
DROP POLICY company_reviewer_evidence_read ON storage.objects;
CREATE POLICY company_reviewer_evidence_read ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id IN ('doctor-licenses','driver-evidence','facility-evidence')
    AND clinzo.reviewer_can_read_evidence(bucket_id,name));

-- Portal users authenticate with verified email; doctor/driver app identities
-- remain phone-scoped. Both paths still require a linked identity and role.
CREATE OR REPLACE FUNCTION public.submit_my_facility_verification(p_facility_id uuid,p_registration_number text,
  p_certificate_path text,p_operating_licence_path text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_portal_identity(); case_id uuid;
BEGIN
  IF length(trim(coalesce(p_registration_number,''))) NOT BETWEEN 4 AND 120
    OR p_certificate_path IS NULL OR p_operating_licence_path IS NULL
    OR p_certificate_path=p_operating_licence_path THEN
    RAISE EXCEPTION 'Registration number and two distinct documents required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility f JOIN clinzo.organization_member m
      ON m.organization_id=f.organization_id AND (m.facility_id IS NULL OR m.facility_id=f.id)
      WHERE f.id=p_facility_id AND f.active AND m.identity_id=actor AND m.active
        AND m.role IN ('owner','facility_admin','organization_admin')) THEN
    RAISE EXCEPTION 'Facility owner or administrator required' USING ERRCODE='42501'; END IF;
  IF p_certificate_path NOT LIKE auth.uid()::text||'/%'
    OR p_operating_licence_path NOT LIKE auth.uid()::text||'/%'
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='facility-evidence' AND name=p_certificate_path)
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='facility-evidence' AND name=p_operating_licence_path) THEN
    RAISE EXCEPTION 'Upload both facility documents first' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.facility SET registration_number=trim(p_registration_number),verification_status='pending'
    WHERE id=p_facility_id;
  INSERT INTO clinzo.verification_case(facility_id) VALUES(p_facility_id)
    ON CONFLICT(facility_id) DO UPDATE SET updated_at=now() RETURNING id INTO case_id;
  PERFORM clinzo.add_verification_document(case_id,'registration_certificate','facility-evidence',p_certificate_path);
  PERFORM clinzo.add_verification_document(case_id,'operating_licence','facility-evidence',p_operating_licence_path);
  RETURN case_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_my_facility_verification(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_facility_verification(uuid,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_verification_case(p_subject_type text,p_subject_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; c clinzo.verification_case;
BEGIN
  actor:=CASE WHEN p_subject_type='facility' THEN clinzo.require_portal_identity()
    ELSE clinzo.require_identity() END;
  IF p_subject_type='doctor' THEN
    SELECT vc.* INTO c FROM clinzo.verification_case vc JOIN clinzo.doctor d ON d.id=vc.doctor_id
      WHERE d.id=p_subject_id AND d.identity_id=actor;
  ELSIF p_subject_type='driver' THEN
    SELECT vc.* INTO c FROM clinzo.verification_case vc JOIN clinzo.driver_registration_application a
      ON a.id=vc.driver_application_id WHERE a.id=p_subject_id AND a.identity_id=actor;
  ELSIF p_subject_type='facility' THEN
    SELECT vc.* INTO c FROM clinzo.verification_case vc JOIN clinzo.facility f ON f.id=vc.facility_id
      JOIN clinzo.organization_member m ON m.organization_id=f.organization_id
      WHERE f.id=p_subject_id AND m.identity_id=actor AND m.active
        AND (m.facility_id IS NULL OR m.facility_id=f.id);
  ELSE RAISE EXCEPTION 'Unknown subject type' USING ERRCODE='22023'; END IF;
  IF c.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id',c.id,'status',c.status,'documents',
    (SELECT coalesce(jsonb_agg(jsonb_build_object('kind',d.kind,'status',d.status,
      'rejection_reason',d.rejection_reason,'version',d.version) ORDER BY d.kind),'[]'::jsonb)
      FROM clinzo.verification_document d WHERE d.case_id=c.id AND d.status<>'superseded'));
END $$;
REVOKE ALL ON FUNCTION public.get_my_verification_case(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_verification_case(text,uuid) TO authenticated;
