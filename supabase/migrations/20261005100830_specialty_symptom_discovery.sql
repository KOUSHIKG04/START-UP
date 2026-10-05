-- Reference taxonomy belongs in migrations: hosted projects do not run the
-- optional demo seed. This adds only the ten specialties already modelled by
-- Clinzo, and conservative concern-to-specialty discovery relationships.
INSERT INTO clinzo.specialty(code, name, active) VALUES
  ('general_physician', 'General Physician', true),
  ('dermatologist', 'Dermatologist', true),
  ('cardiologist', 'Cardiologist', true),
  ('pediatrician', 'Pediatrician', true),
  ('orthopedic', 'Orthopedic', true),
  ('gynecologist', 'Gynecologist', true),
  ('ent_specialist', 'ENT Specialist', true),
  ('neurologist', 'Neurologist', true),
  ('dentist', 'Dentist', true),
  ('psychiatrist', 'Psychiatrist', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO clinzo.symptom(code, label, active) VALUES
  ('fever', 'Fever', true),
  ('cough_cold', 'Cough & Cold', true),
  ('headache', 'Headache', true),
  ('stomach_pain', 'Stomach Pain', true),
  ('back_pain', 'Back pain', true),
  ('skin_rash', 'Skin rash', true),
  ('breathing_issue', 'Breathing issue', true),
  ('chest_pain', 'Chest Pain', true),
  ('toothache', 'Toothache', true),
  ('menstrual_concerns', 'Menstrual concerns', true),
  ('anxiety', 'Anxiety', true),
  ('ear_pain', 'Ear pain', true),
  ('joint_pain', 'Joint pain', true),
  ('vertigo', 'Vertigo', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO clinzo.symptom_specialty(symptom_id, specialty_id)
SELECT sy.id, sp.id
FROM (VALUES
  ('fever', 'general_physician'), ('fever', 'pediatrician'),
  ('cough_cold', 'general_physician'), ('cough_cold', 'pediatrician'),
  ('cough_cold', 'ent_specialist'),
  ('headache', 'general_physician'), ('headache', 'neurologist'),
  ('stomach_pain', 'general_physician'),
  ('back_pain', 'general_physician'), ('back_pain', 'orthopedic'),
  ('skin_rash', 'general_physician'), ('skin_rash', 'dermatologist'),
  ('breathing_issue', 'general_physician'), ('breathing_issue', 'cardiologist'),
  ('chest_pain', 'cardiologist'),
  ('toothache', 'dentist'),
  ('menstrual_concerns', 'gynecologist'),
  ('anxiety', 'psychiatrist'),
  ('ear_pain', 'ent_specialist'),
  ('joint_pain', 'orthopedic'),
  ('vertigo', 'ent_specialist'), ('vertigo', 'neurologist')
) AS mapping(symptom_code, specialty_code)
JOIN clinzo.symptom sy ON sy.code = mapping.symptom_code
JOIN clinzo.specialty sp ON sp.code = mapping.specialty_code
ON CONFLICT (symptom_id, specialty_id) DO NOTHING;

-- Only exact claims in the registration choices can become a public specialty
-- after the company has approved the doctor's credentials. "Other" stays private.
CREATE FUNCTION clinzo.reviewed_specialty_code(p_claim text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE lower(trim(p_claim))
    WHEN 'general physician' THEN 'general_physician'
    WHEN 'cardiologist' THEN 'cardiologist'
    WHEN 'dermatologist' THEN 'dermatologist'
    WHEN 'paediatrician' THEN 'pediatrician'
    WHEN 'pediatrician' THEN 'pediatrician'
    WHEN 'gynaecologist' THEN 'gynecologist'
    WHEN 'gynecologist' THEN 'gynecologist'
    WHEN 'orthopaedist' THEN 'orthopedic'
    WHEN 'orthopedist' THEN 'orthopedic'
    WHEN 'orthopedic' THEN 'orthopedic'
    WHEN 'neurologist' THEN 'neurologist'
    WHEN 'ent specialist' THEN 'ent_specialist'
    WHEN 'dentist' THEN 'dentist'
    WHEN 'psychiatrist' THEN 'psychiatrist'
    ELSE NULL
  END;
$$;
REVOKE ALL ON FUNCTION clinzo.reviewed_specialty_code(text) FROM PUBLIC, anon, authenticated;

DROP TRIGGER attach_verified_general_physician_specialty ON clinzo.doctor;
DROP FUNCTION clinzo.attach_verified_general_physician_specialty();

CREATE FUNCTION clinzo.attach_verified_claimed_specialty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.credential_status = 'verified' AND NEW.active THEN
    INSERT INTO clinzo.doctor_specialty(doctor_id, specialty_id)
    SELECT NEW.id, sp.id
    FROM clinzo.doctor_onboarding_claim claim
    JOIN clinzo.specialty sp
      ON sp.code = clinzo.reviewed_specialty_code(claim.claimed_specialty)
      AND sp.active
    WHERE claim.doctor_id = NEW.id
    ON CONFLICT (doctor_id, specialty_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.attach_verified_claimed_specialty() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER attach_verified_claimed_specialty
AFTER INSERT OR UPDATE OF credential_status ON clinzo.doctor
FOR EACH ROW EXECUTE FUNCTION clinzo.attach_verified_claimed_specialty();

-- Match already approved doctors without making pending self-claims public.
INSERT INTO clinzo.doctor_specialty(doctor_id, specialty_id)
SELECT d.id, sp.id
FROM clinzo.doctor d
JOIN clinzo.doctor_onboarding_claim claim ON claim.doctor_id = d.id
JOIN clinzo.specialty sp
  ON sp.code = clinzo.reviewed_specialty_code(claim.claimed_specialty) AND sp.active
WHERE d.active AND d.credential_status = 'verified'
ON CONFLICT (doctor_id, specialty_id) DO NOTHING;
