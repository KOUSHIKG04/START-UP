-- Doctor verification includes the operating licence for a single owned clinic.
-- Never override suspension, a separate facility review, or ambiguous ownership.
CREATE FUNCTION clinzo.sync_verified_solo_clinic(p_case_id uuid) RETURNS void
LANGUAGE sql SET search_path='' AS $$
  UPDATE clinzo.facility f SET verification_status='verified'
  FROM clinzo.verification_case c
  JOIN clinzo.doctor d ON d.id=c.doctor_id
  JOIN clinzo.doctor_facility p ON p.doctor_id=d.id AND p.active
  JOIN clinzo.organization_member m ON m.identity_id=d.identity_id AND m.role='owner' AND m.active
  JOIN clinzo.organization o ON o.id=m.organization_id AND o.active
  WHERE c.id=p_case_id AND c.status='verified' AND d.active AND d.credential_status='verified'
    AND f.id=p.facility_id AND f.organization_id=o.id AND f.kind='clinic' AND f.active
    AND f.verification_status='pending' AND (m.facility_id IS NULL OR m.facility_id=f.id)
    AND NOT EXISTS(SELECT 1 FROM clinzo.verification_case separate WHERE separate.facility_id=f.id)
    AND 1=(SELECT count(*) FROM clinzo.doctor_facility other_practice
      JOIN clinzo.facility other_clinic ON other_clinic.id=other_practice.facility_id
      WHERE other_practice.doctor_id=d.id AND other_practice.active AND other_clinic.active AND other_clinic.kind='clinic'
      AND EXISTS(SELECT 1 FROM clinzo.organization_member owner_member
        WHERE owner_member.identity_id=d.identity_id AND owner_member.organization_id=other_clinic.organization_id
        AND owner_member.role='owner' AND owner_member.active
        AND (owner_member.facility_id IS NULL OR owner_member.facility_id=other_clinic.id)))
    AND NOT EXISTS (
      SELECT 1 FROM unnest(ARRAY['medical_registration','medical_degree','clinic_operating_licence']) required(kind)
      WHERE NOT EXISTS(SELECT 1 FROM clinzo.verification_document doc
        WHERE doc.case_id=c.id AND doc.kind=required.kind AND doc.status='approved'
        AND NOT EXISTS(SELECT 1 FROM clinzo.verification_document newer
          WHERE newer.case_id=c.id AND newer.kind=doc.kind AND newer.version>doc.version))
    );
$$;
REVOKE ALL ON FUNCTION clinzo.sync_verified_solo_clinic(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.sync_solo_clinic_after_verification() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  PERFORM clinzo.sync_verified_solo_clinic(NEW.id);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.sync_solo_clinic_after_verification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_solo_clinic_after_verification
AFTER UPDATE OF status ON clinzo.verification_case
FOR EACH ROW WHEN (NEW.status='verified' AND NEW.doctor_id IS NOT NULL)
EXECUTE FUNCTION clinzo.sync_solo_clinic_after_verification();

-- Repair previously finalized cases using exactly the same evidence checks.
DO $$
DECLARE case_id uuid;
BEGIN
  FOR case_id IN SELECT id FROM clinzo.verification_case WHERE doctor_id IS NOT NULL AND status='verified' LOOP
    PERFORM clinzo.sync_verified_solo_clinic(case_id);
  END LOOP;
END $$;
