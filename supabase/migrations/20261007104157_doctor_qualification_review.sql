-- Keep the doctor's unverified claim separate from the patient-facing,
-- company-approved qualification already stored on clinzo.doctor.
ALTER TABLE clinzo.doctor_onboarding_claim
  ADD COLUMN claimed_qualification text,
  ADD COLUMN reviewed_qualification text,
  ADD CONSTRAINT doctor_claimed_qualification_length_ck
    CHECK (claimed_qualification IS NULL OR length(claimed_qualification) BETWEEN 2 AND 160),
  ADD CONSTRAINT doctor_reviewed_qualification_length_ck
    CHECK (reviewed_qualification IS NULL OR length(reviewed_qualification) BETWEEN 2 AND 160);

CREATE OR REPLACE FUNCTION public.submit_my_doctor_claim(p_claim jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE doctor_row clinzo.doctor; license_path text; degree_path text;
  qualification text := trim(coalesce(p_claim->>'qualification', ''));
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_claim) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and claim are required' USING ERRCODE = '42501'; END IF;
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
    OR length(coalesce(p_claim->>'email', '')) > 254 THEN
    RAISE EXCEPTION 'Invalid credential claim' USING ERRCODE = '22023'; END IF;
  INSERT INTO clinzo.doctor_onboarding_claim(doctor_id, reported_age_years, reported_gender,
    claimed_specialty, claimed_language, claimed_facility_name, contact_email, contact_phone,
    license_storage_path, degree_storage_path, claimed_qualification)
    VALUES(doctor_row.id, (p_claim->>'age_years')::int, p_claim->>'gender', trim(p_claim->>'specialty'),
      trim(p_claim->>'language'), trim(p_claim->>'facility_name'), nullif(trim(coalesce(p_claim->>'email', '')), ''),
      p_claim->>'phone', license_path, degree_path, qualification)
    ON CONFLICT(doctor_id) DO UPDATE SET reported_age_years = excluded.reported_age_years,
      reported_gender = excluded.reported_gender, claimed_specialty = excluded.claimed_specialty,
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

-- Existing doctors can supply a missing qualification without replacing their
-- already-uploaded degree. A changed claim reopens the degree decision.
CREATE FUNCTION public.submit_my_doctor_qualification(p_qualification text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); doctor_row clinzo.doctor;
  new_qualification text := trim(coalesce(p_qualification, ''));
