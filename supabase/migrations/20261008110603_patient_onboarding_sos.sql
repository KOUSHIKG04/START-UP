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
    'patient_profile_complete',coalesce((SELECT p.reported_age_years IS NOT NULL AND p.gender_identity IS NOT NULL AND p.blood_group IS NOT NULL FROM clinzo.patient p JOIN clinzo.patient_access a ON a.patient_id=p.id WHERE a.identity_id=i.id AND a.relationship='self' AND a.verified_at IS NOT NULL AND a.revoked_at IS NULL AND p.archived_at IS NULL LIMIT 1),false),
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

-- Emergency onboarding shares the existing patient, dispatch, PIN and tracking
-- records. It does not invent age, gender or blood group to finish a profile.
CREATE FUNCTION public.request_onboarding_sos(p_details jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; patient_id uuid; booking_id uuid; replay clinzo.idempotency_record;
  n text; phone text; request_key uuid; fingerprint bytea;
BEGIN
  IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Emergency details are required' USING ERRCODE = '22023';
  END IF;
  n := trim(coalesce(p_details->>'full_name',''));
  phone := trim(coalesce(p_details->>'contact_phone',''));
  IF length(n) NOT BETWEEN 2 AND 120 OR phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Enter your name and international contact phone' USING ERRCODE = '22023';
  END IF;
  request_key := (p_details->>'idempotency_key')::uuid;
  IF request_key IS NULL THEN
    RAISE EXCEPTION 'An emergency request key is required' USING ERRCODE = '22023';
  END IF;
  -- require_identity permits verified phone Auth, or explicitly enabled email
  -- development Auth. Contact-phone input never grants verified Auth status.
  actor := clinzo.require_identity(n);
  fingerprint := sha256(convert_to(jsonb_build_array(n,phone,p_details->'pickup_latitude',
    p_details->'pickup_longitude',trim(p_details->>'pickup_address'),trim(p_details->>'summary'))::text,'UTF8'));
  SELECT * INTO replay FROM clinzo.idempotency_record
    WHERE principal_scope = actor::text AND operation = 'onboarding.sos' AND key = request_key::text;
  IF replay.id IS NOT NULL THEN
    IF replay.request_hash <> fingerprint THEN
      RAISE EXCEPTION 'Request key used with different details' USING ERRCODE = '22023';
    END IF;
    RETURN replay.resource_id;
  END IF;
  PERFORM public.complete_onboarding('patient',jsonb_build_object('full_name',n));
  SELECT p.id INTO patient_id FROM clinzo.patient p JOIN clinzo.patient_access a ON a.patient_id = p.id
    WHERE a.identity_id = actor AND a.relationship = 'self' AND a.verified_at IS NOT NULL
      AND a.revoked_at IS NULL AND p.archived_at IS NULL;
  IF patient_id IS NULL THEN RAISE EXCEPTION 'Patient access required' USING ERRCODE = '42501'; END IF;
  UPDATE clinzo.patient SET full_name = n, contact_phone = phone
    WHERE id = patient_id AND reported_age_years IS NULL;
  booking_id := public.request_my_sos(patient_id,
    (p_details->>'pickup_latitude')::double precision,(p_details->>'pickup_longitude')::double precision,
    p_details->>'pickup_address',p_details->>'summary',request_key);
  UPDATE clinzo.ambulance_booking SET contact_phone_snapshot = phone WHERE id = booking_id;
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'onboarding.sos',request_key::text,fingerprint,'ambulance_booking',booking_id,'created',now()+interval '30 days');
  RETURN booking_id;
END $$;
REVOKE ALL ON FUNCTION public.request_onboarding_sos(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_onboarding_sos(jsonb) TO authenticated;
