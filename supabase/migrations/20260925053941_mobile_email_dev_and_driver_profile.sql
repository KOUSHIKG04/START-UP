-- Verified email accounts may bootstrap doctor/driver profiles on a deliberately
-- opted-in disposable project while SMS is unavailable. This is false by default.
CREATE TABLE clinzo.mobile_email_dev_auth (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO clinzo.mobile_email_dev_auth(singleton,enabled) VALUES(true,false);
ALTER TABLE clinzo.mobile_email_dev_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.mobile_email_dev_auth FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.mobile_email_dev_auth_enabled() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce((SELECT enabled FROM clinzo.mobile_email_dev_auth WHERE singleton),false);
$$;
REVOKE ALL ON FUNCTION clinzo.mobile_email_dev_auth_enabled() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION clinzo.require_phone_user() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id=u AND (banned_until IS NULL OR banned_until<now())
      AND ((phone IS NOT NULL AND phone_confirmed_at IS NOT NULL)
        OR (email IS NOT NULL AND email_confirmed_at IS NOT NULL AND clinzo.mobile_email_dev_auth_enabled()))
  ) THEN RAISE EXCEPTION 'A verified account is required' USING ERRCODE='42501'; END IF;
  RETURN u;
END $$;

CREATE OR REPLACE FUNCTION clinzo.require_identity(p_name text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid := clinzo.require_phone_user(); i clinzo.identity; verified_number text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
  SELECT CASE WHEN phone_confirmed_at IS NOT NULL THEN phone ELSE NULL END INTO verified_number
    FROM auth.users WHERE id=u;
  SELECT * INTO i FROM clinzo.identity WHERE issuer='supabase' AND subject=u::text;
  IF i.disabled_at IS NOT NULL THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
  IF i.id IS NULL THEN
    IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
      RAISE EXCEPTION 'Complete your profile first' USING ERRCODE='22023'; END IF;
    INSERT INTO clinzo.identity(issuer,subject,display_name,verified_phone)
      VALUES('supabase',u::text,trim(p_name),verified_number) RETURNING * INTO i;
  ELSIF verified_number IS NOT NULL AND i.verified_phone IS DISTINCT FROM verified_number THEN
    UPDATE clinzo.identity SET verified_phone=verified_number WHERE id=i.id RETURNING * INTO i;
  END IF;
  RETURN i.id;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_profile() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid := auth.uid(); i clinzo.identity; phone_verified boolean; email_verified boolean;
BEGIN
  SELECT phone IS NOT NULL AND phone_confirmed_at IS NOT NULL,
    email IS NOT NULL AND email_confirmed_at IS NOT NULL
    INTO phone_verified,email_verified FROM auth.users
    WHERE id=u AND (banned_until IS NULL OR banned_until<now());
  IF NOT coalesce(phone_verified,false) AND NOT (coalesce(email_verified,false)
    AND (clinzo.patient_email_dev_auth_enabled() OR clinzo.mobile_email_dev_auth_enabled())) THEN
    RAISE EXCEPTION 'A verified account is required' USING ERRCODE='42501'; END IF;
  SELECT * INTO i FROM clinzo.identity WHERE issuer='supabase' AND subject=u::text;
  IF i.disabled_at IS NOT NULL THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
  IF i.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('identity_id',i.id,'display_name',i.display_name,
    'patient_id',(SELECT p.id FROM clinzo.patient p JOIN clinzo.patient_access a ON a.patient_id=p.id
      WHERE a.identity_id=i.id AND a.relationship='self' AND a.verified_at IS NOT NULL
        AND a.revoked_at IS NULL AND p.archived_at IS NULL LIMIT 1),
    'doctor',CASE WHEN coalesce(phone_verified,false) OR clinzo.mobile_email_dev_auth_enabled()
      THEN (SELECT jsonb_build_object('id',d.id,'status',d.credential_status) FROM clinzo.doctor d WHERE d.identity_id=i.id AND d.active) ELSE NULL END,
    'driver',CASE WHEN coalesce(phone_verified,false) OR clinzo.mobile_email_dev_auth_enabled()
      THEN (SELECT jsonb_build_object('id',d.id,'status',d.verification_status,'organization_id',d.organization_id)
        FROM clinzo.driver d JOIN clinzo.organization o ON o.id=d.organization_id AND o.active
        WHERE d.identity_id=i.id AND d.active) ELSE NULL END,
    'memberships',CASE WHEN coalesce(phone_verified,false) OR clinzo.mobile_email_dev_auth_enabled()
      THEN coalesce((SELECT jsonb_agg(jsonb_build_object('organization_id',m.organization_id,'facility_id',m.facility_id,
        'role',m.role,'organization_name',o.name)) FROM clinzo.organization_member m JOIN clinzo.organization o
        ON o.id=m.organization_id AND o.active WHERE m.identity_id=i.id AND m.active AND
        (m.facility_id IS NULL OR EXISTS(SELECT 1 FROM clinzo.facility f WHERE f.id=m.facility_id AND f.active))), '[]'::jsonb)
      ELSE '[]'::jsonb END);
END $$;

ALTER TABLE clinzo.driver
  ADD COLUMN date_of_birth date,
  ADD COLUMN city text,
  ADD COLUMN contact_phone text,
  ADD COLUMN profile_photo_path text,
  ADD COLUMN verification_consent_at timestamptz,
  ADD CONSTRAINT driver_city_length CHECK (city IS NULL OR length(city) BETWEEN 2 AND 120),
  ADD CONSTRAINT driver_contact_phone_format CHECK (contact_phone IS NULL OR contact_phone ~ '^\+[1-9][0-9]{7,14}$');

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('driver-evidence','driver-evidence',false,10485760,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT(id) DO NOTHING;
CREATE POLICY "driver_evidence_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK(bucket_id='driver-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "driver_evidence_read_own" ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id='driver-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "driver_evidence_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING(bucket_id='driver-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);

CREATE TABLE clinzo.driver_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES clinzo.driver(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES clinzo.vehicle(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK(kind IN ('aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images')),
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id,kind), UNIQUE(storage_path)
);
CREATE INDEX driver_document_driver_id_idx ON clinzo.driver_document(driver_id);
ALTER TABLE clinzo.driver_document ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.driver_document FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.get_my_driver_profile() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN (SELECT jsonb_build_object('id',d.id,'full_name',d.full_name,
    'date_of_birth',d.date_of_birth,'city',d.city,'contact_phone',d.contact_phone,
    'profile_photo_path',d.profile_photo_path,'verification_status',d.verification_status,
    'license_number',d.license_number,'license_expires_on',d.license_expires_on,
    'verification_consent_at',d.verification_consent_at)
    FROM clinzo.driver d WHERE d.identity_id=actor AND d.active);
END $$;

CREATE FUNCTION public.update_my_driver_profile(p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); d clinzo.driver; n text; birth date; city_value text; phone_value text; photo text;
BEGIN
  IF jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid profile' USING ERRCODE='22023'; END IF;
  n:=trim(coalesce(p_profile->>'full_name',''));
  city_value:=trim(coalesce(p_profile->>'city',''));
  phone_value:=nullif(trim(coalesce(p_profile->>'contact_phone','')),'');
  photo:=nullif(trim(coalesce(p_profile->>'profile_photo_path','')),'');
  IF length(n) NOT BETWEEN 2 AND 120 OR length(city_value) NOT BETWEEN 2 AND 120
    OR (phone_value IS NOT NULL AND phone_value !~ '^\+[1-9][0-9]{7,14}$')
    OR coalesce(p_profile->>'date_of_birth','') !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid driver details' USING ERRCODE='22023'; END IF;
  birth:=(p_profile->>'date_of_birth')::date;
  IF birth>current_date-interval '18 years' OR birth<date '1900-01-01' THEN
    RAISE EXCEPTION 'Driver must be at least 18' USING ERRCODE='22023'; END IF;
  IF photo IS NOT NULL AND (photo NOT LIKE auth.uid()::text||'/%' OR NOT EXISTS
    (SELECT 1 FROM storage.objects WHERE bucket_id='driver-evidence' AND name=photo)) THEN
    RAISE EXCEPTION 'Profile photo upload is required' USING ERRCODE='22023'; END IF;
  SELECT * INTO d FROM clinzo.driver WHERE identity_id=actor AND active FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Driver profile required' USING ERRCODE='42501'; END IF;
  IF d.verification_status='suspended' THEN RAISE EXCEPTION 'Driver account suspended' USING ERRCODE='42501'; END IF;
  UPDATE clinzo.driver SET full_name=n,date_of_birth=birth,city=city_value,contact_phone=phone_value,
    profile_photo_path=photo,verification_consent_at=CASE WHEN p_profile->>'consent'='true' THEN coalesce(verification_consent_at,now()) ELSE verification_consent_at END,
    verification_status=CASE WHEN d.verification_status='verified' AND (d.full_name IS DISTINCT FROM n OR d.date_of_birth IS DISTINCT FROM birth)
      THEN 'pending' ELSE d.verification_status END WHERE id=d.id;
  UPDATE clinzo.identity SET display_name=n WHERE id=actor;
  RETURN public.get_my_driver_profile();
END $$;

CREATE FUNCTION public.submit_my_driver_vehicle(p_details jsonb,p_documents jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); d clinzo.driver; vehicle_id uuid; kind text; path text;
BEGIN
  SELECT * INTO d FROM clinzo.driver WHERE identity_id=actor AND active AND verification_status='pending';
  IF d.id IS NULL OR d.verification_consent_at IS NULL THEN
    RAISE EXCEPTION 'Pending driver profile and verification consent required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR jsonb_typeof(p_documents) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Vehicle details and documents are required' USING ERRCODE='22023'; END IF;
  FOREACH kind IN ARRAY ARRAY['aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images'] LOOP
    path:=p_documents->>kind;
    IF path IS NULL OR path NOT LIKE auth.uid()::text||'/%' OR NOT EXISTS
      (SELECT 1 FROM storage.objects WHERE bucket_id='driver-evidence' AND name=path) THEN
      RAISE EXCEPTION 'Missing uploaded document: %',kind USING ERRCODE='22023'; END IF;
  END LOOP;
  vehicle_id:=public.register_my_ambulance_vehicle(p_details->>'registration_number',p_details->>'display_label',
    (p_details->>'inspection_expires_on')::date,p_details->>'capability_code',
    p_details->>'equipment_notes',p_details->>'crew_notes');
  FOR kind,path IN SELECT key,value FROM jsonb_each_text(p_documents) LOOP
    IF kind NOT IN ('aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images') THEN
      RAISE EXCEPTION 'Unknown document type' USING ERRCODE='22023'; END IF;
    INSERT INTO clinzo.driver_document(driver_id,vehicle_id,kind,storage_path)
      VALUES(d.id,vehicle_id,kind,path);
  END LOOP;
  RETURN vehicle_id;
END $$;

REVOKE ALL ON FUNCTION public.get_my_driver_profile(),public.update_my_driver_profile(jsonb),
  public.submit_my_driver_vehicle(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_driver_profile(),public.update_my_driver_profile(jsonb),
  public.submit_my_driver_vehicle(jsonb,jsonb) TO authenticated;
