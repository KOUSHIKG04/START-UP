-- Facility inventory becomes operational only after company approval.
-- The facility directory remains available during onboarding so the owner can
-- submit documents and read the review case.
CREATE OR REPLACE FUNCTION clinzo.can_access_facility_inventory(
  p_actor uuid, p_facility_id uuid, p_write boolean
) RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinzo.facility f
    JOIN clinzo.organization o ON o.id = f.organization_id
    JOIN clinzo.organization_member m ON m.organization_id = o.id
    JOIN clinzo.identity i ON i.id = m.identity_id
    WHERE f.id = p_facility_id AND f.active AND f.verification_status = 'verified'
      AND o.active AND o.kind IN ('care_provider', 'mixed')
      AND m.identity_id = p_actor AND m.active AND i.disabled_at IS NULL
      AND (m.facility_id IS NULL OR m.facility_id = f.id)
      AND (m.role IN ('owner', 'organization_admin', 'facility_admin')
        OR (NOT p_write AND m.role = 'receptionist'))
  );
$$;
REVOKE ALL ON FUNCTION clinzo.can_access_facility_inventory(uuid,uuid,boolean)
  FROM PUBLIC, anon, authenticated;
