-- All fixture changes and simulated provider records roll back. No gateway HTTP.
BEGIN;
DO $$
DECLARE practice uuid; doctor_auth uuid; patient_auth uuid; actor uuid; patient_key uuid; foreign_patient uuid;
  destination uuid; other_destination uuid; slot jsonb; options jsonb; result jsonb; a uuid; b uuid; replacement uuid;
  attempt uuid; request_key uuid:=gen_random_uuid(); denied boolean; snapshot jsonb; origin extensions.geography;
  order_key text; payment_key text;
BEGIN
  SELECT df.id,i.subject::uuid,f.location INTO practice,doctor_auth,origin
  FROM clinzo.doctor_facility df JOIN clinzo.doctor d ON d.id=df.doctor_id
  JOIN clinzo.identity i ON i.id=d.identity_id JOIN clinzo.facility f ON f.id=df.facility_id
  WHERE d.active AND d.credential_status='verified' AND i.disabled_at IS NULL AND f.location IS NOT NULL
    AND EXISTS(SELECT 1 FROM clinzo.session s JOIN clinzo.appointment_window w ON w.session_id=s.id
      WHERE s.doctor_facility_id=df.id AND clinzo.service_mode_for_session(s.id)='online'
        AND w.starts_at>now()+interval '2 days' AND w.state='open' GROUP BY s.booking_day_id HAVING count(*)>=5) LIMIT 1;
  IF practice IS NULL THEN RAISE EXCEPTION 'No future home fixture practice'; END IF;
  SELECT i.id,u.id INTO actor,patient_auth FROM clinzo.identity i JOIN auth.users u ON u.id::text=i.subject AND i.issuer='supabase'
    WHERE i.disabled_at IS NULL AND NOT coalesce(clinzo.can_manage_practice(i.id,practice),false)
      AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL) LIMIT 1;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Home booking rollback fixture') RETURNING id INTO patient_key;
  INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Unrelated location fixture') RETURNING id INTO foreign_patient;
  INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient_key,actor,'delegate',now());
  INSERT INTO clinzo.patient_saved_location(patient_id,label,kind,building,city,latitude,longitude,instructions)
    VALUES(patient_key,'Visit','house','Fixture building','Fixture city',extensions.ST_Y(origin::extensions.geometry),extensions.ST_X(origin::extensions.geometry),'Ring reception') RETURNING id INTO destination;
  INSERT INTO clinzo.patient_saved_location(patient_id,label,kind,building,city,latitude,longitude)
    VALUES(foreign_patient,'Private','house','Private address','Private city',13,80) RETURNING id INTO other_destination;
  -- Reuse isolated future schedule rows inside this rollback fixture only.
  UPDATE clinzo.practice_service ps SET code='home-'||ps.id::text,name='Home visit',fee_minor=50000
    WHERE ps.doctor_facility_id=practice AND ps.code LIKE 'online-%';
  UPDATE clinzo.doctor_schedule_preferences SET auto_accept=true,auto_accept_limit=100,home_visits=true,home_radius_km=5 WHERE doctor_facility_id=practice;
  UPDATE clinzo.appointment_billing_config SET enabled=true,mode='test' WHERE singleton;
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'home',NULL,now()+interval '2 days',10000)) x LIMIT 1;
  IF slot IS NULL THEN RAISE EXCEPTION 'No available fixture home slot'; END IF;
  -- Missing/foreign/incomplete/out-of-coverage destinations fail before billing.
  denied:=false;
  BEGIN PERFORM public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Missing address',gen_random_uuid(),'online');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Legacy home booking bypassed destination'; END IF;
  denied:=false;
  BEGIN PERFORM public.prepare_home_visit_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Foreign address',gen_random_uuid(),other_destination);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Foreign saved address accepted'; END IF;
  UPDATE clinzo.patient_saved_location SET latitude=NULL,longitude=NULL WHERE id=destination;
  denied:=false;
  BEGIN PERFORM public.prepare_home_visit_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Missing pin',gen_random_uuid(),destination);
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unpinned address accepted'; END IF;
  UPDATE clinzo.patient_saved_location SET latitude=-60,longitude=0 WHERE id=destination;
  denied:=false;
  BEGIN PERFORM public.prepare_home_visit_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Outside radius',gen_random_uuid(),destination);
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Out-of-coverage address accepted'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.appointment WHERE patient_id=patient_key) THEN RAISE EXCEPTION 'Invalid address retained appointment'; END IF;
  UPDATE clinzo.patient_saved_location SET latitude=extensions.ST_Y(origin::extensions.geometry),longitude=extensions.ST_X(origin::extensions.geometry) WHERE id=destination;
  options:=public.get_appointment_booking_options((slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid);
  IF options->>'requires_payment'<>'true' OR options->>'can_pay_reception'<>'false' THEN RAISE EXCEPTION 'Home payment options incorrect'; END IF;
  result:=public.prepare_home_visit_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Home payment',request_key,destination);
  a:=(result->>'appointment_id')::uuid;
  SELECT home_visit_details INTO snapshot FROM clinzo.appointment WHERE id=a;
  IF result->>'requires_payment'<>'true' OR (SELECT visit_mode FROM clinzo.appointment WHERE id=a)<>'home'
    OR snapshot->>'address'<>'Fixture building, Fixture city' THEN RAISE EXCEPTION 'Home reservation/snapshot incorrect'; END IF;
  result:=public.prepare_home_visit_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Home payment',request_key,destination);
  IF (result->>'appointment_id')::uuid<>a THEN RAISE EXCEPTION 'Home retry duplicated reservation'; END IF;
  denied:=false;
  BEGIN PERFORM public.prepare_home_visit_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Home payment',request_key,other_destination);
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Retry changed destination'; END IF;
  options:=public.get_appointment_billing(a);
  result:=public.prepare_appointment_payment(a,options->>'policy_version'); attempt:=(result->>'id')::uuid;
  order_key:='order_'||replace(attempt::text,'-',''); payment_key:='pay_'||replace(attempt::text,'-','');
  PERFORM public.appointment_provider_command('order_ready',jsonb_build_object('attempt_id',attempt,'entity',jsonb_build_object('id',order_key,'receipt',attempt::text,'amount',50000,'currency','INR')));
  PERFORM public.appointment_provider_command('payment',jsonb_build_object('mode','test','entity',jsonb_build_object('id',payment_key,'order_id',order_key,'amount',50000,'currency','INR','status','captured','captured',true)));
  IF (SELECT status FROM clinzo.appointment WHERE id=a)<>'confirmed' THEN RAISE EXCEPTION 'Home capture did not confirm'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_care_appointments(NULL)) x WHERE x->>'id'=a::text AND x->'home_visit_details'=snapshot) THEN
    RAISE EXCEPTION 'Patient appointment projection lost destination'; END IF;
  DELETE FROM clinzo.patient_saved_location WHERE id=destination;
  -- Rescheduling preserves the booked destination even after address deletion.
  SELECT x INTO slot FROM jsonb_array_elements(public.list_appointment_reschedule_options(a)) x LIMIT 1;
  result:=public.reschedule_appointment(a,(SELECT row_version FROM clinzo.appointment WHERE id=a),(slot->>'window_id')::uuid,'New visit time',gen_random_uuid());
  replacement:=(result->>'id')::uuid;
  IF result->>'kind'<>'rescheduled' OR (SELECT home_visit_details FROM clinzo.appointment WHERE id=replacement) IS DISTINCT FROM snapshot THEN
    RAISE EXCEPTION 'Rescheduling lost home destination'; END IF;
  -- Manual acceptance retains request -> approval -> payment.
  INSERT INTO clinzo.patient_saved_location(patient_id,label,kind,building,city,latitude,longitude)
    VALUES(patient_key,'New visit','house','New building','Fixture city',extensions.ST_Y(origin::extensions.geometry),extensions.ST_X(origin::extensions.geometry)) RETURNING id INTO destination;
  UPDATE clinzo.doctor_schedule_preferences SET auto_accept=false WHERE doctor_facility_id=practice;
  SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'home',NULL,now()+interval '2 days',10000)) x LIMIT 1;
  result:=public.prepare_home_visit_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Manual home',gen_random_uuid(),destination);b:=(result->>'appointment_id')::uuid;
  IF result->>'requires_payment'<>'false' OR (public.get_appointment_billing(b)->>'can_pay')<>'false' THEN RAISE EXCEPTION 'Manual home requested payment too early'; END IF;
  PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_care_appointments(practice)) x WHERE x->>'id'=b::text AND x->'home_visit_details'->>'address'='New building, Fixture city') THEN
    RAISE EXCEPTION 'Doctor/facility projection lost home address'; END IF;
  PERFORM public.transition_clinic_appointment(b,(SELECT row_version FROM clinzo.appointment WHERE id=b),'approve',NULL);
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  IF (public.get_appointment_billing(b)->>'can_pay')<>'true' THEN RAISE EXCEPTION 'Approved home not payable'; END IF;
  IF has_function_privilege('anon','public.prepare_home_visit_booking(uuid,uuid,uuid,text,uuid,uuid)','EXECUTE')
    OR has_function_privilege('authenticated','clinzo.create_patient_booking(uuid,uuid,uuid,text,uuid,text,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Home booking privileges leaked'; END IF;
END $$;
SELECT true AS home_visit_booking_workflow_passed;
ROLLBACK;
