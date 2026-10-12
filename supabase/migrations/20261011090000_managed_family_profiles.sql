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
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,family_relation,notify_emergency,verified_at)
    VALUES(patient_id,actor,CASE WHEN age_years<18 THEN 'guardian' ELSE 'delegate' END,
      p_profile->>'relation',coalesce((p_profile->>'notify')::boolean,false),clock_timestamp());
  RETURN patient_id;
END $$;
REVOKE ALL ON FUNCTION public.add_my_family_profile(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_my_family_profile(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_family_profiles() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,
    'birth_date',p.birth_date,'age_years',CASE WHEN p.birth_date IS NOT NULL THEN extract(year FROM age(current_date,p.birth_date))::int ELSE p.reported_age_years END,'gender',p.gender_identity,'blood_group',p.blood_group,
    'relation',pa.family_relation,'phone',p.contact_phone,'verified',pa.verified_at IS NOT NULL,'profile_photo_path',p.profile_photo_path,'notify',pa.notify_emergency,'can_edit',NOT EXISTS (SELECT 1 FROM clinzo.patient_access other WHERE other.patient_id=p.id AND other.identity_id<>pa.identity_id AND other.revoked_at IS NULL) AND NOT EXISTS (SELECT 1 FROM clinzo.patient_access own WHERE own.patient_id=p.id AND own.relationship='self' AND own.revoked_at IS NULL))
    ORDER BY p.created_at DESC),'[]'::jsonb)
  FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    JOIN clinzo.identity i ON i.id=pa.identity_id
  WHERE auth.uid() IS NOT NULL AND i.issuer='supabase' AND i.subject=auth.uid()::text AND i.disabled_at IS NULL
    AND pa.relationship IN ('guardian','delegate') AND pa.revoked_at IS NULL AND p.archived_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.list_my_family_profiles() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_family_profiles() TO authenticated;



CREATE OR REPLACE FUNCTION public.update_my_family_profile(p_patient_id uuid, p_profile jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; n text; age_years int; phone text; dob date;
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and profile are required' USING ERRCODE='42501'; END IF;
  SELECT id INTO actor FROM clinzo.identity WHERE issuer='supabase' AND subject=auth.uid()::text AND disabled_at IS NULL;
  PERFORM 1 FROM clinzo.patient WHERE id=p_patient_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR actor IS NULL OR NOT EXISTS (SELECT 1 FROM clinzo.patient_access
    WHERE patient_id=p_patient_id AND identity_id=actor AND relationship IN ('guardian','delegate') AND revoked_at IS NULL)
    OR EXISTS (SELECT 1 FROM clinzo.patient_access WHERE patient_id=p_patient_id AND revoked_at IS NULL
      AND (relationship='self' OR identity_id<>actor)) THEN
    RAISE EXCEPTION 'Only your managed family profile can be edited' USING ERRCODE='42501'; END IF;
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
  UPDATE clinzo.patient SET full_name=n,birth_date=dob,reported_age_years=age_years,reported_age_on=current_date,
    gender_identity=p_profile->>'gender',blood_group=p_profile->>'blood_group',contact_phone=phone,
    profile_photo_path=CASE WHEN p_profile ? 'profile_photo_path' THEN p_profile->>'profile_photo_path' ELSE profile_photo_path END
    WHERE id=p_patient_id;
  UPDATE clinzo.patient_access SET family_relation=p_profile->>'relation',notify_emergency=coalesce((p_profile->>'notify')::boolean,false)
    WHERE patient_id=p_patient_id AND identity_id=actor AND revoked_at IS NULL;
  RETURN p_patient_id;
END $$;
REVOKE ALL ON FUNCTION public.update_my_family_profile(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_family_profile(uuid,jsonb) TO authenticated;

-- Newly created family profiles have no separate login identity. Their creator manages them.
-- Never grant access to an independently registered patient or a shared/delegated account.
UPDATE clinzo.patient_access pa SET verified_at=clock_timestamp()
WHERE pa.verified_at IS NULL AND pa.revoked_at IS NULL AND pa.relationship IN ('guardian','delegate')
  AND pa.family_relation IS NOT NULL
  AND EXISTS (SELECT 1 FROM clinzo.patient p WHERE p.id=pa.patient_id AND p.archived_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM clinzo.patient_access other WHERE other.patient_id=pa.patient_id
    AND other.revoked_at IS NULL AND (other.relationship='self' OR other.identity_id<>pa.identity_id));
