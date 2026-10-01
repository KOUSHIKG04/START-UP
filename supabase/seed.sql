-- Clinzo Demo Seed Data for Doctors, Hospitals, Specialties, Symptoms, Ambulance Drivers, and Fleet
-- Safe for repeated runs on the development / disposable Supabase project.

DO $$
DECLARE
  v_org_manipal uuid := '20000000-0000-4000-8000-000000000001';
  v_org_apollo uuid := '20000000-0000-4000-8000-000000000002';
  v_org_fortis uuid := '20000000-0000-4000-8000-000000000003';
  v_org_aster uuid := '20000000-0000-4000-8000-000000000004';
  v_org_clinzo uuid := '20000000-0000-4000-8000-000000000005';
  v_org_ambulance uuid := '20000000-0000-4000-8000-000000000006';

  v_fac_manipal uuid := '30000000-0000-4000-8000-000000000001';
  v_fac_apollo uuid := '30000000-0000-4000-8000-000000000002';
  v_fac_fortis uuid := '30000000-0000-4000-8000-000000000003';
  v_fac_aster uuid := '30000000-0000-4000-8000-000000000004';
  v_fac_indiranagar uuid := '30000000-0000-4000-8000-000000000005';
  v_fac_koramangala uuid := '30000000-0000-4000-8000-000000000006';
  v_fac_whitefield uuid := '30000000-0000-4000-8000-000000000007';

  v_spec_gen uuid := '40000000-0000-4000-8000-000000000001';
  v_spec_derm uuid := '40000000-0000-4000-8000-000000000002';
  v_spec_cardio uuid := '40000000-0000-4000-8000-000000000003';
  v_spec_pedia uuid := '40000000-0000-4000-8000-000000000004';
  v_spec_ortho uuid := '40000000-0000-4000-8000-000000000005';
  v_spec_gyne uuid := '40000000-0000-4000-8000-000000000006';
  v_spec_ent uuid := '40000000-0000-4000-8000-000000000007';
  v_spec_neuro uuid := '40000000-0000-4000-8000-000000000008';
  v_spec_dent uuid := '40000000-0000-4000-8000-000000000009';
  v_spec_psych uuid := '40000000-0000-4000-8000-000000000010';

  v_doc_priya uuid := '50000000-0000-4000-8000-000000000001';
  v_doc_rajesh uuid := '50000000-0000-4000-8000-000000000002';
  v_doc_ananya uuid := '50000000-0000-4000-8000-000000000003';
  v_doc_vikram uuid := '50000000-0000-4000-8000-000000000004';
  v_doc_sneha uuid := '50000000-0000-4000-8000-000000000005';
  v_doc_arvind uuid := '50000000-0000-4000-8000-000000000006';
  v_doc_meera uuid := '50000000-0000-4000-8000-000000000007';
  v_doc_rohan uuid := '50000000-0000-4000-8000-000000000008';

  v_prac_priya uuid := '60000000-0000-4000-8000-000000000001';
  v_prac_rajesh uuid := '60000000-0000-4000-8000-000000000002';
  v_prac_ananya uuid := '60000000-0000-4000-8000-000000000003';
  v_prac_vikram uuid := '60000000-0000-4000-8000-000000000004';
  v_prac_sneha uuid := '60000000-0000-4000-8000-000000000005';
  v_prac_arvind uuid := '60000000-0000-4000-8000-000000000006';
  v_prac_meera uuid := '60000000-0000-4000-8000-000000000007';
  v_prac_rohan uuid := '60000000-0000-4000-8000-000000000008';

  v_srv_priya uuid := '70000000-0000-4000-8000-000000000001';
  v_srv_rajesh uuid := '70000000-0000-4000-8000-000000000002';
  v_srv_ananya uuid := '70000000-0000-4000-8000-000000000003';
  v_srv_vikram uuid := '70000000-0000-4000-8000-000000000004';
  v_srv_sneha uuid := '70000000-0000-4000-8000-000000000005';
  v_srv_arvind uuid := '70000000-0000-4000-8000-000000000006';
  v_srv_meera uuid := '70000000-0000-4000-8000-000000000007';
  v_srv_rohan uuid := '70000000-0000-4000-8000-000000000008';

  v_cap_bls uuid;
  v_cap_als uuid;
  v_cap_nicu uuid;

  v_veh_bls_1 uuid := '80000000-0000-4000-8000-000000000001';
  v_veh_als_1 uuid := '80000000-0000-4000-8000-000000000002';
  v_veh_nicu_1 uuid := '80000000-0000-4000-8000-000000000003';
  v_veh_bls_2 uuid := '80000000-0000-4000-8000-000000000004';

  v_drv_suresh uuid := '90000000-0000-4000-8000-000000000001';
  v_drv_ramesh uuid := '90000000-0000-4000-8000-000000000002';
  v_drv_farhan uuid := '90000000-0000-4000-8000-000000000003';
  v_drv_kiran uuid := '90000000-0000-4000-8000-000000000004';

  v_shift_suresh uuid := 'a0000000-0000-4000-8000-000000000001';
  v_shift_ramesh uuid := 'a0000000-0000-4000-8000-000000000002';
  v_shift_farhan uuid := 'a0000000-0000-4000-8000-000000000003';

  d_idx int;
  slot_day date;
  b_day_id uuid;
  sess_id uuid;
  slot_start timestamptz;
