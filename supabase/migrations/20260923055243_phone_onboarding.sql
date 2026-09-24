-- Phone-verified identities only. No role or organization is trusted from JWT metadata.
CREATE FUNCTION clinzo.require_phone_user() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=u AND phone_confirmed_at IS NOT NULL
    AND phone IS NOT NULL AND (banned_until IS NULL OR banned_until < now())) THEN
    RAISE EXCEPTION 'A verified phone account is required' USING ERRCODE='42501';
  END IF;
  RETURN u;
END $$;

CREATE FUNCTION clinzo.require_identity(p_name text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid := clinzo.require_phone_user(); i clinzo.identity; verified_number text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
  SELECT phone INTO verified_number FROM auth.users WHERE id=u;
  SELECT * INTO i FROM clinzo.identity WHERE issuer='supabase' AND subject=u::text;
  IF i.disabled_at IS NOT NULL THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
  IF i.id IS NULL THEN
    IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
      RAISE EXCEPTION 'Complete your profile first' USING ERRCODE='22023';
    END IF;
    INSERT INTO clinzo.identity(issuer,subject,display_name,verified_phone)
      VALUES('supabase',u::text,trim(p_name),verified_number) RETURNING * INTO i;
  ELSIF i.verified_phone IS DISTINCT FROM verified_number THEN
    UPDATE clinzo.identity SET verified_phone=verified_number WHERE id=i.id RETURNING * INTO i;
  END IF;
  RETURN i.id;
END $$;

CREATE FUNCTION public.get_my_profile() RETURNS jsonb
-- Called from complete_onboarding after writes; it must see those writes in the
-- same transaction rather than use the caller statement's stable snapshot.
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid := clinzo.require_phone_user(); i clinzo.identity;
BEGIN
  SELECT * INTO i FROM clinzo.identity WHERE issuer='supabase' AND subject=u::text;
  IF i.disabled_at IS NOT NULL THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
  IF i.id IS NULL THEN RETURN NULL; END IF;
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

CREATE FUNCTION public.create_driver_invitation(p_organization_id uuid, p_phone text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); token text := gen_random_uuid()::text || gen_random_uuid()::text; invite uuid;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'Use an international phone number' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.organization_member m JOIN clinzo.organization o ON o.id=m.organization_id
    WHERE m.identity_id=actor AND m.organization_id=p_organization_id AND m.active AND m.facility_id IS NULL
    AND m.role IN ('owner','organization_admin') AND o.active AND o.kind='ambulance_operator') THEN
    RAISE EXCEPTION 'Operator administration required' USING ERRCODE='42501';
  END IF;
  INSERT INTO clinzo.driver_invitation(organization_id,token_hash,phone,created_by,expires_at)
    VALUES(p_organization_id,encode(sha256(convert_to(token,'UTF8')),'hex'),p_phone,actor,now()+interval '7 days') RETURNING id INTO invite;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,organization_id,request_id,outcome,metadata)
    VALUES(actor,'identity','driver.invited','driver_invitation',invite,p_organization_id,gen_random_uuid(),'allowed','{}');
  RETURN token;
END $$;

