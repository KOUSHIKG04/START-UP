-- Patient-entered age is a snapshot, not a fabricated birth date.
ALTER TABLE clinzo.patient
  ADD COLUMN reported_age_years smallint,
  ADD COLUMN reported_age_on date,
  ADD COLUMN gender_identity text,
  ADD COLUMN blood_group text,
  ADD COLUMN contact_email text,
  ADD COLUMN home_address jsonb;
ALTER TABLE clinzo.patient ADD CONSTRAINT patient_profile_age_ck
  CHECK (reported_age_years BETWEEN 0 AND 120 AND reported_age_on IS NOT NULL OR reported_age_years IS NULL AND reported_age_on IS NULL);
ALTER TABLE clinzo.patient ADD CONSTRAINT patient_profile_gender_ck
  CHECK (gender_identity IS NULL OR gender_identity IN ('Male','Female','Other','Prefer not to say'));
ALTER TABLE clinzo.patient ADD CONSTRAINT patient_profile_blood_ck
  CHECK (blood_group IS NULL OR blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-'));
ALTER TABLE clinzo.patient ADD CONSTRAINT patient_profile_address_ck
  CHECK (home_address IS NULL OR jsonb_typeof(home_address)='object');

ALTER TABLE clinzo.patient_access
  ADD COLUMN family_relation text,
  ADD COLUMN notify_emergency boolean NOT NULL DEFAULT false;
ALTER TABLE clinzo.patient_access ADD CONSTRAINT patient_access_family_relation_ck
  CHECK (family_relation IS NULL OR family_relation IN ('Son','Daughter','Father','Mother','Spouse','Sibling','Other'));

CREATE FUNCTION public.complete_patient_profile(p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; patient_id uuid; n text; age_years int; address_value jsonb;
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
  PERFORM public.complete_onboarding('patient',jsonb_build_object('full_name',n));
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
REVOKE ALL ON FUNCTION public.complete_patient_profile(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_patient_profile(jsonb) TO authenticated;

-- Family entries remain unverified: creating a record does not grant clinical access.
-- Identity/guardian consent and verification is a separate company workflow.
CREATE FUNCTION public.add_my_family_profile(p_profile jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; patient_id uuid; n text; age_years int; phone text;
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and profile are required' USING ERRCODE='42501'; END IF;
  SELECT id INTO actor FROM clinzo.identity WHERE issuer='supabase' AND subject=auth.uid()::text AND disabled_at IS NULL;
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM clinzo.patient_access
    WHERE identity_id=actor AND relationship='self' AND verified_at IS NOT NULL AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'Patient account required' USING ERRCODE='42501'; END IF;
  n:=trim(coalesce(p_profile->>'full_name','')); phone:=trim(coalesce(p_profile->>'phone',''));
  IF length(n) NOT BETWEEN 2 AND 120 OR coalesce(p_profile->>'age_years','') !~ '^[0-9]{1,3}$'
    OR phone !~ '^\+[1-9][0-9]{7,14}$'
    OR coalesce(p_profile->>'gender','') NOT IN ('Male','Female','Other','Prefer not to say')
    OR coalesce(p_profile->>'blood_group','') NOT IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')
    OR coalesce(p_profile->>'relation','') NOT IN ('Son','Daughter','Father','Mother','Spouse','Sibling','Other') THEN
    RAISE EXCEPTION 'Invalid family profile' USING ERRCODE='22023'; END IF;
  age_years:=(p_profile->>'age_years')::int;
  IF age_years NOT BETWEEN 0 AND 120 THEN RAISE EXCEPTION 'Invalid age' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.patient(public_code,full_name,reported_age_years,reported_age_on,
    gender_identity,blood_group,contact_phone)
    VALUES('PAT-'||gen_random_uuid()::text,n,age_years,current_date,p_profile->>'gender',
      p_profile->>'blood_group',phone) RETURNING id INTO patient_id;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,family_relation,notify_emergency)
    VALUES(patient_id,actor,CASE WHEN age_years<18 THEN 'guardian' ELSE 'delegate' END,
      p_profile->>'relation',coalesce((p_profile->>'notify')::boolean,false));
  RETURN patient_id;
END $$;
REVOKE ALL ON FUNCTION public.add_my_family_profile(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_my_family_profile(jsonb) TO authenticated;

CREATE FUNCTION public.list_my_family_profiles() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,
    'age_years',p.reported_age_years,'gender',p.gender_identity,'blood_group',p.blood_group,
    'relation',pa.family_relation,'phone',p.contact_phone,'verified',pa.verified_at IS NOT NULL)
    ORDER BY p.created_at DESC),'[]'::jsonb)
  FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    JOIN clinzo.identity i ON i.id=pa.identity_id
  WHERE auth.uid() IS NOT NULL AND i.issuer='supabase' AND i.subject=auth.uid()::text AND i.disabled_at IS NULL
    AND pa.relationship IN ('guardian','delegate') AND pa.revoked_at IS NULL AND p.archived_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.list_my_family_profiles() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_family_profiles() TO authenticated;

CREATE FUNCTION public.get_my_patient_profile_detail() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('id',p.id,'full_name',p.full_name,'age_years',p.reported_age_years,
    'age_recorded_on',p.reported_age_on,'gender',p.gender_identity,'blood_group',p.blood_group,
    'email',p.contact_email,'address',p.home_address)
  FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    JOIN clinzo.identity i ON i.id=pa.identity_id
  WHERE auth.uid() IS NOT NULL AND i.issuer='supabase' AND i.subject=auth.uid()::text
    AND i.disabled_at IS NULL AND pa.relationship='self' AND pa.verified_at IS NOT NULL
    AND pa.revoked_at IS NULL AND p.archived_at IS NULL LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_patient_profile_detail() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_patient_profile_detail() TO authenticated;
