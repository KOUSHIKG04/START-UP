-- Account photos are private; provider logos/portraits may be shown in discovery.
ALTER TABLE clinzo.patient ADD COLUMN profile_photo_path text;
ALTER TABLE clinzo.doctor ADD COLUMN profile_photo_path text;
ALTER TABLE clinzo.facility ADD COLUMN logo_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('patient-profile-photos', 'patient-profile-photos', false, 5242880, ARRAY['image/jpeg', 'image/png']),
  ('provider-profile-photos', 'provider-profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY patient_profile_photo_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-profile-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY patient_profile_photo_read_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-profile-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY provider_profile_photo_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-profile-photos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE FUNCTION public.set_my_profile_photo(p_kind text, p_path text, p_facility_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF auth.uid() IS NULL OR p_path IS NULL OR length(p_path) > 500
     OR p_path NOT LIKE auth.uid()::text || '/%'
     OR p_path !~ '^[0-9a-f-]+/[0-9a-f-]+\.(jpg|png)$' THEN
    RAISE EXCEPTION 'Invalid profile photo path' USING ERRCODE = '22023';
  END IF;
  IF p_kind = 'patient' THEN
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'patient-profile-photos' AND name = p_path) THEN
      RAISE EXCEPTION 'Upload your photo first' USING ERRCODE = '22023';
    END IF;
    UPDATE clinzo.patient p SET profile_photo_path = p_path
    WHERE EXISTS (SELECT 1 FROM clinzo.patient_access pa
      WHERE pa.patient_id = p.id AND pa.identity_id = actor AND pa.relationship = 'self'
        AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL);
  ELSIF p_kind = 'doctor' THEN
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'provider-profile-photos' AND name = p_path) THEN
      RAISE EXCEPTION 'Upload your photo first' USING ERRCODE = '22023';
    END IF;
    UPDATE clinzo.doctor SET profile_photo_path = p_path WHERE identity_id = actor AND active;
  ELSIF p_kind = 'facility' THEN
    IF p_facility_id IS NULL OR NOT EXISTS (SELECT 1 FROM storage.objects
      WHERE bucket_id = 'provider-profile-photos' AND name = p_path) THEN
      RAISE EXCEPTION 'Upload your facility logo first' USING ERRCODE = '22023';
    END IF;
    UPDATE clinzo.facility f SET logo_path = p_path
    WHERE f.id = p_facility_id AND EXISTS (SELECT 1 FROM clinzo.organization_member m
      WHERE m.identity_id = actor AND m.active AND m.organization_id = f.organization_id
        AND (m.facility_id IS NULL OR m.facility_id = f.id)
        AND m.role IN ('owner', 'facility_admin', 'organization_admin'));
  ELSE
    RAISE EXCEPTION 'Unknown profile photo kind' USING ERRCODE = '22023';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile access denied' USING ERRCODE = '42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_my_profile_photo(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_profile_photo(text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_patient_profile_detail() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('id',p.id,'full_name',p.full_name,'age_years',p.reported_age_years,
    'age_recorded_on',p.reported_age_on,'gender',p.gender_identity,'blood_group',p.blood_group,
    'email',p.contact_email,'address',p.home_address,'profile_photo_path',p.profile_photo_path)
  FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    JOIN clinzo.identity i ON i.id=pa.identity_id
  WHERE auth.uid() IS NOT NULL AND i.issuer='supabase' AND i.subject=auth.uid()::text
    AND i.disabled_at IS NULL AND pa.relationship='self' AND pa.verified_at IS NOT NULL
    AND pa.revoked_at IS NULL AND p.archived_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_doctor_profile() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', d.id, 'full_name', d.full_name, 'bio', d.bio, 'profile_photo_path', d.profile_photo_path,
    'qualification', d.qualification, 'qualification_claim', dc.claimed_qualification,
    'registration_authority', d.registration_authority, 'registration_number', d.registration_number,
    'practice_started_on', d.practice_started_on, 'credential_status', d.credential_status,
    'booking_timezone', d.booking_timezone,
    'languages', (SELECT coalesce(jsonb_agg(dl.language_code ORDER BY dl.language_code), '[]'::jsonb)
      FROM clinzo.doctor_language dl WHERE dl.doctor_id = d.id),
    'specialties', (SELECT coalesce(jsonb_agg(jsonb_build_object('code', sp.code, 'name', sp.name) ORDER BY sp.name), '[]'::jsonb)
      FROM clinzo.doctor_specialty ds JOIN clinzo.specialty sp ON sp.id = ds.specialty_id
      WHERE ds.doctor_id = d.id AND sp.active),
    'facilities', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'practice_id', df.id, 'facility_id', f.id, 'facility_name', f.name, 'facility_kind', f.kind,
      'address', f.address, 'active', df.active AND f.active) ORDER BY f.name), '[]'::jsonb)
      FROM clinzo.doctor_facility df JOIN clinzo.facility f ON f.id = df.facility_id WHERE df.doctor_id = d.id)
  ) INTO result FROM clinzo.doctor d
  LEFT JOIN clinzo.doctor_onboarding_claim dc ON dc.doctor_id = d.id
  WHERE d.identity_id = actor AND d.active;
  RETURN result;
END $$;