CREATE FUNCTION public.complete_onboarding(p_kind text, p_details jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; pid uuid; did uuid; org uuid; fid uuid; n text := trim(p_details->>'full_name');
  started date; expiry date; lat double precision; lng double precision; inv clinzo.driver_invitation; phone text;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('patient','doctor','solo_doctor','driver_independent','driver_invited')
    OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR n IS NULL OR length(n) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Invalid profile details' USING ERRCODE='22023';
  END IF;
  actor := clinzo.require_identity(n);
  IF p_kind='patient' THEN
    IF EXISTS(SELECT 1 FROM clinzo.patient_access WHERE identity_id=actor AND relationship='self') THEN
      IF (public.get_my_profile()->>'patient_id') IS NULL THEN RAISE EXCEPTION 'Patient access unavailable' USING ERRCODE='42501'; END IF;
    ELSE
      INSERT INTO clinzo.patient(public_code,full_name) VALUES('PAT-'||gen_random_uuid()::text,n) RETURNING id INTO pid;
      INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(pid,actor,'self',now());
    END IF;
  ELSIF p_kind IN ('doctor','solo_doctor') THEN
    SELECT id INTO did FROM clinzo.doctor WHERE identity_id=actor;
    IF did IS NULL THEN
      IF length(trim(coalesce(p_details->>'registration_authority',''))) NOT BETWEEN 2 AND 120
        OR length(trim(coalesce(p_details->>'registration_number',''))) NOT BETWEEN 2 AND 120 THEN
        RAISE EXCEPTION 'Registration authority and number are required' USING ERRCODE='22023'; END IF;
      started := (p_details->>'practice_started_on')::date;
      IF started IS NULL OR started < date '1900-01-01' OR started > current_date THEN RAISE EXCEPTION 'Invalid practice start date' USING ERRCODE='22023'; END IF;
      INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status)
        VALUES(actor,'DOC-'||gen_random_uuid()::text,n,trim(p_details->>'registration_authority'),trim(p_details->>'registration_number'),started,'pending') RETURNING id INTO did;
    ELSIF NOT EXISTS(SELECT 1 FROM clinzo.doctor WHERE id=did AND active AND credential_status <> 'suspended') THEN
      RAISE EXCEPTION 'Doctor account unavailable' USING ERRCODE='42501';
    END IF;
    IF p_kind='solo_doctor' AND NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility WHERE doctor_id=did) THEN
      IF length(trim(coalesce(p_details->>'clinic_name',''))) NOT BETWEEN 2 AND 160 OR length(trim(coalesce(p_details->>'address',''))) NOT BETWEEN 5 AND 500 THEN
        RAISE EXCEPTION 'Clinic name and address are required' USING ERRCODE='22023'; END IF;
      lat := (p_details->>'latitude')::double precision; lng := (p_details->>'longitude')::double precision;
      IF lat IS NULL OR lng IS NULL OR NOT(lat BETWEEN -90 AND 90) OR NOT(lng BETWEEN -180 AND 180) THEN
        RAISE EXCEPTION 'Valid clinic coordinates required' USING ERRCODE='22023'; END IF;
      INSERT INTO clinzo.organization(public_code,name,kind) VALUES('ORG-'||gen_random_uuid()::text,trim(p_details->>'clinic_name'),'care_provider') RETURNING id INTO org;
      INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location)
        VALUES(org,'CLN-'||gen_random_uuid()::text,trim(p_details->>'clinic_name'),'clinic',trim(p_details->>'address'),
        extensions.ST_SetSRID(extensions.ST_MakePoint(lng,lat),4326)::extensions.geography) RETURNING id INTO fid;
      INSERT INTO clinzo.organization_member(identity_id,organization_id,role) VALUES(actor,org,'owner');
      INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(did,fid);
    END IF;
  ELSE
    IF EXISTS(SELECT 1 FROM clinzo.driver WHERE identity_id=actor) THEN
      IF (public.get_my_profile()->'driver'->>'id') IS NULL THEN RAISE EXCEPTION 'Driver account unavailable' USING ERRCODE='42501'; END IF;
      RETURN public.get_my_profile();
    END IF;
    expiry := (p_details->>'license_expires_on')::date;
    IF expiry IS NULL OR expiry <= current_date OR length(trim(coalesce(p_details->>'license_number',''))) NOT BETWEEN 2 AND 120 THEN
      RAISE EXCEPTION 'A current driving license is required' USING ERRCODE='22023'; END IF;
    IF p_kind='driver_independent' THEN
      INSERT INTO clinzo.organization(public_code,name,kind) VALUES('ORG-'||gen_random_uuid()::text,n||' Ambulance Services','ambulance_operator') RETURNING id INTO org;
      INSERT INTO clinzo.organization_member(identity_id,organization_id,role) VALUES(actor,org,'owner');
    ELSE
      SELECT * INTO inv FROM clinzo.driver_invitation WHERE token_hash=encode(sha256(convert_to(coalesce(p_details->>'invitation_token',''),'UTF8')),'hex') FOR UPDATE;
      SELECT '+'||ltrim(u.phone,'+') INTO phone FROM auth.users u WHERE u.id=auth.uid();
      IF inv.id IS NULL OR inv.expires_at <= now() OR inv.phone IS DISTINCT FROM phone
        OR EXISTS(SELECT 1 FROM clinzo.driver_invitation_acceptance WHERE invitation_id=inv.id)
        OR NOT EXISTS(SELECT 1 FROM clinzo.organization o JOIN clinzo.organization_member m ON m.organization_id=o.id
          WHERE o.id=inv.organization_id AND o.active AND o.kind='ambulance_operator' AND m.identity_id=inv.created_by
          AND m.active AND m.facility_id IS NULL AND m.role IN ('owner','organization_admin')) THEN
        RAISE EXCEPTION 'Invitation unavailable for this phone number' USING ERRCODE='42501'; END IF;
      org := inv.organization_id;
      INSERT INTO clinzo.driver_invitation_acceptance(invitation_id,identity_id) VALUES(inv.id,actor);
    END IF;
    INSERT INTO clinzo.driver(identity_id,organization_id,public_code,full_name,license_number,license_expires_on,verification_status)
      VALUES(actor,org,'DRV-'||gen_random_uuid()::text,n,trim(p_details->>'license_number'),expiry,'pending');
  END IF;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','profile.onboarded','identity',actor,gen_random_uuid(),'allowed',jsonb_build_object('kind',p_kind));
  RETURN public.get_my_profile();
END $$;

CREATE TRIGGER protect_history BEFORE UPDATE OR DELETE ON clinzo.driver_invitation FOR EACH ROW EXECUTE FUNCTION clinzo.reject_history_change();
CREATE TRIGGER protect_history_truncate BEFORE TRUNCATE ON clinzo.driver_invitation FOR EACH STATEMENT EXECUTE FUNCTION clinzo.reject_history_change();
CREATE TRIGGER protect_history BEFORE UPDATE OR DELETE ON clinzo.driver_invitation_acceptance FOR EACH ROW EXECUTE FUNCTION clinzo.reject_history_change();
CREATE TRIGGER protect_history_truncate BEFORE TRUNCATE ON clinzo.driver_invitation_acceptance FOR EACH STATEMENT EXECUTE FUNCTION clinzo.reject_history_change();
REVOKE ALL ON TABLE clinzo.driver_invitation, clinzo.driver_invitation_acceptance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION clinzo.require_phone_user(), clinzo.require_identity(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_profile(), public.complete_onboarding(text,jsonb), public.create_driver_invitation(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile(), public.complete_onboarding(text,jsonb), public.create_driver_invitation(uuid,text) TO authenticated;
