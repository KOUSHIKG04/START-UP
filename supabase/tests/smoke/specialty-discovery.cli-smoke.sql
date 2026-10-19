-- Only for the disposable project. Every fixture rolls back.
BEGIN;
DO $$
DECLARE
  fixture record;
  v_doctor_id uuid;
  v_specialty_id uuid;
BEGIN
  FOR fixture IN SELECT * FROM (VALUES
    ('General Physician', 'general_physician', 'fever'),
    ('Dermatologist', 'dermatologist', 'skin_rash'),
    ('Cardiologist', 'cardiologist', 'chest_pain'),
    ('Paediatrician', 'pediatrician', 'fever'),
    ('Orthopaedist', 'orthopedic', 'joint_pain'),
    ('Gynaecologist', 'gynecologist', 'menstrual_concerns'),
    ('ENT Specialist', 'ent_specialist', 'ear_pain'),
    ('Neurologist', 'neurologist', 'headache'),
    ('Dentist', 'dentist', 'toothache'),
    ('Psychiatrist', 'psychiatrist', 'anxiety')
  ) AS expected(claim_name, specialty_code, symptom_code) LOOP
    SELECT id INTO v_specialty_id FROM clinzo.specialty
      WHERE code = fixture.specialty_code AND active;
    IF v_specialty_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM clinzo.symptom sy
      JOIN clinzo.symptom_specialty ss ON ss.symptom_id = sy.id
      WHERE sy.code = fixture.symptom_code AND sy.active
        AND ss.specialty_id = v_specialty_id
    ) THEN
      RAISE EXCEPTION 'Missing symptom mapping for %', fixture.specialty_code;
    END IF;

    INSERT INTO clinzo.doctor(public_code, full_name, registration_authority,
      registration_number, practice_started_on, credential_status)
    VALUES ('DOC-' || gen_random_uuid(), 'Fixture ' || fixture.claim_name,
      'Fixture Council', gen_random_uuid()::text, '2020-01-01', 'pending')
    RETURNING id INTO v_doctor_id;
    INSERT INTO clinzo.doctor_onboarding_claim(doctor_id, reported_age_years,
      reported_gender, claimed_specialty, claimed_language, claimed_facility_name,
      contact_phone, license_storage_path)
    VALUES (v_doctor_id, 35, 'Other', fixture.claim_name, 'English',
      'Fixture Clinic', '+919876543210', v_doctor_id::text || '/licence.pdf');
    IF EXISTS (SELECT 1 FROM clinzo.doctor_specialty ds WHERE ds.doctor_id = v_doctor_id) THEN
      RAISE EXCEPTION 'Pending % became publicly searchable', fixture.claim_name;
    END IF;
    UPDATE clinzo.doctor SET credential_status = 'verified' WHERE id = v_doctor_id;
    IF (SELECT count(*) FROM clinzo.doctor_specialty ds WHERE ds.doctor_id = v_doctor_id) <> 1
      OR NOT EXISTS (SELECT 1 FROM clinzo.doctor_specialty ds
        WHERE ds.doctor_id = v_doctor_id AND ds.specialty_id = v_specialty_id) THEN
      RAISE EXCEPTION 'Incorrect reviewed specialty for %', fixture.claim_name;
    END IF;
  END LOOP;
END $$;
ROLLBACK;
SELECT true AS specialty_discovery_smoke_passed;
