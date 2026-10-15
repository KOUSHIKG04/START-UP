-- Disposable database only. Synthetic fixtures and all writes roll back.
BEGIN;
DO $$
DECLARE
  doctor_auth uuid:=gen_random_uuid(); owner_auth uuid:=gen_random_uuid(); outsider_auth uuid:=gen_random_uuid();
  doctor_identity uuid; owner_identity uuid; outsider_identity uuid; doctor_id uuid; org_id uuid; facility_id uuid; practice uuid;
  settings jsonb; result jsonb; version bigint; tomorrow date; zone text:='Asia/Kolkata'; exception_id uuid;
  denied boolean; count_before int; count_after int; sid uuid; wid uuid; psid uuid; patient uuid;
  mode text; today_sid uuid; today_wid uuid; today_day uuid;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',doctor_auth||'@example.test',now()),
    (owner_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',owner_auth||'@example.test',now()),
    (outsider_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',outsider_auth||'@example.test',now());
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',doctor_auth::text,'Schedule doctor') RETURNING id INTO doctor_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',owner_auth::text,'Facility owner') RETURNING id INTO owner_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',outsider_auth::text,'Outsider') RETURNING id INTO outsider_identity;
  INSERT INTO clinzo.organization(public_code,name,kind) VALUES(gen_random_uuid()::text,'Schedule facility','care_provider') RETURNING id INTO org_id;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status)
    VALUES(org_id,gen_random_uuid()::text,'Schedule clinic','clinic','Test street','SRID=4326;POINT(77.59 12.97)','verified') RETURNING id INTO facility_id;
  INSERT INTO clinzo.organization_member(identity_id,organization_id,facility_id,role)
    VALUES(owner_identity,org_id,facility_id,'owner');
  INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status,booking_timezone)
    VALUES(doctor_identity,gen_random_uuid()::text,'Schedule doctor','Test council',gen_random_uuid()::text,'2020-01-01','verified',zone) RETURNING id INTO doctor_id;
  INSERT INTO clinzo.doctor_facility(doctor_id,facility_id) VALUES(doctor_id,facility_id) RETURNING id INTO practice;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Request patient') RETURNING id INTO patient;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient,outsider_identity,'self',now());
  INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone) VALUES(doctor_id,(now() AT TIME ZONE zone)::date+2,zone) RETURNING id INTO today_day;
  INSERT INTO clinzo.session(doctor_facility_id,doctor_id,booking_day_id,starts_at,ends_at,timezone,hard_capacity,state)
  VALUES(practice,doctor_id,today_day,now()+interval '2 days',now()+interval '2 days 1 hour',zone,4,'published') RETURNING id INTO sid;
  INSERT INTO clinzo.practice_service(doctor_facility_id,code,name,fee_minor,currency,duration_minutes)
  VALUES(practice,'clinic-'||sid::text,'Clinic',10000,'INR',15) RETURNING id INTO psid;
  INSERT INTO clinzo.session_service(session_id,practice_service_id) VALUES(sid,psid);
  INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
  VALUES(sid,now()+interval '2 days',now()+interval '2 days 15 minutes',1,'open') RETURNING id INTO wid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  today_sid:=public.book_clinic_appointment(patient,wid,psid,'Checkup',gen_random_uuid());
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.notification_intent n WHERE n.recipient_id=doctor_identity AND n.template_key='appointment.requested' AND n.safe_parameters->>'appointment_id'=today_sid::text) THEN
    RAISE EXCEPTION 'Doctor request notification missing'; END IF;
  SELECT a.row_version INTO version FROM clinzo.appointment a WHERE a.id=today_sid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.transition_clinic_appointment(today_sid,version,'approve',NULL);
  EXECUTE 'RESET ROLE';
  IF (SELECT a.status FROM clinzo.appointment a WHERE a.id=today_sid)<>'confirmed' THEN RAISE EXCEPTION 'Valid acceptance failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.notification_intent n WHERE n.recipient_id=outsider_identity AND n.template_key='appointment.approve' AND n.safe_parameters->>'appointment_id'=today_sid::text) THEN
    RAISE EXCEPTION 'Patient confirmation notification missing'; END IF;
  INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state)
  VALUES(sid,now()+interval '2 days 15 minutes',now()+interval '2 days 30 minutes',1,'open') RETURNING id INTO wid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  today_sid:=public.book_clinic_appointment(patient,wid,psid,'Checkup',gen_random_uuid());
  EXECUTE 'RESET ROLE';
  SELECT a.row_version INTO version FROM clinzo.appointment a WHERE a.id=today_sid;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  PERFORM public.transition_clinic_appointment(today_sid,version,'reject','Please book another available time');
  EXECUTE 'RESET ROLE';
  IF (SELECT a.status FROM clinzo.appointment a WHERE a.id=today_sid)<>'rejected' THEN RAISE EXCEPTION 'Rejection failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.notification_intent n WHERE n.recipient_id=outsider_identity AND n.template_key='appointment.reject' AND n.safe_parameters->>'appointment_id'=today_sid::text) THEN
    RAISE EXCEPTION 'Patient rejection notification missing'; END IF;
END $$;
SELECT 'appointment_decision_notifications_smoke_passed' AS result;
ROLLBACK;
