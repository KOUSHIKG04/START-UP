-- Email/password is a disposable-project patient test path while SMS is unavailable.
-- Keep this setting false in every project unless it is deliberately enabled by
-- trusted database tooling on a disposable project. Client roles cannot change it.
CREATE TABLE clinzo.patient_email_dev_auth (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO clinzo.patient_email_dev_auth(singleton, enabled) VALUES (true, false);
ALTER TABLE clinzo.patient_email_dev_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.patient_email_dev_auth FROM PUBLIC, anon, authenticated;

CREATE FUNCTION clinzo.patient_email_dev_auth_enabled() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT enabled FROM clinzo.patient_email_dev_auth WHERE singleton), false);
$$;
REVOKE ALL ON FUNCTION clinzo.patient_email_dev_auth_enabled() FROM PUBLIC, anon, authenticated;

-- Mobile profile bootstrap may read a verified email identity only when the
-- trusted disposable-project switch is enabled. Doctor/driver onboarding still
-- calls require_phone_user through require_identity.
CREATE OR REPLACE FUNCTION public.get_my_profile() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid := auth.uid(); i clinzo.identity; phone_verified boolean; email_verified boolean;
BEGIN
  SELECT phone IS NOT NULL AND phone_confirmed_at IS NOT NULL,
    email IS NOT NULL AND email_confirmed_at IS NOT NULL
    INTO phone_verified, email_verified FROM auth.users
    WHERE id=u AND (banned_until IS NULL OR banned_until < now());
  IF NOT coalesce(phone_verified,false)
    AND NOT (coalesce(email_verified,false) AND clinzo.patient_email_dev_auth_enabled()) THEN
    RAISE EXCEPTION 'A verified account is required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO i FROM clinzo.identity WHERE issuer='supabase' AND subject=u::text;
  IF i.disabled_at IS NOT NULL THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
  IF i.id IS NULL THEN RETURN NULL; END IF;
  IF NOT coalesce(phone_verified,false) THEN
    -- An email-only test account cannot use doctor, driver or portal scopes.
    RETURN jsonb_build_object('identity_id',i.id,'display_name',i.display_name,
      'patient_id',(SELECT p.id FROM clinzo.patient p JOIN clinzo.patient_access a ON a.patient_id=p.id
        WHERE a.identity_id=i.id AND a.relationship='self' AND a.verified_at IS NOT NULL
          AND a.revoked_at IS NULL AND p.archived_at IS NULL LIMIT 1),
      'doctor',NULL,'driver',NULL,'memberships','[]'::jsonb);
  END IF;
  RETURN jsonb_build_object('identity_id',i.id,'display_name',i.display_name,
    'patient_id',(SELECT p.id FROM clinzo.patient p JOIN clinzo.patient_access a ON a.patient_id=p.id
      WHERE a.identity_id=i.id AND a.relationship='self' AND a.verified_at IS NOT NULL AND a.revoked_at IS NULL AND p.archived_at IS NULL LIMIT 1),
    'doctor',(SELECT jsonb_build_object('id',d.id,'status',d.credential_status) FROM clinzo.doctor d WHERE d.identity_id=i.id AND d.active),
    'driver',(SELECT jsonb_build_object('id',d.id,'status',d.verification_status,'organization_id',d.organization_id)
      FROM clinzo.driver d JOIN clinzo.organization o ON o.id=d.organization_id AND o.active WHERE d.identity_id=i.id AND d.active),
    'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('organization_id',m.organization_id,'facility_id',m.facility_id,
      'role',m.role,'organization_name',o.name)) FROM clinzo.organization_member m JOIN clinzo.organization o ON o.id=m.organization_id AND o.active
      WHERE m.identity_id=i.id AND m.active AND (m.facility_id IS NULL OR EXISTS(SELECT 1 FROM clinzo.facility f WHERE f.id=m.facility_id AND f.active))), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.complete_patient_profile(p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; patient_id uuid; n text; age_years int; address_value jsonb;
  phone_verified boolean; email_verified boolean; existing_identity clinzo.identity;
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and profile are required' USING ERRCODE='42501';
  END IF;
  n:=trim(coalesce(p_profile->>'full_name',''));
  IF length(n) NOT BETWEEN 2 AND 120 OR coalesce(p_profile->>'age_years','') !~ '^[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'Invalid name or age' USING ERRCODE='22023'; END IF;
  age_years:=(p_profile->>'age_years')::int;
  IF age_years NOT BETWEEN 0 AND 120
    OR coalesce(p_profile->>'gender','') NOT IN ('Male','Female','Other','Prefer not to say')
    OR coalesce(p_profile->>'blood_group','') NOT IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')
    OR length(coalesce(p_profile->>'email','')) > 254 THEN
    RAISE EXCEPTION 'Invalid patient profile' USING ERRCODE='22023'; END IF;
  address_value:=p_profile->'address';
  IF address_value IS NOT NULL AND (jsonb_typeof(address_value)<>'object'
    OR length(trim(coalesce(address_value->>'building',''))) NOT BETWEEN 1 AND 160
    OR length(trim(coalesce(address_value->>'line1',''))) NOT BETWEEN 1 AND 200
    OR length(trim(coalesce(address_value->>'city',''))) NOT BETWEEN 2 AND 120
    OR length(trim(coalesce(address_value->>'state',''))) NOT BETWEEN 2 AND 120
    OR coalesce(address_value->>'pincode','') !~ '^[0-9]{6}$') THEN
    RAISE EXCEPTION 'Invalid address' USING ERRCODE='22023'; END IF;

  SELECT phone IS NOT NULL AND phone_confirmed_at IS NOT NULL,
    email IS NOT NULL AND email_confirmed_at IS NOT NULL
    INTO phone_verified,email_verified FROM auth.users
    WHERE id=auth.uid() AND (banned_until IS NULL OR banned_until < now());
  IF coalesce(phone_verified,false) THEN
    PERFORM public.complete_onboarding('patient',jsonb_build_object('full_name',n));
  ELSIF coalesce(email_verified,false) AND clinzo.patient_email_dev_auth_enabled() THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
    SELECT * INTO existing_identity FROM clinzo.identity
      WHERE issuer='supabase' AND subject=auth.uid()::text;
    IF existing_identity.disabled_at IS NOT NULL THEN
      RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
    IF existing_identity.id IS NULL THEN
      INSERT INTO clinzo.identity(issuer,subject,display_name)
        VALUES('supabase',auth.uid()::text,n) RETURNING * INTO existing_identity;
    ELSE
      UPDATE clinzo.identity SET display_name=n WHERE id=existing_identity.id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM clinzo.patient_access
      WHERE identity_id=existing_identity.id AND relationship='self') THEN
      INSERT INTO clinzo.patient(public_code,full_name)
        VALUES('PAT-'||gen_random_uuid()::text,n) RETURNING id INTO patient_id;
      INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at)
        VALUES(patient_id,existing_identity.id,'self',now());
    END IF;
  ELSE
    RAISE EXCEPTION 'A verified phone account is required' USING ERRCODE='42501';
  END IF;
  SELECT pa.patient_id INTO patient_id FROM clinzo.patient_access pa
    JOIN clinzo.identity i ON i.id=pa.identity_id
    WHERE i.issuer='supabase' AND i.subject=auth.uid()::text AND i.disabled_at IS NULL AND pa.relationship='self'
      AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL LIMIT 1;
  IF patient_id IS NULL THEN RAISE EXCEPTION 'Patient access unavailable' USING ERRCODE='42501'; END IF;
  UPDATE clinzo.patient SET full_name=n,reported_age_years=age_years,reported_age_on=current_date,
    gender_identity=p_profile->>'gender',blood_group=p_profile->>'blood_group',
    contact_email=nullif(trim(coalesce(p_profile->>'email','')),''),home_address=address_value,
    updated_at=now(),row_version=row_version+1 WHERE id=patient_id;
  RETURN public.get_my_profile();
END $$;
