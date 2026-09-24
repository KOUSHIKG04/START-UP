-- No user metadata is trusted for role assignment. All identity comes from auth.uid().
CREATE FUNCTION clinzo.require_identity(p_name text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid(); v_id uuid; v_disabled timestamptz;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id=v_user AND (email_confirmed_at IS NOT NULL OR phone_confirmed_at IS NOT NULL)
      AND (banned_until IS NULL OR banned_until < now())
  ) THEN RAISE EXCEPTION 'A confirmed account is required' USING ERRCODE='42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  SELECT id, disabled_at INTO v_id, v_disabled FROM clinzo.identity WHERE issuer='supabase' AND subject=v_user::text;
  IF v_disabled IS NOT NULL THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
  IF v_id IS NULL THEN
    IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
      RAISE EXCEPTION 'Enter your full name (2-120 characters)' USING ERRCODE='22023';
    END IF;
    INSERT INTO clinzo.identity(issuer,subject,display_name)
      VALUES('supabase',v_user::text,trim(p_name)) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION clinzo.require_identity (text)
FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_my_profile() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_identity clinzo.identity; v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=v_user AND (banned_until IS NULL OR banned_until < now())) THEN
    RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_identity FROM clinzo.identity WHERE issuer='supabase' AND subject=v_user::text;
  IF v_identity.disabled_at IS NOT NULL THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
  IF v_identity.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'identity_id',v_identity.id,'display_name',v_identity.display_name,
    'patient_id',(SELECT p.id FROM clinzo.patient p JOIN clinzo.patient_access a ON a.patient_id=p.id
      WHERE a.identity_id=v_identity.id AND a.relationship='self' AND a.revoked_at IS NULL AND p.archived_at IS NULL LIMIT 1),
    'doctor',(SELECT jsonb_build_object('id',d.id,'status',d.credential_status) FROM clinzo.doctor d WHERE d.identity_id=v_identity.id AND d.active),
    'driver',(SELECT jsonb_build_object('id',d.id,'status',d.verification_status) FROM clinzo.driver d
      JOIN clinzo.organization o ON o.id=d.organization_id AND o.active WHERE d.identity_id=v_identity.id AND d.active),
    'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('organization_id',m.organization_id,
      'facility_id',m.facility_id,'role',m.role,'organization_name',o.name))
      FROM clinzo.organization_member m JOIN clinzo.organization o ON o.id=m.organization_id AND o.active
      WHERE m.identity_id=v_identity.id AND m.active
        AND (m.facility_id IS NULL OR EXISTS(SELECT 1 FROM clinzo.facility f WHERE f.id=m.facility_id AND f.active))), '[]'::jsonb)
  );
END $$;