BEGIN
  IF length(new_qualification) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Enter qualifications between 2 and 160 characters' USING ERRCODE = '22023'; END IF;
  SELECT d.* INTO doctor_row FROM clinzo.doctor d
    WHERE d.identity_id = actor AND d.active AND d.credential_status IN ('pending', 'verified')
    FOR UPDATE;
  IF doctor_row.id IS NULL OR NOT EXISTS (SELECT 1 FROM clinzo.doctor_onboarding_claim c
      WHERE c.doctor_id = doctor_row.id AND c.degree_storage_path IS NOT NULL) THEN
    RAISE EXCEPTION 'Doctor degree claim required' USING ERRCODE = '42501'; END IF;
  UPDATE clinzo.doctor_onboarding_claim
    SET claimed_qualification = new_qualification, reviewed_qualification = NULL, updated_at = now()
    WHERE doctor_id = doctor_row.id AND claimed_qualification IS DISTINCT FROM new_qualification;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_my_doctor_qualification(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_doctor_qualification(text) TO authenticated;

CREATE FUNCTION clinzo.reopen_degree_on_qualification_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE degree_document clinzo.verification_document; case_id uuid;
BEGIN
  IF NEW.claimed_qualification IS NOT DISTINCT FROM OLD.claimed_qualification THEN RETURN NEW; END IF;
  SELECT c.id INTO case_id FROM clinzo.verification_case c WHERE c.doctor_id = NEW.doctor_id FOR UPDATE;
  SELECT vd.* INTO degree_document FROM clinzo.verification_document vd
    WHERE vd.case_id = case_id AND vd.kind = 'medical_degree'
    ORDER BY vd.version DESC LIMIT 1 FOR UPDATE;
  IF degree_document.status = 'approved' THEN
    UPDATE clinzo.verification_document SET status = 'pending', reviewed_at = NULL,
      reviewer_id = NULL, rejection_reason = NULL WHERE id = degree_document.id;
    UPDATE clinzo.verification_case SET status = 'under_review', reviewed_at = NULL WHERE id = case_id;
    INSERT INTO clinzo.verification_event(case_id, document_id, action)
      VALUES(case_id, degree_document.id, 'resubmitted');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reopen_degree_on_qualification_change
  AFTER UPDATE OF claimed_qualification ON clinzo.doctor_onboarding_claim
  FOR EACH ROW EXECUTE FUNCTION clinzo.reopen_degree_on_qualification_change();
REVOKE ALL ON FUNCTION clinzo.reopen_degree_on_qualification_change() FROM PUBLIC, anon, authenticated;

-- Approving the degree explicitly approves the claim visible beside that file.
CREATE FUNCTION clinzo.record_reviewed_doctor_qualification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_doctor_id uuid; v_qualification text;
BEGIN
  IF NEW.kind <> 'medical_degree' OR NEW.status <> 'approved'
    OR OLD.status = 'approved' THEN RETURN NEW; END IF;
  SELECT c.doctor_id INTO v_doctor_id FROM clinzo.verification_case c WHERE c.id = NEW.case_id;
  SELECT dc.claimed_qualification INTO v_qualification FROM clinzo.doctor_onboarding_claim dc
    WHERE dc.doctor_id = v_doctor_id FOR UPDATE;
  IF length(coalesce(v_qualification, '')) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Doctor must submit qualifications before degree approval' USING ERRCODE = '22023'; END IF;
  UPDATE clinzo.doctor_onboarding_claim SET reviewed_qualification = v_qualification
    WHERE doctor_id = v_doctor_id;
  RETURN NEW;
END $$;
CREATE TRIGGER record_reviewed_doctor_qualification
  AFTER UPDATE OF status ON clinzo.verification_document
  FOR EACH ROW EXECUTE FUNCTION clinzo.record_reviewed_doctor_qualification();
REVOKE ALL ON FUNCTION clinzo.record_reviewed_doctor_qualification() FROM PUBLIC, anon, authenticated;

-- Existing verified doctors are not changed by this migration. New or reopened
-- cases publish only the exact qualification paired with the approved degree.
CREATE FUNCTION clinzo.publish_reviewed_doctor_qualification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_qualification text;
BEGIN
  IF NEW.doctor_id IS NULL OR NEW.status <> 'verified'
    OR OLD.status = 'verified' THEN RETURN NEW; END IF;
  SELECT dc.reviewed_qualification INTO v_qualification FROM clinzo.doctor_onboarding_claim dc
    WHERE dc.doctor_id = NEW.doctor_id AND dc.reviewed_qualification = dc.claimed_qualification;
  IF length(coalesce(v_qualification, '')) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'Approve the claimed qualification with the degree certificate first'
      USING ERRCODE = '22023'; END IF;
  UPDATE clinzo.doctor SET qualification = v_qualification WHERE id = NEW.doctor_id;
  RETURN NEW;
END $$;
CREATE TRIGGER publish_reviewed_doctor_qualification
  BEFORE UPDATE OF status ON clinzo.verification_case
  FOR EACH ROW EXECUTE FUNCTION clinzo.publish_reviewed_doctor_qualification();
REVOKE ALL ON FUNCTION clinzo.publish_reviewed_doctor_qualification() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_doctor_profile() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', d.id, 'full_name', d.full_name, 'bio', d.bio,
    'qualification', d.qualification, 'qualification_claim', dc.claimed_qualification,
    'registration_authority', d.registration_authority, 'registration_number', d.registration_number,
    'practice_started_on', d.practice_started_on, 'credential_status', d.credential_status,
    'booking_timezone', d.booking_timezone,
    'languages', (SELECT coalesce(jsonb_agg(dl.language_code ORDER BY dl.language_code), '[]'::jsonb)
      FROM clinzo.doctor_language dl WHERE dl.doctor_id = d.id),
    'specialties', (SELECT coalesce(jsonb_agg(jsonb_build_object('code', sp.code, 'name', sp.name) ORDER BY sp.name), '[]'::jsonb)
      FROM clinzo.doctor_specialty ds JOIN clinzo.specialty sp ON sp.id = ds.specialty_id
      WHERE ds.doctor_id = d.id AND sp.active),
    'facilities', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'practice_id', df.id, 'facility_id', f.id, 'facility_name', f.name, 'facility_kind', f.kind,
      'address', f.address, 'active', df.active AND f.active) ORDER BY f.name), '[]'::jsonb)
      FROM clinzo.doctor_facility df JOIN clinzo.facility f ON f.id = df.facility_id WHERE df.doctor_id = d.id)
  ) INTO result FROM clinzo.doctor d
  LEFT JOIN clinzo.doctor_onboarding_claim dc ON dc.doctor_id = d.id
  WHERE d.identity_id = actor AND d.active;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_company_verification_case(p_case_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF clinzo.company_reviewer_identity() IS NULL THEN
    RAISE EXCEPTION 'Company reviewer required' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object('id', c.id, 'status', c.status, 'submitted_at', c.submitted_at,
      'subject_type', CASE WHEN c.doctor_id IS NOT NULL THEN 'doctor'
        WHEN c.facility_id IS NOT NULL THEN 'facility' ELSE 'driver' END,
      'subject_name', coalesce(d.full_name, f.name, a.full_name),
      'doctor', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
        'registration_authority', d.registration_authority, 'registration_number', d.registration_number,
        'claimed_qualification', dc.claimed_qualification,
        'reviewed_qualification', dc.reviewed_qualification,
        'claimed_specialty', dc.claimed_specialty, 'claimed_facility_name', dc.claimed_facility_name,
        'contact_phone', dc.contact_phone) END,
      'facility', CASE WHEN f.id IS NULL THEN NULL ELSE jsonb_build_object(
        'kind', f.kind, 'address', f.address, 'registration_number', f.registration_number) END,
      'driver', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
        'city', a.city, 'contact_phone', a.contact_phone, 'date_of_birth', a.date_of_birth,
        'registration_number', a.registration_number, 'capability_code', a.capability_code) END,
      'documents', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind,
        'bucket_id', x.bucket_id, 'storage_path', x.storage_path, 'version', x.version,
        'status', x.status, 'rejection_reason', x.rejection_reason,
        'submitted_at', x.submitted_at, 'reviewed_at', x.reviewed_at)
        ORDER BY x.kind, x.version DESC), '[]'::jsonb)
        FROM clinzo.verification_document x WHERE x.case_id = c.id),
      'history', (SELECT coalesce(jsonb_agg(jsonb_build_object('action', e.action,
        'document_id', e.document_id, 'reason', e.reason, 'created_at', e.created_at)
        ORDER BY e.created_at DESC), '[]'::jsonb)
        FROM clinzo.verification_event e WHERE e.case_id = c.id)) INTO result
  FROM clinzo.verification_case c
  LEFT JOIN clinzo.doctor d ON d.id = c.doctor_id
  LEFT JOIN clinzo.doctor_onboarding_claim dc ON dc.doctor_id = d.id
  LEFT JOIN clinzo.facility f ON f.id = c.facility_id
  LEFT JOIN clinzo.driver_registration_application a ON a.id = c.driver_application_id
  WHERE c.id = p_case_id;
  RETURN result;
END $$;
