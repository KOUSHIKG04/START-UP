-- Disposable project only. All fixture writes roll back.
BEGIN;
DO $$
#variable_conflict use_variable
DECLARE owner_auth uuid:=gen_random_uuid(); doctor_auth uuid:=gen_random_uuid(); doctor2_auth uuid:=gen_random_uuid(); doctor3_auth uuid:=gen_random_uuid(); reviewer_auth uuid:=gen_random_uuid(); outsider_auth uuid:=gen_random_uuid();
  facility_id uuid; doctor_identity uuid; doctor2_identity uuid; doctor3_identity uuid; reviewer_identity uuid; fixture_doctor_id uuid; doctor2_id uuid; doctor3_id uuid; doctor2_code text;
  practice uuid; settings jsonb; slot_ids uuid[]; future_day date; zone text; other_facility uuid;
  request_id uuid; invitation_id uuid; doctor3_case_id uuid; denied boolean:=false; license_path text; degree_path text;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (owner_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-owner-'||owner_auth||'@example.test',now()),
    (doctor_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-doctor-'||doctor_auth||'@example.test',now()),
    (doctor2_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-doctor-'||doctor2_auth||'@example.test',now()),
    (doctor3_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-doctor-'||doctor3_auth||'@example.test',now()),
    (reviewer_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-reviewer-'||reviewer_auth||'@example.test',now()),
    (outsider_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','facility-outsider-'||outsider_auth||'@example.test',now());
  UPDATE clinzo.mobile_email_dev_auth SET enabled=true WHERE singleton;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  facility_id:=public.register_my_care_facility(jsonb_build_object('name','Association Fixture Hospital',
    'kind','hospital','address','Fixture Street, Bengaluru, Karnataka, 560001',
    'locality','Fixture Area','city','Bengaluru','state','Karnataka','pincode','560001',
    'latitude',12.9,'longitude',77.5,
    'offersBeds',false,'bedTypeCodes','[]'::jsonb));
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_registered_care_facilities()) item
    WHERE (item->>'id')::uuid=facility_id) THEN
    RAISE EXCEPTION 'Unverified facility exposed in doctor picker'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_public_hospitals()) h
    WHERE (h->>'id')::uuid=facility_id) THEN
    RAISE EXCEPTION 'Unverified hospital exposed to patients'; END IF;
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.facility SET verification_status='verified' WHERE id=facility_id;
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',doctor_auth::text,'Dr. Association Fixture') RETURNING id INTO doctor_identity;
  INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,
    practice_started_on,credential_status)
    VALUES(doctor_identity,'DOC-'||gen_random_uuid(),'Dr. Association Fixture','Fixture Council',gen_random_uuid()::text,
      '2020-01-01','pending') RETURNING id INTO fixture_doctor_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_registered_care_facilities()) item
    WHERE (item->>'id')::uuid=facility_id) THEN
    RAISE EXCEPTION 'Verified facility missing from doctor picker'; END IF;
  request_id:=public.request_my_doctor_facility(facility_id);
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM clinzo.doctor_facility WHERE doctor_facility.doctor_id=fixture_doctor_id) THEN
    RAISE EXCEPTION 'Request linked doctor before review'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  BEGIN
    PERFORM public.decide_my_facility_doctor_request(request_id,true,NULL);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Outsider approved doctor association'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  IF jsonb_array_length(public.list_my_facility_doctor_requests())<>1 THEN
    RAISE EXCEPTION 'Owner cannot see incoming request'; END IF;
  PERFORM public.decide_my_facility_doctor_request(request_id,true,NULL);
  EXECUTE 'RESET ROLE';
  IF EXISTS(SELECT 1 FROM clinzo.doctor_facility WHERE doctor_facility.doctor_id=fixture_doctor_id) THEN
    RAISE EXCEPTION 'Facility approval bypassed company credential review'; END IF;
  UPDATE clinzo.doctor SET credential_status='verified' WHERE id=fixture_doctor_id;
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility
    WHERE doctor_facility.doctor_id=fixture_doctor_id AND doctor_facility.facility_id=facility_id AND active) THEN
    RAISE EXCEPTION 'Both approvals did not activate doctor practice'; END IF;


  SELECT id INTO practice FROM clinzo.doctor_facility WHERE doctor_id=fixture_doctor_id AND doctor_facility.facility_id=facility_id;
  SELECT booking_timezone INTO zone FROM clinzo.doctor WHERE id=fixture_doctor_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  settings:=public.save_my_schedule_preferences(practice,jsonb_build_object('working_days',jsonb_build_array(1,2,3,4,5,6,7),
    'clinic_start','09:00','clinic_end','24:00','slot_minutes',15,'online_slot_minutes',30,'home_slot_minutes',60,
    'online_daily_limit',3,'walkin_daily_limit',6,'auto_accept',true,'auto_accept_limit',1,
    'home_visits',false,'online_fee_minor',30000,'clinic_fee_minor',50000,'home_fee_minor',null),0);
  IF settings->>'row_version' IS DISTINCT FROM '1' OR settings->>'clinic_end' IS DISTINCT FROM '24:00:00' THEN
    RAISE EXCEPTION 'Hospital owner schedule not persisted'; END IF;
  denied:=false;
  BEGIN PERFORM public.save_my_schedule_preferences(practice,settings,0);
  EXCEPTION WHEN SQLSTATE 'PT409' THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Stale hospital schedule write succeeded'; END IF;
  future_day:=(now() AT TIME ZONE zone)::date+14;
  slot_ids:=public.publish_selected_doctor_slots(practice,'clinic',ARRAY[
    (future_day+time '10:00') AT TIME ZONE zone,(future_day+time '10:30') AT TIME ZONE zone],15,50000,'INR');
  IF cardinality(slot_ids)<>2 THEN RAISE EXCEPTION 'Hospital failed to publish exact slots'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  settings:=public.get_my_schedule_preferences(practice);
  IF settings->>'clinic_fee_minor' IS DISTINCT FROM '50000' OR jsonb_array_length(public.list_my_clinic_sessions(practice))<>2 THEN
    RAISE EXCEPTION 'Hospital schedule did not reach Doctor App RPCs'; END IF;
  IF jsonb_array_length(public.list_practice_clinic_slots(practice,NULL,now(),100))<>2 THEN
    RAISE EXCEPTION 'Hospital published slots did not reach Patient App RPC'; END IF;
  settings:=public.save_my_schedule_preferences(practice,settings||jsonb_build_object('clinic_fee_minor',55000),1);
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  IF public.get_my_schedule_preferences(practice)->>'clinic_fee_minor' IS DISTINCT FROM '55000' THEN
    RAISE EXCEPTION 'Doctor edit did not reach facility'; END IF;
  settings:=public.save_my_schedule_preferences(practice,settings||jsonb_build_object('home_visits',true,'home_radius_km',5,'home_fee_minor',35000),2);
  slot_ids:=public.publish_selected_doctor_slots(practice,'online',ARRAY[(future_day+time '11:00') AT TIME ZONE zone],30,30000,'INR');
  PERFORM public.publish_selected_doctor_slots(practice,'home',ARRAY[(future_day+time '13:00') AT TIME ZONE zone],60,35000,'INR');
  IF jsonb_array_length(public.list_practice_clinic_slots(practice,NULL,now(),100))<>4 THEN
    RAISE EXCEPTION 'Facility service slots did not reach Patient App'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_my_clinic_sessions(practice)) item WHERE item->>'service_mode'='online' )
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_my_clinic_sessions(practice)) item WHERE item->>'service_mode'='home') THEN
    RAISE EXCEPTION 'Facility service schedule did not reach Doctor App'; END IF;
  settings:=public.get_my_schedule_preferences(practice);
  settings:=public.save_my_schedule_preferences(practice,settings||jsonb_build_object('online_slot_minutes',45),3);
  IF settings->>'slot_minutes'<>'15' OR settings->>'home_slot_minutes'<>'60' THEN
    RAISE EXCEPTION 'Editing online duration changed other services'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  IF public.get_my_schedule_preferences(practice)->>'online_slot_minutes'<>'45' THEN RAISE EXCEPTION 'Doctor online update not visible to facility'; END IF;
  settings:=public.get_my_schedule_preferences(practice);
  settings:=public.save_my_schedule_preferences(practice,settings||jsonb_build_object(
    'online_working_days',jsonb_build_array(extract(isodow FROM future_day+1)::int),
    'home_working_days',jsonb_build_array(extract(isodow FROM future_day)::int),
    'online_auto_accept',true,'online_auto_accept_limit',2,'home_auto_accept',false,'home_auto_accept_limit',0),4);
  IF settings->'working_days' <> '[1,2,3,4,5,6,7]'::jsonb OR settings->>'auto_accept_limit'<>'1'
    OR settings->'online_working_days'=settings->'home_working_days' THEN RAISE EXCEPTION 'Service rules are not independent'; END IF;
  denied:=false;
  BEGIN PERFORM public.publish_selected_doctor_slots(practice,'online',ARRAY[(future_day+time '15:00') AT TIME ZONE zone],45,30000,'INR');
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Online publication ignored service working days'; END IF;
  settings:=public.save_my_schedule_preferences(practice,settings||jsonb_build_object('auto_accept',true,'auto_accept_limit',2),5);
  PERFORM public.publish_selected_doctor_slots(practice,'online',ARRAY[(future_day+1+time '09:00') AT TIME ZONE zone],45,30000,'INR');
  PERFORM public.publish_selected_doctor_slots(practice,'online',ARRAY[(future_day+1+time '11:00') AT TIME ZONE zone],45,30000,'INR');
  PERFORM public.publish_selected_doctor_slots(practice,'online',ARRAY[(future_day+1+time '13:00') AT TIME ZONE zone],45,30000,'INR');
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  IF public.get_my_schedule_preferences(practice)->'online_working_days' <> settings->'online_working_days'
    OR public.get_my_schedule_preferences(practice)->>'auto_accept_limit'<>'2' THEN
    RAISE EXCEPTION 'Facility mode rules did not reach doctor'; END IF;
  IF jsonb_array_length(public.list_practice_clinic_slots(practice,NULL,now(),100))<>7 THEN RAISE EXCEPTION 'Service slots not visible to patient'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  DECLARE patient uuid; online_slot jsonb; clinic_slot jsonb; home_slot jsonb; extra_slot jsonb; booking uuid;
  BEGIN
    patient:=(public.complete_onboarding('patient','{"full_name":"Shared Budget Patient"}'::jsonb)->>'patient_id')::uuid;
    SELECT item INTO online_slot FROM jsonb_array_elements(public.list_practice_clinic_slots(practice,NULL,now(),100)) item WHERE (item->>'starts_at')::timestamptz=(future_day+time '11:00') AT TIME ZONE zone;
    SELECT item INTO clinic_slot FROM jsonb_array_elements(public.list_practice_clinic_slots(practice,NULL,now(),100)) item WHERE (item->>'starts_at')::timestamptz=(future_day+time '10:00') AT TIME ZONE zone;
    SELECT item INTO home_slot FROM jsonb_array_elements(public.list_practice_clinic_slots(practice,NULL,now(),100)) item WHERE (item->>'starts_at')::timestamptz=(future_day+time '13:00') AT TIME ZONE zone;
    booking:=public.book_clinic_appointment(patient,(online_slot->>'window_id')::uuid,(online_slot->>'practice_service_id')::uuid,'Shared online first',gen_random_uuid());
    EXECUTE 'RESET ROLE';
    IF (SELECT status FROM clinzo.appointment WHERE id=booking)<>'confirmed' THEN RAISE EXCEPTION 'First online booking was not auto-confirmed'; END IF;
    EXECUTE 'SET LOCAL ROLE authenticated';
    booking:=public.book_clinic_appointment(patient,(clinic_slot->>'window_id')::uuid,(clinic_slot->>'practice_service_id')::uuid,'Shared clinic second',gen_random_uuid());
    EXECUTE 'RESET ROLE';
    IF (SELECT status FROM clinzo.appointment WHERE id=booking)<>'confirmed' THEN RAISE EXCEPTION 'Second mixed-mode booking was not auto-confirmed'; END IF;
    EXECUTE 'SET LOCAL ROLE authenticated';
    denied:=false;
    BEGIN PERFORM public.book_clinic_appointment(patient,(home_slot->>'window_id')::uuid,(home_slot->>'practice_service_id')::uuid,'Blocked home booking',gen_random_uuid());
    EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
    IF NOT denied THEN RAISE EXCEPTION 'Shared limit bypassed home coverage validation'; END IF;
    SELECT item INTO extra_slot FROM jsonb_array_elements(public.list_practice_clinic_slots(practice,NULL,now(),100)) item WHERE (item->>'starts_at')::timestamptz=(future_day+time '10:30') AT TIME ZONE zone;
    booking:=public.book_clinic_appointment(patient,(extra_slot->>'window_id')::uuid,(extra_slot->>'practice_service_id')::uuid,'Shared third booking',gen_random_uuid());
    EXECUTE 'RESET ROLE';
    IF (SELECT status FROM clinzo.appointment WHERE id=booking)<>'pending' THEN RAISE EXCEPTION 'Combined daily auto-confirm limit exceeded'; END IF;
    IF NOT EXISTS(SELECT 1 FROM clinzo.domain_event WHERE aggregate_id=booking AND event_type='appointment.requested') THEN RAISE EXCEPTION 'Over-limit request event missing'; END IF;
    EXECUTE 'SET LOCAL ROLE authenticated';
  END;


  EXECUTE 'RESET ROLE';
  -- Reception staff can check patients in, but cannot change doctor preferences.
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('supabase',doctor2_auth::text,'Reception Schedule Fixture') RETURNING id INTO doctor2_identity;
  INSERT INTO clinzo.organization_member(identity_id,organization_id,facility_id,role)
    SELECT doctor2_identity,f.organization_id,f.id,'receptionist' FROM clinzo.facility f WHERE f.id=facility_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',doctor2_auth::text,true);
  denied:=false;
  BEGIN PERFORM public.save_my_schedule_preferences(practice,settings,2); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Receptionist changed doctor scheduling preferences'; END IF;
  EXECUTE 'RESET ROLE';
  -- Another verified facility owner must have no access to this doctor's practice.
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',outsider_auth::text,true);
  other_facility:=public.register_my_care_facility(jsonb_build_object('name','Other Fixture Hospital',
    'kind','hospital','address','Other Fixture Street Bengaluru','locality','Fixture Area','city','Bengaluru',
    'state','Karnataka','pincode','560001','latitude',12.9,'longitude',77.5,'offersBeds',false,'bedTypeCodes','[]'::jsonb));
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.facility SET verification_status='verified' WHERE id=other_facility;
  EXECUTE 'SET LOCAL ROLE authenticated';
  denied:=false;
  BEGIN PERFORM public.get_my_schedule_preferences(practice); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Other hospital read unrelated schedule'; END IF;
  denied:=false;
  BEGIN PERFORM public.save_my_schedule_preferences(practice,settings,2); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Other hospital edited unrelated schedule'; END IF;
  EXECUTE 'RESET ROLE';
  -- Deactivating the association immediately removes hospital edit access.
  UPDATE clinzo.doctor_facility SET active=false WHERE id=practice;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',owner_auth::text,true);
  denied:=false;
  BEGIN PERFORM public.save_my_schedule_preferences(practice,settings,2); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Inactive association retained hospital schedule access'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
SELECT true AS facility_schedule_management_smoke_passed;
