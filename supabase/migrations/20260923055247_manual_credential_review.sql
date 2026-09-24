-- Trusted operator procedure for a manually completed review. No app role can
-- execute it. A later company reviewer app needs its own scoped authorization.
CREATE FUNCTION clinzo.record_manual_credential_review(
  p_kind text, p_subject_id uuid, p_decision text,
  p_reviewer_reference text, p_evidence_reference text
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE org uuid; affected integer;
BEGIN
  IF p_kind NOT IN ('doctor','driver') OR p_subject_id IS NULL
    OR p_decision NOT IN ('verified','suspended')
    OR length(trim(coalesce(p_reviewer_reference,''))) NOT BETWEEN 3 AND 120
    OR length(trim(coalesce(p_evidence_reference,''))) NOT BETWEEN 3 AND 240 THEN
    RAISE EXCEPTION 'Review kind, decision and references are required' USING ERRCODE='22023';
  END IF;
  IF p_kind='doctor' THEN
    UPDATE clinzo.doctor SET credential_status=p_decision
      WHERE id=p_subject_id AND active RETURNING 1 INTO affected;
  ELSE
    UPDATE clinzo.driver SET verification_status=p_decision
      WHERE id=p_subject_id AND active RETURNING 1 INTO affected;
    SELECT organization_id INTO org FROM clinzo.driver WHERE id=p_subject_id;
  END IF;
  IF affected IS NULL THEN RAISE EXCEPTION 'Active subject not found' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.audit_log(actor_kind,action,resource_type,resource_id,organization_id,request_id,outcome,metadata)
    VALUES('system','credential.manual_review',p_kind,p_subject_id,org,gen_random_uuid(),'allowed',
      jsonb_build_object('decision',p_decision,'reviewer_reference',trim(p_reviewer_reference),
        'evidence_reference',trim(p_evidence_reference)));
END $$;
REVOKE ALL ON FUNCTION clinzo.record_manual_credential_review(text,uuid,text,text,text)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION clinzo.record_manual_credential_review(text,uuid,text,text,text) IS
  'Execute only from trusted database administration after external manual evidence review; never expose to apps.';
