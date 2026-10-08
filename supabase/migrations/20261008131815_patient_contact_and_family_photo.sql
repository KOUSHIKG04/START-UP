-- Reuse existing contact_phone and private profile-photo storage. Never alter Auth phone verification.
BEGIN;
CREATE OR REPLACE FUNCTION public.complete_patient_profile(p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; patient_id uuid; n text; age_years int; address_value jsonb; dob date;
  phone_verified boolean; email_verified boolean; existing_identity clinzo.identity;
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and profile are required' USING ERRCODE='42501';
  END IF;
  IF p_profile ? 'birth_date' THEN
    IF coalesce(p_profile->>'birth_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE='22023';
    END IF;
    BEGIN
      dob := (p_profile->>'birth_date')::date;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE='22023';
    END;
    IF dob > current_date OR extract(year FROM age(current_date,dob)) > 120 THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE='22023';
    END IF;
    -- DOB is authoritative; never trust the client-supplied age when DOB exists.
    p_profile := jsonb_set(p_profile,'{age_years}',to_jsonb(extract(year FROM age(current_date,dob))::int));
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
  IF p_profile ? 'contact_phone' AND coalesce(p_profile->>'contact_phone','') !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Invalid contact phone' USING ERRCODE='22023';
  END IF;
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
  UPDATE clinzo.patient SET full_name=n,birth_date=coalesce(dob,birth_date),reported_age_years=age_years,reported_age_on=current_date,
    gender_identity=p_profile->>'gender',blood_group=p_profile->>'blood_group',
    contact_phone=CASE WHEN p_profile ? 'contact_phone' THEN p_profile->>'contact_phone' ELSE contact_phone END,
    contact_email=nullif(trim(coalesce(p_profile->>'email','')),''),home_address=address_value,
    updated_at=now(),row_version=row_version+1 WHERE id=patient_id;
  RETURN public.get_my_profile();
END $$;

CREATE OR REPLACE FUNCTION public.add_my_family_profile(p_profile jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; patient_id uuid; n text; age_years int; phone text; dob date;
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and profile are required' USING ERRCODE='42501'; END IF;
  SELECT id INTO actor FROM clinzo.identity WHERE issuer='supabase' AND subject=auth.uid()::text AND disabled_at IS NULL;
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM clinzo.patient_access
    WHERE identity_id=actor AND relationship='self' AND verified_at IS NOT NULL AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'Patient account required' USING ERRCODE='42501'; END IF;
  IF p_profile ? 'birth_date' THEN
    IF coalesce(p_profile->>'birth_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE='22023';
    END IF;
    BEGIN
      dob := (p_profile->>'birth_date')::date;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE='22023';
    END;
    IF dob > current_date OR extract(year FROM age(current_date,dob)) > 120 THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE='22023';
    END IF;
    -- DOB is authoritative; never trust the client-supplied age when DOB exists.
    p_profile := jsonb_set(p_profile,'{age_years}',to_jsonb(extract(year FROM age(current_date,dob))::int));
  END IF;
  n:=trim(coalesce(p_profile->>'full_name','')); phone:=trim(coalesce(p_profile->>'phone',''));
  IF length(n) NOT BETWEEN 2 AND 120 OR coalesce(p_profile->>'age_years','') !~ '^[0-9]{1,3}$'
    OR phone !~ '^\+[1-9][0-9]{7,14}$'
    OR coalesce(p_profile->>'gender','') NOT IN ('Male','Female','Other','Prefer not to say')
    OR coalesce(p_profile->>'blood_group','') NOT IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')
    OR coalesce(p_profile->>'relation','') NOT IN ('Son','Daughter','Father','Mother','Spouse','Sibling','Other') THEN
    RAISE EXCEPTION 'Invalid family profile' USING ERRCODE='22023'; END IF;
  age_years:=(p_profile->>'age_years')::int;
  IF age_years NOT BETWEEN 0 AND 120 THEN RAISE EXCEPTION 'Invalid age' USING ERRCODE='22023'; END IF;
  IF p_profile ? 'profile_photo_path' THEN
    IF coalesce(p_profile->>'profile_photo_path','') NOT LIKE auth.uid()::text || '/%'
      OR length(p_profile->>'profile_photo_path') > 500
      OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='patient-profile-photos' AND name=p_profile->>'profile_photo_path') THEN
      RAISE EXCEPTION 'Upload your family photo first' USING ERRCODE='22023';
    END IF;
  END IF;
  INSERT INTO clinzo.patient(public_code,full_name,birth_date,reported_age_years,reported_age_on,
    gender_identity,blood_group,contact_phone,profile_photo_path)
    VALUES('PAT-'||gen_random_uuid()::text,n,dob,age_years,current_date,p_profile->>'gender',
      p_profile->>'blood_group',phone,p_profile->>'profile_photo_path') RETURNING id INTO patient_id;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,family_relation,notify_emergency)
    VALUES(patient_id,actor,CASE WHEN age_years<18 THEN 'guardian' ELSE 'delegate' END,
      p_profile->>'relation',coalesce((p_profile->>'notify')::boolean,false));
  RETURN patient_id;
END $$;
REVOKE ALL ON FUNCTION public.add_my_family_profile(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_my_family_profile(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_family_profiles() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,
    'birth_date',p.birth_date,'age_years',CASE WHEN p.birth_date IS NOT NULL THEN extract(year FROM age(current_date,p.birth_date))::int ELSE p.reported_age_years END,'gender',p.gender_identity,'blood_group',p.blood_group,
    'relation',pa.family_relation,'phone',p.contact_phone,'verified',pa.verified_at IS NOT NULL,'profile_photo_path',p.profile_photo_path)
    ORDER BY p.created_at DESC),'[]'::jsonb)
  FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    JOIN clinzo.identity i ON i.id=pa.identity_id
  WHERE auth.uid() IS NOT NULL AND i.issuer='supabase' AND i.subject=auth.uid()::text AND i.disabled_at IS NULL
    AND pa.relationship IN ('guardian','delegate') AND pa.revoked_at IS NULL AND p.archived_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.list_my_family_profiles() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_family_profiles() TO authenticated;


CREATE OR REPLACE FUNCTION public.get_my_patient_profile_detail() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('id',p.id,'full_name',p.full_name,'birth_date',p.birth_date,'age_years',CASE WHEN p.birth_date IS NOT NULL THEN extract(year FROM age(current_date,p.birth_date))::int ELSE p.reported_age_years END,
    'age_recorded_on',p.reported_age_on,'gender',p.gender_identity,'blood_group',p.blood_group,
    'contact_phone',p.contact_phone,'email',p.contact_email,'address',p.home_address,'profile_photo_path',p.profile_photo_path)
  FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    JOIN clinzo.identity i ON i.id=pa.identity_id
  WHERE auth.uid() IS NOT NULL AND i.issuer='supabase' AND i.subject=auth.uid()::text
    AND i.disabled_at IS NULL AND pa.relationship='self' AND pa.verified_at IS NOT NULL
    AND pa.revoked_at IS NULL AND p.archived_at IS NULL LIMIT 1;
$$;


NOTIFY pgrst, 'reload schema';
COMMIT;
