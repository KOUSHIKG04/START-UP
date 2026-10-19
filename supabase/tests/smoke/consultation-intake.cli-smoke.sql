-- Synthetic consultation fixtures; every write rolls back.
BEGIN;
DO $$
DECLARE doctor_auth uuid:=gen_random_uuid(); patient_auth uuid:=gen_random_uuid(); doctor_identity uuid; patient_identity uuid;
  doctor_id uuid; org_id uuid; facility_id uuid; practice uuid; patient uuid; day_id uuid; sid uuid; wid uuid; psid uuid; aid uuid; cid uuid;
  draft jsonb; denied boolean; today date:=(now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',doctor_auth||'@example.test',now()),
    (patient_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',patient_auth||'@example.test',now());
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',doctor_auth::text,'Intake doctor') RETURNING id INTO doctor_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',patient_auth::text,'Intake patient') RETURNING id INTO patient_identity;
  INSERT INTO clinzo.organization(public_code,name,kind) VALUES(gen_random_uuid()::text,'Intake facility','care_provider') RETURNING id INTO org_id;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status)
    VALUES(org_id,gen_random_uuid()::text,'Intake clinic','clinic','Test street','SRID=4326;POINT(77.59 12.97)','verified') RETURNING id INTO facility_id;
  INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status,booking_timezone)
    VALUES(doctor_identity,gen_random_uuid()::text,'Intake doctor','Test council',gen_random_uuid()::text,'2020-01-01','verified','Asia/Kolkata') RETURNING id INTO doctor_id;
  INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(doctor_id,facility_id) RETURNING id INTO practice;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Intake patient') RETURNING id INTO patient;
  INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone) VALUES(doctor_id,today,'Asia/Kolkata') RETURNING id INTO day_id;
  INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
    VALUES(practice,doctor_id,day_id,now()-interval '1 minute',now()+interval '1 hour','Asia/Kolkata',1,'open') RETURNING id INTO sid;
  INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
    VALUES(sid,now()-interval '1 minute',now()+interval '29 minutes',1,'open') RETURNING id INTO wid;
  INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
    VALUES(practice,'clinic-intake','Clinic',10000,'INR',30) RETURNING id INTO psid;
  INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(sid,psid);
  INSERT INTO clinzo.appointment(public_code,patient_id,session_id,window_id,practice_service_id,source,status,requested_by,confirmed_at,fee_minor,currency,
    doctor_name_snapshot,facility_name_snapshot,facility_address_snapshot,service_name_snapshot,doctor_registration_snapshot)
    VALUES(gen_random_uuid()::text,patient,sid,wid,psid,'staff_booking','in_consultation',doctor_identity,now(),10000,'INR','Doctor','Clinic','Street','Clinic','Test') RETURNING id INTO aid;
  INSERT INTO clinzo.consultation(appointment_id,patient_id,doctor_id,status,started_at) VALUES(aid,patient,doctor_id,'active',now()) RETURNING id INTO cid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.record_consultation_intake(aid,'[{"code":"pulse_bpm","value":72,"unit":"bpm"},{"code":"temperature_c","value":37,"unit":"°C"}]','Test diagnosis');
  draft:=public.get_doctor_consultation_draft(aid);
  IF jsonb_array_length(draft->'vitals')<>2 OR draft->>'diagnosis'<>'Test diagnosis' OR (draft->>'prescription_issued')::boolean THEN
    RAISE EXCEPTION 'Saved intake did not reopen correctly'; END IF;
  denied:=false;
  BEGIN PERFORM public.record_consultation_intake(aid,'[{"code":"pulse_bpm","value":80,"unit":"bpm"},{"code":"height_cm","value":-1,"unit":"cm"}]',NULL);
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied OR jsonb_array_length(public.get_doctor_consultation_draft(aid)->'vitals')<>2 THEN RAISE EXCEPTION 'Invalid batch partially saved its vitals'; END IF;
  PERFORM public.issue_consultation_prescription(aid,jsonb_build_array(jsonb_build_object('medicine_name','Test medicine','strength','1 mg','form','tablet','route','oral',
    'instructions','Test instructions','dose_quantity',1,'dose_unit','tablet','starts_on',today,'ends_on',today+2,
    'timings',jsonb_build_array(jsonb_build_object('meal_anchor','breakfast','meal_relation','after')))),'Asia/Kolkata');
  PERFORM public.recommend_consultation_followup(aid,today+3,'Asia/Kolkata','Test follow-up');
  draft:=public.get_doctor_consultation_draft(aid);
  IF NOT (draft->>'prescription_issued')::boolean OR (draft->'followup'->>'date')::date<>today+3 THEN RAISE EXCEPTION 'Flow did not restore saved prescription and follow-up'; END IF;
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  denied:=false;
  BEGIN PERFORM public.get_doctor_consultation_draft(aid); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Patient could access private doctor draft'; END IF;
  denied:=false;
  BEGIN PERFORM public.record_consultation_intake(aid,'[{"code":"pulse_bpm","value":80,"unit":"bpm"}]',NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Patient could write doctor vitals'; END IF;
  EXECUTE 'RESET ROLE';
  IF (SELECT count(*) FROM clinzo.vital_observation WHERE consultation_id=cid)<>2 THEN RAISE EXCEPTION 'Failed batch inserted a partial measurement'; END IF;
  IF has_function_privilege('anon','public.record_consultation_intake(uuid,jsonb,text)','EXECUTE')
    OR has_function_privilege('anon','public.get_doctor_consultation_draft(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous clinical access is enabled'; END IF;
END $$;
SELECT 'consultation_intake_smoke_passed' AS result;
ROLLBACK;
