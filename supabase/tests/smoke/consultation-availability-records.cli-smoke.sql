-- Run inside BEGIN/ROLLBACK. All patients, bookings and records are temporary.
DO $$
DECLARE baseline record; actual jsonb; old_slots jsonb; target record; slot jsonb;
  patient_key uuid; appointment_key uuid; consultation_key uuid; actor_key uuid;
  doctor_identity uuid; remaining_before int; result jsonb; denied boolean; stranger uuid;
BEGIN
  FOR baseline IN SELECT * FROM consultation_availability_baseline LOOP
    actual:=public.list_practice_service_slots(baseline.practice_id,baseline.mode,NULL,now(),10000);
    SELECT coalesce(jsonb_agg(x-'daily_bookings_remaining' ORDER BY ordinality),'[]'::jsonb) INTO old_slots
      FROM jsonb_array_elements(actual) WITH ORDINALITY a(x,ordinality);
    IF old_slots IS DISTINCT FROM baseline.slots THEN RAISE EXCEPTION 'Time choices changed for %',baseline.mode; END IF;
  END LOOP;
  SELECT p.id AS practice_id,d.id AS doctor_id,d.identity_id,d.booking_timezone,i.subject::uuid AS auth_id
    INTO target FROM clinzo.doctor d JOIN clinzo.doctor_facility p ON p.doctor_id=d.id
    JOIN clinzo.identity i ON i.id=d.identity_id JOIN auth.users u ON u.id::text=i.subject
    JOIN clinzo.doctor_schedule_preferences prefs ON prefs.doctor_facility_id=p.id
    WHERE d.active AND d.credential_status='verified' AND i.disabled_at IS NULL AND prefs.online_daily_limit>0
      AND NOT EXISTS(SELECT 1 FROM clinzo.consultation c WHERE c.doctor_id=d.id AND c.status='active')
      AND jsonb_array_length(public.list_practice_service_slots(p.id,'online',NULL,now()+interval '1 day',10000))>0
    LIMIT 1;
  IF target.practice_id IS NULL THEN RAISE EXCEPTION 'No available online fixture practice'; END IF;
  actor_key:=target.auth_id;doctor_identity:=target.identity_id;
  PERFORM set_config('request.jwt.claim.sub',actor_key::text,true);
  slot:=public.list_practice_service_slots(target.practice_id,'online',NULL,now()+interval '1 day',10000)->0;
  remaining_before:=(slot->>'daily_bookings_remaining')::int;
  IF remaining_before<1 THEN RAISE EXCEPTION 'Missing remaining daily booking allowance'; END IF;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Consultation record rollback fixture') RETURNING id INTO patient_key;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient_key,doctor_identity,'delegate',now());
  appointment_key:=public.book_clinic_appointment(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Rollback verification',gen_random_uuid());
  IF (SELECT clinzo.remaining_daily_booking_capacity(session_id) FROM clinzo.appointment WHERE id=appointment_key)<>remaining_before-1 THEN
    RAISE EXCEPTION 'Pending reservation did not reduce allowance'; END IF;
  PERFORM public.transition_clinic_appointment(appointment_key,(SELECT row_version FROM clinzo.appointment WHERE id=appointment_key),'cancel',NULL);
  IF (SELECT clinzo.remaining_daily_booking_capacity(session_id) FROM clinzo.appointment WHERE id=appointment_key)<>remaining_before THEN
    RAISE EXCEPTION 'Cancellation did not restore allowance'; END IF;
  -- Seed a synthetic active consultation, then use the actual clinical owners.
  slot:=public.list_practice_service_slots(target.practice_id,'online',NULL,now()+interval '1 day',10000)->0;
  appointment_key:=public.book_clinic_appointment(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Rollback clinical fixture',gen_random_uuid());
  UPDATE clinzo.appointment SET status='in_consultation',confirmed_at=now() WHERE id=appointment_key;
  INSERT INTO clinzo.consultation(appointment_id,patient_id,doctor_id,status,started_at)
    VALUES(appointment_key,patient_key,target.doctor_id,'active',now()) RETURNING id INTO consultation_key;
  PERFORM public.record_consultation_intake(appointment_key,'[{"code":"pulse_bpm","value":72,"unit":"bpm"}]','Fixture diagnosis');
  PERFORM public.issue_consultation_prescription(appointment_key,jsonb_build_array(jsonb_build_object(
    'medicine_name','Fixture medicine','strength','10 mg','form','tablet','route','oral','instructions','Fixture instructions',
    'dose_quantity',1,'dose_unit','tablet','starts_on',current_date,'ends_on',current_date+2,
    'timings',jsonb_build_array(jsonb_build_object('meal_anchor','breakfast','meal_relation','after')))),target.booking_timezone);
  PERFORM public.recommend_consultation_followup(appointment_key,current_date+7,target.booking_timezone,'Fixture follow-up');
  PERFORM public.complete_online_appointment(appointment_key,'Signed fixture assessment');
  EXECUTE 'SET LOCAL ROLE authenticated';
  result:=public.get_doctor_consultation_draft(appointment_key);
  EXECUTE 'RESET ROLE';
  IF result->>'status'<>'signed' OR result->>'assessment'<>'Signed fixture assessment'
    OR result->>'diagnosis'<>'Fixture diagnosis' OR jsonb_array_length(result->'vitals')<>1
    OR result->'medicines'->0->>'medicine_name'<>'Fixture medicine' OR result->'followup'->>'reason'<>'Fixture follow-up' THEN
    RAISE EXCEPTION 'Saved clinical record incomplete'; END IF;
  denied:=false;
  BEGIN PERFORM public.record_consultation_vital(appointment_key,'pulse_bpm',80,'bpm');
    EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Signed clinical record remained editable'; END IF;
  SELECT u.id INTO stranger FROM auth.users u JOIN clinzo.identity i ON i.subject=u.id::text AND i.issuer='supabase'
    WHERE i.id<>doctor_identity AND i.disabled_at IS NULL LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub',coalesce(stranger,gen_random_uuid())::text,true);
  denied:=false;
  BEGIN PERFORM public.get_doctor_consultation_draft(appointment_key); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Another identity read the signed consultation'; END IF;
  IF has_function_privilege('anon','public.get_doctor_consultation_draft(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','clinzo.remaining_daily_booking_capacity(uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Private read/calculation grants exposed'; END IF;
END $$;
SELECT true AS consultation_availability_and_signed_records_passed;