CREATE FUNCTION public.complete_onboarding(p_kind text, p_details jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_patient uuid; v_doctor uuid; v_org uuid; v_facility uuid;
  v_name text := trim(p_details->>'full_name'); v_started date; v_expiry date;
  v_lat double precision; v_lng double precision;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('patient','doctor','solo_doctor','driver') OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid onboarding request' USING ERRCODE='22023';
  END IF;
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Enter your full name (2-120 characters)' USING ERRCODE='22023'; END IF;
  v_id := clinzo.require_identity(v_name);
  IF p_kind='patient' THEN
    SELECT patient_id INTO v_patient FROM clinzo.patient_access WHERE identity_id=v_id AND relationship='self' AND revoked_at IS NULL;
    IF v_patient IS NULL THEN
      INSERT INTO clinzo.patient(public_code,full_name) VALUES('PAT-'||gen_random_uuid()::text,v_name) RETURNING id INTO v_patient;
      INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(v_patient,v_id,'self',now());
    END IF;
  ELSIF p_kind IN ('doctor','solo_doctor') THEN
    SELECT id INTO v_doctor FROM clinzo.doctor WHERE identity_id=v_id;
    IF v_doctor IS NULL THEN
      IF length(trim(coalesce(p_details->>'registration_authority',''))) NOT BETWEEN 2 AND 120
        OR length(trim(coalesce(p_details->>'registration_number',''))) NOT BETWEEN 2 AND 120 THEN
        RAISE EXCEPTION 'Registration authority and number are required' USING ERRCODE='22023'; END IF;
      v_started := (p_details->>'practice_started_on')::date;
      IF v_started IS NULL OR v_started < date '1900-01-01' OR v_started > current_date THEN
        RAISE EXCEPTION 'Enter a valid practice start date' USING ERRCODE='22023'; END IF;
      INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status)
        VALUES(v_id,'DOC-'||gen_random_uuid()::text,v_name,trim(p_details->>'registration_authority'),trim(p_details->>'registration_number'),v_started,'pending') RETURNING id INTO v_doctor;
    END IF;
    IF p_kind='solo_doctor' AND NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility WHERE doctor_id=v_doctor) THEN
      IF length(trim(coalesce(p_details->>'clinic_name',''))) NOT BETWEEN 2 AND 160
        OR length(trim(coalesce(p_details->>'address',''))) NOT BETWEEN 5 AND 500 THEN
        RAISE EXCEPTION 'Clinic name and address are required' USING ERRCODE='22023'; END IF;
      v_lat := (p_details->>'latitude')::double precision; v_lng := (p_details->>'longitude')::double precision;
      IF v_lat IS NULL OR v_lng IS NULL OR NOT(v_lat BETWEEN -90 AND 90) OR NOT(v_lng BETWEEN -180 AND 180) THEN
        RAISE EXCEPTION 'Valid clinic coordinates are required' USING ERRCODE='22023'; END IF;
      INSERT INTO clinzo.organization(public_code,name,kind) VALUES('ORG-'||gen_random_uuid()::text,trim(p_details->>'clinic_name'),'care_provider') RETURNING id INTO v_org;
      INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location)
        VALUES(v_org,'CLN-'||gen_random_uuid()::text,trim(p_details->>'clinic_name'),'clinic',trim(p_details->>'address'),
        extensions.ST_SetSRID(extensions.ST_MakePoint(v_lng,v_lat),4326)::extensions.geography) RETURNING id INTO v_facility;
      INSERT INTO clinzo.organization_member(identity_id,organization_id,role) VALUES(v_id,v_org,'owner');
      INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(v_doctor,v_facility);
    END IF;
  ELSE
    -- Independent driver creates their own operator. Joining an existing operator
    -- or becoming staff requires a trusted membership workflow, never an input UUID.
    IF NOT EXISTS(SELECT 1 FROM clinzo.driver WHERE identity_id=v_id) THEN
      v_expiry := (p_details->>'license_expires_on')::date;
      IF v_expiry IS NULL OR v_expiry <= current_date OR length(trim(coalesce(p_details->>'license_number',''))) NOT BETWEEN 2 AND 120 THEN
        RAISE EXCEPTION 'A current driving license is required' USING ERRCODE='22023'; END IF;
      INSERT INTO clinzo.organization(public_code,name,kind) VALUES('ORG-'||gen_random_uuid()::text,v_name||' Ambulance Services','ambulance_operator') RETURNING id INTO v_org;
      INSERT INTO clinzo.organization_member(identity_id,organization_id,role) VALUES(v_id,v_org,'owner');
      INSERT INTO clinzo.driver(identity_id,organization_id,public_code,full_name,license_number,license_expires_on,verification_status)
        VALUES(v_id,v_org,'DRV-'||gen_random_uuid()::text,v_name,trim(p_details->>'license_number'),v_expiry,'pending');
    END IF;
  END IF;
  RETURN public.get_my_profile();
END $$;

REVOKE ALL ON FUNCTION public.get_my_profile () FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.complete_onboarding (text, jsonb)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_profile () TO authenticated;

GRANT
EXECUTE ON FUNCTION public.complete_onboarding (text, jsonb) TO authenticated;
-- No direct table grants: RLS remains default-deny. Caller identity and tenant
-- scope are enforced inside each exposed RPC; clients cannot supply an actor ID.