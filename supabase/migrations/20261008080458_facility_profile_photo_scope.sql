-- Facility owners use a verified portal email identity, unlike mobile profiles.
CREATE OR REPLACE FUNCTION public.set_my_profile_photo(p_kind text, p_path text, p_facility_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid;
BEGIN
  IF auth.uid() IS NULL OR p_path IS NULL OR length(p_path) > 500
     OR p_path NOT LIKE auth.uid()::text || '/%'
     OR p_path !~ '^[0-9a-f-]+/[0-9a-f-]+\.(jpg|png)$' THEN
    RAISE EXCEPTION 'Invalid profile photo path' USING ERRCODE = '22023';
  END IF;
  IF p_kind = 'facility' THEN
    actor := clinzo.require_portal_identity();
    IF p_facility_id IS NULL OR NOT EXISTS (SELECT 1 FROM storage.objects
      WHERE bucket_id = 'provider-profile-photos' AND name = p_path) THEN
      RAISE EXCEPTION 'Upload your facility logo first' USING ERRCODE = '22023';
    END IF;
    UPDATE clinzo.facility f SET logo_path = p_path
    WHERE f.id = p_facility_id AND EXISTS (SELECT 1 FROM clinzo.organization_member m
      WHERE m.identity_id = actor AND m.active AND m.organization_id = f.organization_id
        AND (m.facility_id IS NULL OR m.facility_id = f.id)
        AND m.role IN ('owner', 'facility_admin', 'organization_admin'));
  ELSIF p_kind = 'patient' THEN
    actor := clinzo.require_identity();
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'patient-profile-photos' AND name = p_path) THEN
      RAISE EXCEPTION 'Upload your photo first' USING ERRCODE = '22023';
    END IF;
    UPDATE clinzo.patient p SET profile_photo_path = p_path
    WHERE EXISTS (SELECT 1 FROM clinzo.patient_access pa
      WHERE pa.patient_id = p.id AND pa.identity_id = actor AND pa.relationship = 'self'
        AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL);
  ELSIF p_kind = 'doctor' THEN
    actor := clinzo.require_identity();
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'provider-profile-photos' AND name = p_path) THEN
      RAISE EXCEPTION 'Upload your photo first' USING ERRCODE = '22023';
    END IF;
    UPDATE clinzo.doctor SET profile_photo_path = p_path WHERE identity_id = actor AND active;
  ELSE
    RAISE EXCEPTION 'Unknown profile photo kind' USING ERRCODE = '22023';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile access denied' USING ERRCODE = '42501'; END IF;
END $$;
