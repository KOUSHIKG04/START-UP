-- The onboarding claim is private text; public symptom discovery uses reviewed
-- specialty relations. Keep the core General Physician taxonomy available on
-- clean projects, then attach it only when the company verifies the doctor.
INSERT INTO clinzo.specialty(code, name, active)
VALUES ('general_physician', 'General Physician', true)
ON CONFLICT (code) DO UPDATE SET active = true;

INSERT INTO clinzo.symptom(code, label, active)
VALUES
  ('fever', 'Fever', true),
  ('cough_cold', 'Cough & Cold', true),
  ('headache', 'Headache', true),
  ('stomach_pain', 'Stomach Pain', true),
  ('breathing_issue', 'Breathing issue', true)
ON CONFLICT (code) DO UPDATE SET active = true;

INSERT INTO clinzo.symptom_specialty(symptom_id, specialty_id)
SELECT sy.id, sp.id
FROM clinzo.symptom sy
CROSS JOIN clinzo.specialty sp
WHERE sp.code = 'general_physician'
  AND sy.code IN ('fever', 'cough_cold', 'headache', 'stomach_pain', 'breathing_issue')
ON CONFLICT (symptom_id, specialty_id) DO NOTHING;

CREATE FUNCTION clinzo.attach_verified_general_physician_specialty()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.credential_status = 'verified' AND NEW.active THEN
    INSERT INTO clinzo.doctor_specialty(doctor_id, specialty_id)
    SELECT NEW.id, sp.id
    FROM clinzo.doctor_onboarding_claim claim
    JOIN clinzo.specialty sp ON sp.code = 'general_physician' AND sp.active
    WHERE claim.doctor_id = NEW.id
      AND lower(trim(claim.claimed_specialty)) = 'general physician'
    ON CONFLICT (doctor_id, specialty_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.attach_verified_general_physician_specialty() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER attach_verified_general_physician_specialty
AFTER INSERT OR UPDATE OF credential_status ON clinzo.doctor
FOR EACH ROW EXECUTE FUNCTION clinzo.attach_verified_general_physician_specialty();

-- Existing company-approved General Physicians need the same relation.
INSERT INTO clinzo.doctor_specialty(doctor_id, specialty_id)
SELECT d.id, sp.id
FROM clinzo.doctor d
JOIN clinzo.doctor_onboarding_claim claim ON claim.doctor_id = d.id
JOIN clinzo.specialty sp ON sp.code = 'general_physician' AND sp.active
WHERE d.active AND d.credential_status = 'verified'
  AND lower(trim(claim.claimed_specialty)) = 'general physician'
ON CONFLICT (doctor_id, specialty_id) DO NOTHING;
