-- PL/pgSQL interprets an unqualified case_id in a verification_document
-- SELECT as both the local variable and the table column. Give local values
-- distinct names so an approved degree can be reopened for a new claim.
CREATE OR REPLACE FUNCTION clinzo.reopen_degree_on_qualification_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_degree_document clinzo.verification_document; v_case_id uuid;
BEGIN
  IF NEW.claimed_qualification IS NOT DISTINCT FROM OLD.claimed_qualification THEN RETURN NEW; END IF;
  SELECT c.id INTO v_case_id FROM clinzo.verification_case c
    WHERE c.doctor_id = NEW.doctor_id FOR UPDATE;
  SELECT vd.* INTO v_degree_document FROM clinzo.verification_document vd
    WHERE vd.case_id = v_case_id AND vd.kind = 'medical_degree'
    ORDER BY vd.version DESC LIMIT 1 FOR UPDATE;
  IF v_degree_document.status = 'approved' THEN
    UPDATE clinzo.verification_document SET status = 'pending', reviewed_at = NULL,
      reviewer_id = NULL, rejection_reason = NULL WHERE id = v_degree_document.id;
    UPDATE clinzo.verification_case SET status = 'under_review', reviewed_at = NULL
      WHERE id = v_case_id;
    INSERT INTO clinzo.verification_event(case_id, document_id, action)
      VALUES(v_case_id, v_degree_document.id, 'resubmitted');
  END IF;
  RETURN NEW;
END $$;
