-- Contact email is required even when the account signs in using a phone number.
CREATE OR REPLACE FUNCTION public.submit_my_doctor_claim(p_claim jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE doctor_row clinzo.doctor; license_path text; degree_path text;
  specialty_names text[]; dob date; calculated_age integer; qualification text := trim(coalesce(p_claim->>'qualification', ''));
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_claim) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and claim are required' USING ERRCODE = '42501'; END IF;
  IF p_claim ? 'specialties' THEN
    IF jsonb_typeof(p_claim->'specialties') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Specialties must be a list' USING ERRCODE='22023';
    END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_claim->'specialties') item WHERE jsonb_typeof(item) <> 'string') THEN
      RAISE EXCEPTION 'Specialty names must be text' USING ERRCODE='22023';
    END IF;
    SELECT array_agg(trim(value)) INTO specialty_names FROM jsonb_array_elements_text(p_claim->'specialties');
    IF cardinality(specialty_names) IS NULL OR cardinality(specialty_names) NOT BETWEEN 1 AND 12
      OR EXISTS(SELECT 1 FROM unnest(specialty_names) n WHERE n IS NULL OR length(n) NOT BETWEEN 2 AND 120 OR lower(n)='other')
      OR (SELECT count(DISTINCT lower(n)) FROM unnest(specialty_names) n) <> cardinality(specialty_names) THEN
      RAISE EXCEPTION 'Select distinct specialties and provide a name for Other' USING ERRCODE='22023';
    END IF;
    p_claim := jsonb_set(p_claim,'{specialty}',to_jsonb(specialty_names[1]));
  ELSE
    specialty_names := ARRAY[trim(p_claim->>'specialty')];
  END IF;
  IF p_claim ? 'birth_date' THEN
    IF coalesce(p_claim->>'birth_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE = '22023';
    END IF;
    BEGIN
      dob := (p_claim->>'birth_date')::date;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE = '22023';
    END;
    calculated_age := extract(year FROM age(current_date, dob))::integer;
    IF dob > current_date OR calculated_age NOT BETWEEN 18 AND 100 THEN
      RAISE EXCEPTION 'Doctor age must be between 18 and 100' USING ERRCODE = '22023';
    END IF;
    p_claim := jsonb_set(p_claim, '{age_years}', to_jsonb(calculated_age));
  END IF;
  SELECT d.* INTO doctor_row FROM clinzo.doctor d JOIN clinzo.identity i ON i.id = d.identity_id
    WHERE i.issuer = 'supabase' AND i.subject = auth.uid()::text AND i.disabled_at IS NULL
      AND d.active AND d.credential_status = 'pending' FOR UPDATE OF d;
  IF doctor_row.id IS NULL THEN RAISE EXCEPTION 'Pending doctor account required' USING ERRCODE = '42501'; END IF;
  license_path := trim(coalesce(p_claim->>'license_path', ''));
  degree_path := trim(coalesce(p_claim->>'degree_path', ''));
  IF license_path = degree_path OR split_part(license_path, '/', 1) <> auth.uid()::text
    OR split_part(degree_path, '/', 1) <> auth.uid()::text
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'doctor-licenses' AND name = license_path)
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'doctor-licenses' AND name = degree_path)
    OR length(qualification) NOT BETWEEN 2 AND 160
    OR coalesce(p_claim->>'age_years', '') !~ '^[0-9]{2,3}$'
    OR (p_claim->>'age_years')::int NOT BETWEEN 18 AND 100
    OR coalesce(p_claim->>'gender', '') NOT IN ('Male', 'Female', 'Other', 'Prefer not to say')
    OR length(trim(coalesce(p_claim->>'specialty', ''))) NOT BETWEEN 2 AND 120
    OR length(trim(coalesce(p_claim->>'language', ''))) NOT BETWEEN 2 AND 80
    OR length(trim(coalesce(p_claim->>'facility_name', ''))) NOT BETWEEN 2 AND 160
    OR coalesce(p_claim->>'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    OR length(coalesce(p_claim->>'email', '')) > 254
    OR trim(coalesce(p_claim->>'email', '')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid credential claim' USING ERRCODE = '22023'; END IF;
  INSERT INTO clinzo.doctor_onboarding_claim(doctor_id, birth_date, reported_age_years, reported_gender,
    claimed_specialty, claimed_specialties, claimed_language, claimed_facility_name, contact_email, contact_phone,
    license_storage_path, degree_storage_path, claimed_qualification)
    VALUES(doctor_row.id, dob, (p_claim->>'age_years')::int, p_claim->>'gender', trim(p_claim->>'specialty'),
      specialty_names, trim(p_claim->>'language'), trim(p_claim->>'facility_name'), nullif(trim(coalesce(p_claim->>'email', '')), ''),
      p_claim->>'phone', license_path, degree_path, qualification)
    ON CONFLICT(doctor_id) DO UPDATE SET birth_date = coalesce(excluded.birth_date, clinzo.doctor_onboarding_claim.birth_date), reported_age_years = excluded.reported_age_years,
      reported_gender = excluded.reported_gender, claimed_specialty = excluded.claimed_specialty, claimed_specialties = excluded.claimed_specialties,
      claimed_language = excluded.claimed_language, claimed_facility_name = excluded.claimed_facility_name,
      contact_email = excluded.contact_email, contact_phone = excluded.contact_phone,
      license_storage_path = excluded.license_storage_path,
      degree_storage_path = excluded.degree_storage_path,
      claimed_qualification = excluded.claimed_qualification,
      reviewed_qualification = CASE WHEN clinzo.doctor_onboarding_claim.claimed_qualification
        IS DISTINCT FROM excluded.claimed_qualification THEN NULL
        ELSE clinzo.doctor_onboarding_claim.reviewed_qualification END,
      updated_at = now();
  RETURN true;
END $$;