-- Only for the disposable project. The doctor fixture is rolled back.
BEGIN;
DO $$
DECLARE
  v_doctor_id uuid;
  v_pending_doctor_id uuid;
  general_specialty_id uuid;
BEGIN
  SELECT id INTO general_specialty_id FROM clinzo.specialty WHERE code = 'general_physician' AND active;
  IF general_specialty_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM clinzo.symptom sy
    JOIN clinzo.symptom_specialty ss ON ss.symptom_id = sy.id
    WHERE sy.code = 'fever' AND sy.active AND ss.specialty_id = general_specialty_id
  ) OR NOT EXISTS (
    SELECT 1 FROM clinzo.symptom sy
    JOIN clinzo.symptom_specialty ss ON ss.symptom_id = sy.id
    WHERE sy.code = 'cough_cold' AND sy.active AND ss.specialty_id = general_specialty_id
  ) THEN
    RAISE EXCEPTION 'General Physician fever/cough taxonomy missing';
  END IF;

  INSERT INTO clinzo.doctor(public_code, full_name, registration_authority,
    registration_number, practice_started_on, credential_status)
  VALUES ('DOC-' || gen_random_uuid(), 'Fixture General Physician', 'Fixture Council',
    gen_random_uuid()::text, '2020-01-01', 'pending') RETURNING id INTO v_doctor_id;
  INSERT INTO clinzo.doctor_onboarding_claim(doctor_id, reported_age_years,
    reported_gender, claimed_specialty, claimed_language, claimed_facility_name,
    contact_phone, license_storage_path)
  VALUES (v_doctor_id, 35, 'Other', 'General Physician', 'English',
    'Fixture Clinic', '+919876543210', v_doctor_id::text || '/licence.pdf');
  IF EXISTS (SELECT 1 FROM clinzo.doctor_specialty ds WHERE ds.doctor_id = v_doctor_id) THEN
    RAISE EXCEPTION 'Pending doctor gained public specialty';
  END IF;
  UPDATE clinzo.doctor SET credential_status = 'verified' WHERE id = v_doctor_id;
  IF NOT EXISTS (SELECT 1 FROM clinzo.doctor_specialty ds
    WHERE ds.doctor_id = v_doctor_id AND ds.specialty_id = general_specialty_id) THEN
    RAISE EXCEPTION 'Verified General Physician specialty missing';
  END IF;

  INSERT INTO clinzo.doctor(public_code, full_name, registration_authority,
    registration_number, practice_started_on, credential_status)
  VALUES ('DOC-' || gen_random_uuid(), 'Fixture Unrelated Doctor', 'Fixture Council',
    gen_random_uuid()::text, '2020-01-01', 'pending') RETURNING id INTO v_pending_doctor_id;
  INSERT INTO clinzo.doctor_onboarding_claim(doctor_id, reported_age_years,
    reported_gender, claimed_specialty, claimed_language, claimed_facility_name,
    contact_phone, license_storage_path)
  VALUES (v_pending_doctor_id, 35, 'Other', 'Dermatologist', 'English',
    'Fixture Clinic', '+919876543210', v_pending_doctor_id::text || '/licence.pdf');
  UPDATE clinzo.doctor SET credential_status = 'verified' WHERE id = v_pending_doctor_id;
  IF EXISTS (SELECT 1 FROM clinzo.doctor_specialty ds
    WHERE ds.doctor_id = v_pending_doctor_id AND ds.specialty_id = general_specialty_id) THEN
    RAISE EXCEPTION 'Unrelated specialty incorrectly mapped to General Physician';
  END IF;
END $$;
ROLLBACK;
SELECT true AS general_physician_discovery_smoke_passed;
