-- Unverified claims are private and never enter public discovery.
CREATE TABLE clinzo.doctor_onboarding_claim (
  doctor_id uuid PRIMARY KEY REFERENCES clinzo.doctor(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reported_age_years smallint NOT NULL CHECK (reported_age_years BETWEEN 18 AND 100),
  reported_gender text NOT NULL CHECK (reported_gender IN ('Male','Female','Other','Prefer not to say')),
  claimed_specialty text NOT NULL CHECK (length(claimed_specialty) BETWEEN 2 AND 120),
  claimed_language text NOT NULL CHECK (length(claimed_language) BETWEEN 2 AND 80),
  claimed_facility_name text NOT NULL CHECK (length(claimed_facility_name) BETWEEN 2 AND 160),
  contact_email text,
  contact_phone text NOT NULL,
  license_storage_path text NOT NULL
);
ALTER TABLE clinzo.doctor_onboarding_claim ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.doctor_onboarding_claim FROM PUBLIC,anon,authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('doctor-licenses','doctor-licenses',false,10485760,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT(id) DO NOTHING;
CREATE POLICY "doctor_license_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK(bucket_id='doctor-licenses' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "doctor_license_read_own" ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id='doctor-licenses' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "doctor_license_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING(bucket_id='doctor-licenses' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);

CREATE FUNCTION public.submit_my_doctor_claim(p_claim jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE doctor_row clinzo.doctor; path text;
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_claim) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and claim are required' USING ERRCODE='42501'; END IF;
  SELECT d.* INTO doctor_row FROM clinzo.doctor d JOIN clinzo.identity i ON i.id=d.identity_id
    WHERE i.issuer='supabase' AND i.subject=auth.uid()::text AND i.disabled_at IS NULL
      AND d.active AND d.credential_status='pending';
  IF doctor_row.id IS NULL THEN RAISE EXCEPTION 'Pending doctor account required' USING ERRCODE='42501'; END IF;
  path:=trim(coalesce(p_claim->>'license_path',''));
  IF split_part(path,'/',1)<>auth.uid()::text OR NOT EXISTS(
    SELECT 1 FROM storage.objects WHERE bucket_id='doctor-licenses' AND name=path)
    OR coalesce(p_claim->>'age_years','') !~ '^[0-9]{2,3}$'
    OR (p_claim->>'age_years')::int NOT BETWEEN 18 AND 100
    OR coalesce(p_claim->>'gender','') NOT IN ('Male','Female','Other','Prefer not to say')
    OR length(trim(coalesce(p_claim->>'specialty',''))) NOT BETWEEN 2 AND 120
    OR length(trim(coalesce(p_claim->>'language',''))) NOT BETWEEN 2 AND 80
    OR length(trim(coalesce(p_claim->>'facility_name',''))) NOT BETWEEN 2 AND 160
    OR coalesce(p_claim->>'phone','') !~ '^\+[1-9][0-9]{7,14}$'
    OR length(coalesce(p_claim->>'email',''))>254 THEN
    RAISE EXCEPTION 'Invalid credential claim' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.doctor_onboarding_claim(doctor_id,reported_age_years,reported_gender,
    claimed_specialty,claimed_language,claimed_facility_name,contact_email,contact_phone,license_storage_path)
    VALUES(doctor_row.id,(p_claim->>'age_years')::int,p_claim->>'gender',trim(p_claim->>'specialty'),
      trim(p_claim->>'language'),trim(p_claim->>'facility_name'),nullif(trim(coalesce(p_claim->>'email','')),''),
      p_claim->>'phone',path)
  ON CONFLICT(doctor_id) DO UPDATE SET reported_age_years=excluded.reported_age_years,
    reported_gender=excluded.reported_gender,claimed_specialty=excluded.claimed_specialty,
    claimed_language=excluded.claimed_language,claimed_facility_name=excluded.claimed_facility_name,
    contact_email=excluded.contact_email,contact_phone=excluded.contact_phone,
    license_storage_path=excluded.license_storage_path,updated_at=now();
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_my_doctor_claim(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_doctor_claim(jsonb) TO authenticated;

CREATE FUNCTION public.has_my_doctor_claim() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM clinzo.doctor_onboarding_claim c
    JOIN clinzo.doctor d ON d.id=c.doctor_id JOIN clinzo.identity i ON i.id=d.identity_id
    WHERE i.issuer='supabase' AND i.subject=auth.uid()::text AND i.disabled_at IS NULL);
$$;
REVOKE ALL ON FUNCTION public.has_my_doctor_claim() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_my_doctor_claim() TO authenticated;
