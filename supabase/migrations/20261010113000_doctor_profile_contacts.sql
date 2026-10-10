CREATE OR REPLACE FUNCTION public.get_my_doctor_profile() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', d.id, 'full_name', d.full_name, 'bio', d.bio, 'profile_photo_path', d.profile_photo_path,
    'contact_phone', dc.contact_phone, 'contact_email', dc.contact_email,
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

REVOKE ALL ON FUNCTION public.get_my_doctor_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_doctor_profile() TO authenticated;
