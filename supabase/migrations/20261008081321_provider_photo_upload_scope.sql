-- Public provider images are uploadable only by an existing doctor or facility manager.
CREATE FUNCTION public.can_upload_provider_photo() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM clinzo.identity i
    WHERE i.issuer = 'supabase' AND i.subject = auth.uid()::text AND i.disabled_at IS NULL
      AND (EXISTS (SELECT 1 FROM clinzo.doctor d WHERE d.identity_id = i.id AND d.active)
        OR EXISTS (SELECT 1 FROM clinzo.organization_member m
          WHERE m.identity_id = i.id AND m.active
            AND m.role IN ('owner', 'facility_admin', 'organization_admin')))
  );
$$;
REVOKE ALL ON FUNCTION public.can_upload_provider_photo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_upload_provider_photo() TO authenticated;

DROP POLICY provider_profile_photo_upload ON storage.objects;
CREATE POLICY provider_profile_photo_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-profile-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (SELECT public.can_upload_provider_photo()));