BEGIN
  -- 1. Capabilities
  INSERT INTO clinzo.capability(code, description) VALUES
    ('BLS', 'Basic life support ambulance with emergency medical technician, oxygen, and automated external defibrillator'),
    ('ALS', 'Advanced life support ambulance with critical care paramedic, ventilator, defibrillator, and infusion equipment'),
    ('NICU', 'Neonatal intensive care ambulance with transport incubator, neonatal ventilator, and specialized care crew')
  ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;

  SELECT id INTO v_cap_bls FROM clinzo.capability WHERE code='BLS';
  SELECT id INTO v_cap_als FROM clinzo.capability WHERE code='ALS';
  SELECT id INTO v_cap_nicu FROM clinzo.capability WHERE code='NICU';

  -- 2. Specialties
  INSERT INTO clinzo.specialty(id, code, name, active) VALUES
    (v_spec_gen, 'general_physician', 'General Physician', true),
    (v_spec_derm, 'dermatologist', 'Dermatologist', true),
    (v_spec_cardio, 'cardiologist', 'Cardiologist', true),
    (v_spec_pedia, 'pediatrician', 'Pediatrician', true),
    (v_spec_ortho, 'orthopedic', 'Orthopedic', true),
    (v_spec_gyne, 'gynecologist', 'Gynecologist', true),
    (v_spec_ent, 'ent_specialist', 'ENT Specialist', true),
    (v_spec_neuro, 'neurologist', 'Neurologist', true),
    (v_spec_dent, 'dentist', 'Dentist', true),
    (v_spec_psych, 'psychiatrist', 'Psychiatrist', true)
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, active = true;

  -- 3. Symptoms and Symptom-Specialty mappings
  INSERT INTO clinzo.symptom(code, label, active) VALUES
    ('fever', 'Fever', true),
    ('cough_cold', 'Cough & Cold', true),
    ('headache', 'Headache', true),
    ('stomach_pain', 'Stomach Pain', true),
    ('back_pain', 'Back pain', true),
    ('skin_rash', 'Skin rash', true),
    ('breathing_issue', 'Breathing issue', true),
    ('chest_pain', 'Chest Pain', true),
    ('toothache', 'Toothache', true)
  ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, active = true;

  -- Map symptoms to specialties
  INSERT INTO clinzo.symptom_specialty(symptom_id, specialty_id)
  SELECT s.id, sp.id FROM clinzo.symptom s, clinzo.specialty sp
  WHERE (s.code='fever' AND sp.code IN ('general_physician','pediatrician'))
     OR (s.code='cough_cold' AND sp.code IN ('general_physician','ent_specialist'))
     OR (s.code='headache' AND sp.code IN ('general_physician','neurologist'))
     OR (s.code='stomach_pain' AND sp.code = 'general_physician')
     OR (s.code='back_pain' AND sp.code = 'orthopedic')
     OR (s.code='skin_rash' AND sp.code = 'dermatologist')
     OR (s.code='breathing_issue' AND sp.code IN ('general_physician','cardiologist'))
     OR (s.code='chest_pain' AND sp.code = 'cardiologist')
     OR (s.code='toothache' AND sp.code = 'dentist')
  ON CONFLICT DO NOTHING;

  -- 4. Organizations (Hospitals, Clinics, Ambulance)
  INSERT INTO clinzo.organization(id, public_code, name, kind, active) VALUES
    (v_org_manipal, 'ORG-MANIPAL-BLR', 'Manipal Hospitals Bangalore', 'care_provider', true),
    (v_org_apollo, 'ORG-APOLLO-BLR', 'Apollo Hospital Karnataka', 'care_provider', true),
    (v_org_fortis, 'ORG-FORTIS-BLR', 'Fortis Healthcare Bengaluru', 'care_provider', true),
    (v_org_aster, 'ORG-ASTER-BLR', 'Aster CMI Hospital', 'care_provider', true),
    (v_org_clinzo, 'ORG-CLINZO-CARE', 'Clinzo Primary Health Network', 'care_provider', true),
    (v_org_ambulance, 'ORG-RAPID-AMB', 'Clinzo Rapid Emergency Fleet', 'ambulance_operator', true)
  ON CONFLICT (public_code) DO UPDATE SET name = EXCLUDED.name, active = true;

  -- 5. Facilities / Hospitals (with Bengaluru coordinates for distance calculation)
  INSERT INTO clinzo.facility(id, organization_id, public_code, name, kind, address, location, active) VALUES
    (v_fac_manipal, v_org_manipal, 'HOS-MANIPAL-HAL', 'Manipal Hospital', 'hospital',
     '98 HAL Old Airport Rd, Kodihalli, Bengaluru, Karnataka 560017',
     extensions.ST_SetSRID(extensions.ST_MakePoint(77.6517, 12.9587), 4326)::extensions.geography, true),

    (v_fac_apollo, v_org_apollo, 'HOS-APOLLO-BGT', 'Apollo Hospital', 'hospital',
     '154/11 Bannerghatta Main Rd, Opposite IIMB, Bengaluru, Karnataka 560076',
     extensions.ST_SetSRID(extensions.ST_MakePoint(77.5986, 12.8942), 4326)::extensions.geography, true),

    (v_fac_fortis, v_org_fortis, 'HOS-FORTIS-BGT', 'Fortis Hospital', 'hospital',
     '154/9 Bannerghatta Main Rd, Sahyadri Layout, Bengaluru, Karnataka 560076',
     extensions.ST_SetSRID(extensions.ST_MakePoint(77.5981, 12.8950), 4326)::extensions.geography, true),

    (v_fac_aster, v_org_aster, 'HOS-ASTER-HEB', 'Aster CMI Hospital', 'hospital',
     'No. 43/42 NH 44, Sahakar Nagar, Hebbal, Bengaluru, Karnataka 560092',
     extensions.ST_SetSRID(extensions.ST_MakePoint(77.5926, 13.0569), 4326)::extensions.geography, true),

    (v_fac_indiranagar, v_org_clinzo, 'CLI-CLINZO-IND', 'Clinzo Care Clinic - Indiranagar', 'clinic',
     '12th Main Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
     extensions.ST_SetSRID(extensions.ST_MakePoint(77.6412, 12.9719), 4326)::extensions.geography, true),

    (v_fac_koramangala, v_org_clinzo, 'CLI-CLINZO-KOR', 'Clinzo Health Clinic - Koramangala', 'clinic',
     '80 Feet Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
     extensions.ST_SetSRID(extensions.ST_MakePoint(77.6256, 12.9345), 4326)::extensions.geography, true),

    (v_fac_whitefield, v_org_clinzo, 'CLI-CLINZO-WHT', 'Clinzo Multispecialty Clinic - Whitefield', 'clinic',
     'ITPL Main Rd, Whitefield, Bengaluru, Karnataka 560066',
     extensions.ST_SetSRID(extensions.ST_MakePoint(77.7471, 12.9866), 4326)::extensions.geography, true)
  ON CONFLICT (public_code) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, location = EXCLUDED.location, active = true;

  -- 6. Doctors Identities and Profiles
  INSERT INTO clinzo.identity(id, issuer, subject, display_name) VALUES
    ('10000000-0000-4000-8000-000000000011', 'urn:clinzo:seed', 'doc-priya-sharma', 'Dr. Priya Sharma'),
    ('10000000-0000-4000-8000-000000000012', 'urn:clinzo:seed', 'doc-rajesh-menon', 'Dr. Rajesh Menon'),
    ('10000000-0000-4000-8000-000000000013', 'urn:clinzo:seed', 'doc-ananya-rao', 'Dr. Ananya Rao'),
    ('10000000-0000-4000-8000-000000000014', 'urn:clinzo:seed', 'doc-vikram-patel', 'Dr. Vikram Patel'),
    ('10000000-0000-4000-8000-000000000015', 'urn:clinzo:seed', 'doc-sneha-kulkarni', 'Dr. Sneha Kulkarni'),
    ('10000000-0000-4000-8000-000000000016', 'urn:clinzo:seed', 'doc-arvind-kumar', 'Dr. Arvind Kumar'),
    ('10000000-0000-4000-8000-000000000017', 'urn:clinzo:seed', 'doc-meera-iyer', 'Dr. Meera Iyer'),
    ('10000000-0000-4000-8000-000000000018', 'urn:clinzo:seed', 'doc-rohan-verma', 'Dr. Rohan Verma')
  ON CONFLICT (issuer, subject) DO UPDATE SET display_name = EXCLUDED.display_name;

  INSERT INTO clinzo.doctor(id, identity_id, public_code, full_name, bio, registration_authority, registration_number, practice_started_on, credential_status, active, booking_timezone) VALUES
    (v_doc_priya, '10000000-0000-4000-8000-000000000011', 'DOC-PRIYA-01', 'Dr. Priya Sharma',
     'Senior Consultant Physician with 12+ years of clinical experience in internal medicine, lifestyle disorders, hypertension, diabetes care, and preventive health.',
     'Karnataka Medical Council', 'KMC-78901', '2012-04-10', 'verified', true, 'Asia/Kolkata'),

    (v_doc_rajesh, '10000000-0000-4000-8000-000000000012', 'DOC-RAJESH-02', 'Dr. Rajesh Menon',
     'Chief Interventional Cardiologist with 16+ years of clinical expertise. Specialized in adult cardiac interventions, angiography, heart failure management, and preventive cardiology.',
     'Karnataka Medical Council', 'KMC-54321', '2008-01-15', 'verified', true, 'Asia/Kolkata'),

    (v_doc_ananya, '10000000-0000-4000-8000-000000000013', 'DOC-ANANYA-03', 'Dr. Ananya Rao',
     'Consultant Dermatologist and Cosmetologist with 9 years of dedicated practice. Specialized in clinical dermatology, pediatric skin care, eczema, acne solutions, and aesthetic therapies.',
     'Karnataka Medical Council', 'KMC-98712', '2015-06-20', 'verified', true, 'Asia/Kolkata'),

    (v_doc_vikram, '10000000-0000-4000-8000-000000000014', 'DOC-VIKRAM-04', 'Dr. Vikram Patel',
     'Senior Pediatrician with 14 years of experience. Expert in newborn care, childhood vaccinations, developmental assessment, adolescent health, and infectious disease management.',
     'Karnataka Medical Council', 'KMC-65489', '2010-09-01', 'verified', true, 'Asia/Kolkata'),

    (v_doc_sneha, '10000000-0000-4000-8000-000000000015', 'DOC-SNEHA-05', 'Dr. Sneha Kulkarni',
     'Consultant Orthopedic Surgeon with 11 years of experience in joint replacements, sports injury rehabilitation, fracture care, and chronic back & joint pain therapies.',
     'Karnataka Medical Council', 'KMC-32145', '2013-03-12', 'verified', true, 'Asia/Kolkata'),

    (v_doc_arvind, '10000000-0000-4000-8000-000000000016', 'DOC-ARVIND-06', 'Dr. Arvind Kumar',
     'ENT and Head-Neck Surgeon with 10 years experience treating sinusitis, allergic rhinitis, hearing loss, vertigo, tonsillitis, and vocal cord disorders.',
     'Karnataka Medical Council', 'KMC-41289', '2014-08-18', 'verified', true, 'Asia/Kolkata'),

    (v_doc_meera, '10000000-0000-4000-8000-000000000017', 'DOC-MEERA-07', 'Dr. Meera Iyer',
     'Senior Obstetrician and Gynecologist with 15 years experience in high-risk pregnancies, PCOS management, laparoscopic surgery, and comprehensive women health wellness.',
     'Karnataka Medical Council', 'KMC-89023', '2009-11-25', 'verified', true, 'Asia/Kolkata'),

    (v_doc_rohan, '10000000-0000-4000-8000-000000000018', 'DOC-ROHAN-08', 'Dr. Rohan Verma',
     'Consultant Neurologist with 18 years of clinical expertise in epilepsy, stroke rehabilitation, Parkinson disease, migraines, neuropathy, and sleep disorders.',
     'Karnataka Medical Council', 'KMC-11029', '2006-05-14', 'verified', true, 'Asia/Kolkata')
  ON CONFLICT (public_code) DO UPDATE SET full_name = EXCLUDED.full_name, bio = EXCLUDED.bio, credential_status = 'verified', active = true;

  -- 7. Doctor Specialties & Languages
  INSERT INTO clinzo.doctor_specialty(doctor_id, specialty_id) VALUES
    (v_doc_priya, v_spec_gen),
    (v_doc_rajesh, v_spec_cardio),
    (v_doc_ananya, v_spec_derm),
    (v_doc_vikram, v_spec_pedia),
    (v_doc_sneha, v_spec_ortho),
    (v_doc_arvind, v_spec_ent),
    (v_doc_meera, v_spec_gyne),
    (v_doc_rohan, v_spec_neuro)
  ON CONFLICT DO NOTHING;

  INSERT INTO clinzo.doctor_language(doctor_id, language_code) VALUES
    (v_doc_priya, 'en'), (v_doc_priya, 'hi'), (v_doc_priya, 'kn'),
    (v_doc_rajesh, 'en'), (v_doc_rajesh, 'hi'), (v_doc_rajesh, 'ml'),
    (v_doc_ananya, 'en'), (v_doc_ananya, 'hi'), (v_doc_ananya, 'kn'), (v_doc_ananya, 'te'),
    (v_doc_vikram, 'en'), (v_doc_vikram, 'hi'), (v_doc_vikram, 'gu'),
    (v_doc_sneha, 'en'), (v_doc_sneha, 'hi'), (v_doc_sneha, 'mr'), (v_doc_sneha, 'kn'),
    (v_doc_arvind, 'en'), (v_doc_arvind, 'hi'), (v_doc_arvind, 'ta'),
    (v_doc_meera, 'en'), (v_doc_meera, 'hi'), (v_doc_meera, 'ta'), (v_doc_meera, 'kn'),
    (v_doc_rohan, 'en'), (v_doc_rohan, 'hi')
  ON CONFLICT DO NOTHING;

  -- 8. Doctor-Facility Practices
  INSERT INTO clinzo.doctor_facility(id, doctor_id, facility_id, active) VALUES
    (v_prac_priya, v_doc_priya, v_fac_indiranagar, true),
    (v_prac_rajesh, v_doc_rajesh, v_fac_manipal, true),
    (v_prac_ananya, v_doc_ananya, v_fac_koramangala, true),
    (v_prac_vikram, v_doc_vikram, v_fac_aster, true),
    (v_prac_sneha, v_doc_sneha, v_fac_apollo, true),
    (v_prac_arvind, v_doc_arvind, v_fac_indiranagar, true),
    (v_prac_meera, v_doc_meera, v_fac_apollo, true),
    (v_prac_rohan, v_doc_rohan, v_fac_fortis, true)
  ON CONFLICT (doctor_id, facility_id) DO UPDATE SET active = true;

  -- 9. Practice Services
  INSERT INTO clinzo.practice_service(id, doctor_facility_id, code, name, fee_minor, currency, duration_minutes, active) VALUES
    (v_srv_priya, v_prac_priya, 'consultation', 'General Health Consultation', 50000, 'INR', 30, true),
    (v_srv_rajesh, v_prac_rajesh, 'consultation', 'Cardiac Evaluation & Consultation', 90000, 'INR', 30, true),
    (v_srv_ananya, v_prac_ananya, 'consultation', 'Dermatology & Skin Consultation', 65000, 'INR', 30, true),
    (v_srv_vikram, v_prac_vikram, 'consultation', 'Pediatric Wellness Consultation', 55000, 'INR', 30, true),
    (v_srv_sneha, v_prac_sneha, 'consultation', 'Orthopedic Consultation', 75000, 'INR', 30, true),
    (v_srv_arvind, v_prac_arvind, 'consultation', 'ENT Specialist Consultation', 50000, 'INR', 30, true),
    (v_srv_meera, v_prac_meera, 'consultation', 'Gynecology Consultation', 70000, 'INR', 30, true),
    (v_srv_rohan, v_prac_rohan, 'consultation', 'Neurology Consultation', 100000, 'INR', 30, true)
  ON CONFLICT (doctor_facility_id, code) DO UPDATE SET name = EXCLUDED.name, fee_minor = EXCLUDED.fee_minor, active = true;

  -- 10. Clinic Scheduling & Appointment Slots for next 7 days for Dr. Priya Sharma and Dr. Rajesh Menon
  FOR d_idx IN 0..7 LOOP
    slot_day := current_date + d_idx;

    -- Dr. Priya booking day
    INSERT INTO clinzo.doctor_booking_day(doctor_id, local_date, timezone, auto_confirm_limit)
      VALUES (v_doc_priya, slot_day, 'Asia/Kolkata', 10)
      ON CONFLICT (doctor_id, local_date) DO UPDATE SET timezone = 'Asia/Kolkata'
      RETURNING id INTO b_day_id;

    -- Morning Session (09:00 - 13:00)
    INSERT INTO clinzo.session(doctor_facility_id, doctor_id, booking_day_id, starts_at, ends_at, timezone, state, hard_capacity)
      VALUES (v_prac_priya, v_doc_priya, b_day_id,
              (slot_day || ' 09:00:00+05:30')::timestamptz,
              (slot_day || ' 13:00:00+05:30')::timestamptz,
              'Asia/Kolkata', 'open', 10)
      ON CONFLICT DO NOTHING
      RETURNING id INTO sess_id;

    IF sess_id IS NOT NULL THEN
      INSERT INTO clinzo.session_service(session_id, practice_service_id)
        VALUES (sess_id, v_srv_priya) ON CONFLICT DO NOTHING;

      -- Create 30 min slots
      FOR h_idx IN 9..12 LOOP
        slot_start := (slot_day || ' ' || lpad(h_idx::text, 2, '0') || ':00:00+05:30')::timestamptz;
        IF slot_start > now() THEN
          INSERT INTO clinzo.appointment_window(session_id, starts_at, ends_at, state, hard_capacity)
            VALUES (sess_id, slot_start, slot_start + interval '30 minutes', 'open', 2)
            ON CONFLICT DO NOTHING;
        END IF;

        slot_start := (slot_day || ' ' || lpad(h_idx::text, 2, '0') || ':30:00+05:30')::timestamptz;
        IF slot_start > now() THEN
          INSERT INTO clinzo.appointment_window(session_id, starts_at, ends_at, state, hard_capacity)
            VALUES (sess_id, slot_start, slot_start + interval '30 minutes', 'open', 2)
            ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    -- Dr. Rajesh Menon booking day
    INSERT INTO clinzo.doctor_booking_day(doctor_id, local_date, timezone, auto_confirm_limit)
      VALUES (v_doc_rajesh, slot_day, 'Asia/Kolkata', 10)
      ON CONFLICT (doctor_id, local_date) DO UPDATE SET timezone = 'Asia/Kolkata'
      RETURNING id INTO b_day_id;

    INSERT INTO clinzo.session(doctor_facility_id, doctor_id, booking_day_id, starts_at, ends_at, timezone, state, hard_capacity)
      VALUES (v_prac_rajesh, v_doc_rajesh, b_day_id,
              (slot_day || ' 14:00:00+05:30')::timestamptz,
              (slot_day || ' 18:00:00+05:30')::timestamptz,
              'Asia/Kolkata', 'open', 10)
      ON CONFLICT DO NOTHING
      RETURNING id INTO sess_id;

    IF sess_id IS NOT NULL THEN
      INSERT INTO clinzo.session_service(session_id, practice_service_id)
        VALUES (sess_id, v_srv_rajesh) ON CONFLICT DO NOTHING;

      FOR h_idx IN 14..17 LOOP
        slot_start := (slot_day || ' ' || lpad(h_idx::text, 2, '0') || ':00:00+05:30')::timestamptz;
        IF slot_start > now() THEN
          INSERT INTO clinzo.appointment_window(session_id, starts_at, ends_at, state, hard_capacity)
            VALUES (sess_id, slot_start, slot_start + interval '30 minutes', 'open', 2)
            ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- 11. Ambulance Vehicles
  INSERT INTO clinzo.vehicle(id, organization_id, registration_number, display_label, inspection_expires_on, active) VALUES
    (v_veh_bls_1, v_org_ambulance, 'KA-01-EQ-1008', 'Clinzo Rapid BLS 1', (current_date + interval '2 years')::date, true),
    (v_veh_als_1, v_org_ambulance, 'KA-04-ER-2044', 'Clinzo Critical ALS 1', (current_date + interval '2 years')::date, true),
    (v_veh_nicu_1, v_org_ambulance, 'KA-05-EM-3099', 'Clinzo Neonatal NICU 1', (current_date + interval '2 years')::date, true),
    (v_veh_bls_2, v_org_ambulance, 'KA-03-MB-4022', 'Clinzo Rapid BLS 2', (current_date + interval '2 years')::date, true)
  ON CONFLICT (registration_number) DO UPDATE SET display_label = EXCLUDED.display_label, inspection_expires_on = EXCLUDED.inspection_expires_on, active = true;

  -- Link capabilities
  INSERT INTO clinzo.vehicle_capability(vehicle_id, capability_id, verified_at, expires_at) VALUES
    (v_veh_bls_1, v_cap_bls, now(), now() + interval '2 years'),
    (v_veh_als_1, v_cap_als, now(), now() + interval '2 years'),
    (v_veh_nicu_1, v_cap_nicu, now(), now() + interval '2 years'),
    (v_veh_bls_2, v_cap_bls, now(), now() + interval '2 years')
  ON CONFLICT (vehicle_id, capability_id) DO UPDATE SET expires_at = EXCLUDED.expires_at;

  -- 12. Ambulance Drivers
  INSERT INTO clinzo.identity(id, issuer, subject, display_name) VALUES
    ('10000000-0000-4000-8000-000000000021', 'urn:clinzo:seed', 'drv-suresh-kumar', 'Suresh Kumar'),
    ('10000000-0000-4000-8000-000000000022', 'urn:clinzo:seed', 'drv-ramesh-gowda', 'Ramesh Gowda'),
    ('10000000-0000-4000-8000-000000000023', 'urn:clinzo:seed', 'drv-mohammed-farhan', 'Mohammed Farhan'),
    ('10000000-0000-4000-8000-000000000024', 'urn:clinzo:seed', 'drv-kiran-hegde', 'Kiran Hegde')
  ON CONFLICT (issuer, subject) DO UPDATE SET display_name = EXCLUDED.display_name;

  INSERT INTO clinzo.driver(id, identity_id, organization_id, public_code, full_name, city, contact_phone, license_number, license_expires_on, verification_status, active) VALUES
    (v_drv_suresh, '10000000-0000-4000-8000-000000000021', v_org_ambulance, 'DRV-SURESH-01', 'Suresh Kumar', 'Bengaluru', '+919876543210', 'DL-KA01-20150001', (current_date + interval '4 years')::date, 'verified', true),
    (v_drv_ramesh, '10000000-0000-4000-8000-000000000022', v_org_ambulance, 'DRV-RAMESH-02', 'Ramesh Gowda', 'Bengaluru', '+919876543211', 'DL-KA04-20160002', (current_date + interval '3 years')::date, 'verified', true),
    (v_drv_farhan, '10000000-0000-4000-8000-000000000023', v_org_ambulance, 'DRV-FARHAN-03', 'Mohammed Farhan', 'Bengaluru', '+919876543212', 'DL-KA05-20170003', (current_date + interval '5 years')::date, 'verified', true),
    (v_drv_kiran, '10000000-0000-4000-8000-000000000024', v_org_ambulance, 'DRV-KIRAN-04', 'Kiran Hegde', 'Bengaluru', '+919876543213', 'DL-KA03-20180004', (current_date + interval '4 years')::date, 'verified', true)
  ON CONFLICT (public_code) DO UPDATE SET full_name = EXCLUDED.full_name, verification_status = 'verified', active = true;

  -- 13. Vehicle Review Requests & Approvals
  INSERT INTO clinzo.vehicle_review_request(driver_id, vehicle_id, capability_id, equipment_notes, crew_notes, status, reviewed_at, approved_until, reviewer_reference, evidence_reference, review_note) VALUES
    (v_drv_suresh, v_veh_bls_1, v_cap_bls, 'Equipped with foldable stretcher, oxygen cylinder, AED, BP apparatus, and certified trauma kit.', 'Certified emergency EMT and licensed driver on duty.', 'approved', now(), now() + interval '1 year', 'REVIEWER-OPS-01', 'EVID-FLEET-1008', 'Approved for active emergency BLS deployment.'),
    (v_drv_ramesh, v_veh_als_1, v_cap_als, 'Advanced transport ventilator, cardiac monitor/defibrillator, syringe infusion pumps, suction unit, and emergency pharmacopeia.', 'Critical Care Paramedic and certified emergency driver on duty.', 'approved', now(), now() + interval '1 year', 'REVIEWER-OPS-01', 'EVID-FLEET-2044', 'Approved for active emergency ALS deployment.'),
    (v_drv_farhan, v_veh_nicu_1, v_cap_nicu, 'Transport neonatal incubator with servo oxygen control, neonatal pulse oximeter, and micro-infusion pumps.', 'Pediatric transport nurse and experienced driver on duty.', 'approved', now(), now() + interval '1 year', 'REVIEWER-OPS-01', 'EVID-FLEET-3099', 'Approved for specialized NICU neonatal transfer.'),
    (v_drv_kiran, v_veh_bls_2, v_cap_bls, 'Full BLS emergency setup with AED and oxygen delivery system.', 'EMT certified driver.', 'approved', now(), now() + interval '1 year', 'REVIEWER-OPS-01', 'EVID-FLEET-4022', 'Approved for active emergency BLS deployment.')
  ON CONFLICT DO NOTHING;

  -- 14. Active Driver Shifts & Live Locations (Online in Central Bengaluru)
  INSERT INTO clinzo.driver_shift(id, driver_id, vehicle_id, started_at, desired_availability, service_area, crew_attestation, crew_verified_until) VALUES
    (v_shift_suresh, v_drv_suresh, v_veh_bls_1, now() - interval '3 hours', 'online',
     extensions.ST_Multi(extensions.ST_Buffer(extensions.ST_SetSRID(extensions.ST_MakePoint(77.6412, 12.9719), 4326), 50000)::extensions.geometry)::extensions.geography,
     'company-reviewed:fleet-01', now() + interval '1 year'),

    (v_shift_ramesh, v_drv_ramesh, v_veh_als_1, now() - interval '2 hours', 'online',
     extensions.ST_Multi(extensions.ST_Buffer(extensions.ST_SetSRID(extensions.ST_MakePoint(77.5986, 12.8942), 4326), 50000)::extensions.geometry)::extensions.geography,
     'company-reviewed:fleet-02', now() + interval '1 year'),

    (v_shift_farhan, v_drv_farhan, v_veh_nicu_1, now() - interval '1 hour', 'online',
     extensions.ST_Multi(extensions.ST_Buffer(extensions.ST_SetSRID(extensions.ST_MakePoint(77.5926, 13.0569), 4326), 50000)::extensions.geometry)::extensions.geography,
     'company-reviewed:fleet-03', now() + interval '1 year')
  ON CONFLICT DO NOTHING;

  -- Live Locations
  INSERT INTO clinzo.driver_location_latest(driver_id, shift_id, stream_epoch, sequence, position, accuracy_meters, device_at, received_at) VALUES
    (v_drv_suresh, v_shift_suresh, gen_random_uuid(), 1, extensions.ST_SetSRID(extensions.ST_MakePoint(77.6412, 12.9719), 4326)::extensions.geography, 5, now(), now()),
    (v_drv_ramesh, v_shift_ramesh, gen_random_uuid(), 1, extensions.ST_SetSRID(extensions.ST_MakePoint(77.5986, 12.8942), 4326)::extensions.geography, 5, now(), now()),
    (v_drv_farhan, v_shift_farhan, gen_random_uuid(), 1, extensions.ST_SetSRID(extensions.ST_MakePoint(77.5926, 13.0569), 4326)::extensions.geography, 5, now(), now())
  ON CONFLICT (driver_id) DO UPDATE SET
    shift_id = EXCLUDED.shift_id,
    position = EXCLUDED.position,
    device_at = now(),
    received_at = now();

  -- 15. Also automatically approve any pending driver reviews or vehicle reviews (in case user created a test driver account!)
  UPDATE clinzo.driver SET verification_status='verified', active=true WHERE verification_status<>'verified';
  UPDATE clinzo.vehicle_review_request
  SET status='approved', reviewed_at=now(), approved_until=now()+interval '1 year',
      reviewer_reference='DEV-AUTO-APPROVED', evidence_reference='DEV-SEED', review_note='Auto-approved for local development testing'
  WHERE status='pending';

END $$;
