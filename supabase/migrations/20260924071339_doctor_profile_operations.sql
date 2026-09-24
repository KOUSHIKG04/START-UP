CREATE FUNCTION public.get_my_doctor_profile() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',d.id,'full_name',d.full_name,'bio',d.bio,
    'registration_authority',d.registration_authority,'registration_number',d.registration_number,
    'practice_started_on',d.practice_started_on,'credential_status',d.credential_status,
    'booking_timezone',d.booking_timezone,
    'languages',(SELECT coalesce(jsonb_agg(dl.language_code ORDER BY dl.language_code),'[]'::jsonb)
      FROM clinzo.doctor_language dl WHERE dl.doctor_id=d.id),
    'specialties',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',sp.code,'name',sp.name) ORDER BY sp.name),'[]'::jsonb)
      FROM clinzo.doctor_specialty ds JOIN clinzo.specialty sp ON sp.id=ds.specialty_id WHERE ds.doctor_id=d.id AND sp.active),
    'facilities',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'practice_id',df.id,'facility_id',f.id,'facility_name',f.name,'facility_kind',f.kind,
      'address',f.address,'active',df.active AND f.active) ORDER BY f.name),'[]'::jsonb)
      FROM clinzo.doctor_facility df JOIN clinzo.facility f ON f.id=df.facility_id WHERE df.doctor_id=d.id)
  ) INTO result FROM clinzo.doctor d WHERE d.identity_id=actor AND d.active;
  RETURN result;
END $$;

CREATE FUNCTION public.update_my_doctor_profile(p_full_name text,p_bio text,p_languages text[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); v_doctor_id uuid; normalized_languages text[]; request_id uuid := gen_random_uuid();
BEGIN
  IF p_full_name IS NULL OR length(trim(p_full_name)) NOT BETWEEN 2 AND 120
    OR length(coalesce(p_bio,'')) > 2000 OR p_languages IS NULL OR cardinality(p_languages) > 10 THEN
    RAISE EXCEPTION 'Invalid doctor profile' USING ERRCODE='22023';
  END IF;
  SELECT id INTO v_doctor_id FROM clinzo.doctor
    WHERE identity_id=actor AND active AND credential_status <> 'suspended' FOR UPDATE;
  IF v_doctor_id IS NULL THEN RAISE EXCEPTION 'Doctor profile unavailable' USING ERRCODE='42501'; END IF;
  SELECT coalesce(array_agg(DISTINCT lower(trim(code)) ORDER BY lower(trim(code))),ARRAY[]::text[])
    INTO normalized_languages FROM unnest(p_languages) code;
  IF EXISTS(SELECT 1 FROM unnest(normalized_languages) code WHERE code IS NULL OR code !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$') THEN
    RAISE EXCEPTION 'Invalid language code' USING ERRCODE='22023';
  END IF;
  UPDATE clinzo.doctor SET full_name=trim(p_full_name),bio=nullif(trim(p_bio),'') WHERE id=v_doctor_id;
  DELETE FROM clinzo.doctor_language dl WHERE dl.doctor_id=v_doctor_id;
  INSERT INTO clinzo.doctor_language(doctor_id,language_code)
    SELECT v_doctor_id,code FROM unnest(normalized_languages) code;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','doctor.profile.updated','doctor',v_doctor_id,request_id,'allowed','{}');
  RETURN public.get_my_doctor_profile();
END $$;

REVOKE ALL ON FUNCTION public.get_my_doctor_profile(),public.update_my_doctor_profile(text,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_doctor_profile(),public.update_my_doctor_profile(text,text,text[]) TO authenticated;

CREATE FUNCTION public.get_public_practice_bio(p_practice_id uuid,p_service_id uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result text;
BEGIN
  SELECT d.bio INTO result FROM clinzo.doctor_facility df
    JOIN clinzo.doctor d ON d.id=df.doctor_id
    JOIN clinzo.practice_service ps ON ps.doctor_facility_id=df.id
    JOIN clinzo.facility f ON f.id=df.facility_id
    JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE df.id=p_practice_id AND ps.id=p_service_id AND ps.active
      AND df.active AND d.active AND d.credential_status='verified'
      AND f.active AND o.active;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_public_practice_bio(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_practice_bio(uuid,uuid) TO anon,authenticated;
