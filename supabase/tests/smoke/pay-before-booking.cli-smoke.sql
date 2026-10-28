-- Run after the migration inside BEGIN/ROLLBACK. No gateway calls or real payments.
BEGIN;
DO $$
DECLARE practice uuid; doctor_auth uuid; patient_auth uuid; patient_identity uuid; patient_key uuid;
 slot jsonb; result jsonb; options jsonb; a uuid; b uuid; replacement uuid; attempt uuid; first_key uuid:=gen_random_uuid(); denied boolean; order_key text; payment_key text;
BEGIN
 SELECT p.id,i.subject::uuid INTO practice,doctor_auth FROM clinzo.doctor_facility p JOIN clinzo.doctor d ON d.id=p.doctor_id JOIN clinzo.identity i ON i.id=d.identity_id
 WHERE d.active AND d.credential_status='verified' AND i.disabled_at IS NULL AND EXISTS(SELECT 1 FROM clinzo.session s JOIN clinzo.appointment_window w ON w.session_id=s.id
 WHERE s.doctor_facility_id=p.id AND clinzo.service_mode_for_session(s.id)='online' AND w.starts_at>now()+interval '1 day' AND w.state='open' GROUP BY s.booking_day_id HAVING count(*)>=6) LIMIT 1;
 IF practice IS NULL THEN RAISE EXCEPTION 'No future fixture practice'; END IF;
 SELECT i.id,u.id INTO patient_identity,patient_auth FROM clinzo.identity i JOIN auth.users u ON u.id::text=i.subject AND i.issuer='supabase'
 WHERE i.disabled_at IS NULL AND NOT coalesce(clinzo.can_manage_practice(i.id,practice),false) AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL) LIMIT 1;
 INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Pay before booking rollback fixture') RETURNING id INTO patient_key;
 INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient_key,patient_identity,'delegate',now());
 UPDATE clinzo.appointment_billing_config SET enabled=true,mode='test' WHERE singleton;
 UPDATE clinzo.doctor_schedule_preferences SET auto_accept=true,auto_accept_limit=100,online_daily_limit=100 WHERE doctor_facility_id=practice;
 UPDATE clinzo.practice_service SET fee_minor=50000 WHERE doctor_facility_id=practice AND code LIKE 'online-%';
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'online',NULL,now()+interval '1 day',10000)) x LIMIT 1;
 options:=public.get_appointment_booking_options((slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid);
 IF options->>'auto_accept'<>'true' OR options->>'requires_payment'<>'true' OR options->>'can_pay_reception'<>'false' THEN RAISE EXCEPTION 'Incorrect auto-accept payment preview'; END IF;
 result:=public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Auto payment fixture',first_key,'online');a:=(result->>'appointment_id')::uuid;
 IF result->>'requires_payment'<>'true' OR (SELECT status FROM clinzo.appointment WHERE id=a)<>'pending' OR EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=a) THEN RAISE EXCEPTION 'Unpaid booking confirmed or entered queue'; END IF;
 UPDATE clinzo.doctor_schedule_preferences SET auto_accept_limit=1 WHERE doctor_facility_id=practice;
 IF clinzo.booking_auto_accepts((SELECT session_id FROM clinzo.appointment WHERE id=a)) THEN RAISE EXCEPTION 'Payment reservation did not reserve the auto-accept budget'; END IF;
 UPDATE clinzo.doctor_schedule_preferences SET auto_accept_limit=100 WHERE doctor_facility_id=practice;
 result:=public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Auto payment fixture',first_key,'online');
 IF (result->>'appointment_id')::uuid<>a THEN RAISE EXCEPTION 'Booking retry duplicated reservation'; END IF;
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true); denied:=false;
 BEGIN PERFORM public.transition_clinic_appointment(a,(SELECT row_version FROM clinzo.appointment WHERE id=a),'approve',NULL); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Doctor bypassed capture gate'; END IF;
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 options:=public.get_appointment_billing(a);
 IF options->>'can_pay'<>'true' THEN RAISE EXCEPTION 'Reservation checkout unavailable'; END IF;
 result:=public.prepare_appointment_payment(a,options->>'policy_version');attempt:=(result->>'id')::uuid;
 order_key:='order_'||replace(attempt::text,'-',''); payment_key:='pay_'||replace(attempt::text,'-','');
 PERFORM public.appointment_provider_command('order_ready',jsonb_build_object('attempt_id',attempt,'entity',jsonb_build_object('id',order_key,'receipt',attempt::text,'amount',50000,'currency','INR')));
 PERFORM public.appointment_provider_command('payment',jsonb_build_object('mode','test','entity',jsonb_build_object('id',payment_key,'order_id',order_key,'amount',50000,'currency','INR','status','authorized','captured',false)));
 IF (SELECT status FROM clinzo.appointment WHERE id=a)<>'pending' THEN RAISE EXCEPTION 'Authorization counted as capture'; END IF;
 result:=jsonb_build_object('mode','test','entity',jsonb_build_object('id',payment_key,'order_id',order_key,'amount',50000,'currency','INR','status','captured','captured',true));
 PERFORM public.appointment_provider_command('payment',result);PERFORM public.appointment_provider_command('payment',result);
 IF (SELECT status FROM clinzo.appointment WHERE id=a)<>'confirmed' OR (SELECT confirmation_payment_pending FROM clinzo.appointment WHERE id=a)
 OR (SELECT count(*) FROM clinzo.queue_entry WHERE appointment_id=a)<>1 THEN RAISE EXCEPTION 'Capture did not confirm exactly once'; END IF;
 -- Expired holds release the slot. A late capture cannot reclaim it.
 SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'online',NULL,now()+interval '1 day',10000)) x LIMIT 1;
 result:=public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Late capture fixture',gen_random_uuid(),'online');b:=(result->>'appointment_id')::uuid;
 options:=public.get_appointment_billing(b); result:=public.prepare_appointment_payment(b,options->>'policy_version');attempt:=(result->>'id')::uuid;
 order_key:='order_'||replace(attempt::text,'-','');payment_key:='pay_'||replace(attempt::text,'-','');
 PERFORM public.appointment_provider_command('order_ready',jsonb_build_object('attempt_id',attempt,'entity',jsonb_build_object('id',order_key,'receipt',attempt::text,'amount',50000,'currency','INR')));
 UPDATE clinzo.appointment SET request_expires_at=now()-interval '1 second' WHERE id=b;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_practice_service_slots(practice,'online',NULL,now()+interval '1 day',10000)) x WHERE x->>'window_id'=slot->>'window_id') THEN RAISE EXCEPTION 'Expired reservation still hides its slot'; END IF;
 result:=public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Replacement after expiry',gen_random_uuid(),'online');replacement:=(result->>'appointment_id')::uuid;
 PERFORM public.appointment_provider_command('payment',jsonb_build_object('mode','test','entity',jsonb_build_object('id',payment_key,'order_id',order_key,'amount',50000,'currency','INR','status','captured','captured',true)));
 options:=public.get_appointment_billing(b);
 IF (SELECT status FROM clinzo.appointment WHERE id=b)<>'rejected' OR EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=b)
 OR (options->>'credit_minor')::bigint<>50000 OR options->>'can_refund'<>'true' THEN RAISE EXCEPTION 'Late capture lost credit or double-booked released slot'; END IF;
 PERFORM public.release_appointment_booking(replacement);
 IF (SELECT status FROM clinzo.appointment WHERE id=replacement)<>'rejected' THEN RAISE EXCEPTION 'Checkout cancellation retained reservation'; END IF;
 -- Manual approval stays request -> approval -> payment.
 UPDATE clinzo.doctor_schedule_preferences SET auto_accept=false WHERE doctor_facility_id=practice;
 SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'online',NULL,now()+interval '1 day',10000)) x LIMIT 1;
 result:=public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Manual fixture',gen_random_uuid(),'online');b:=(result->>'appointment_id')::uuid;
 IF result->>'requires_payment'<>'false' OR (SELECT confirmation_payment_pending FROM clinzo.appointment WHERE id=b) THEN RAISE EXCEPTION 'Manual request tried checkout before approval'; END IF;
 options:=public.get_appointment_billing(b);IF options->>'can_pay'<>'false' THEN RAISE EXCEPTION 'Pending manual request payable'; END IF;
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 PERFORM public.transition_clinic_appointment(b,(SELECT row_version FROM clinzo.appointment WHERE id=b),'approve',NULL);
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 options:=public.get_appointment_billing(b);IF options->>'can_pay'<>'true' THEN RAISE EXCEPTION 'Approved request not payable'; END IF;
 -- Online callers cannot select reception to bypass prepayment.
 denied:=false;BEGIN PERFORM public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Invalid reception',gen_random_uuid(),'reception');EXCEPTION WHEN invalid_parameter_value THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Online reception bypass accepted'; END IF;
 UPDATE clinzo.doctor_schedule_preferences SET auto_accept=true WHERE doctor_facility_id=practice;
 UPDATE clinzo.practice_service SET fee_minor=0 WHERE doctor_facility_id=practice AND code LIKE 'online-%';
 SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'online',NULL,now()+interval '1 day',10000)) x LIMIT 1;
 result:=public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Free fixture',gen_random_uuid(),'online');
 IF result->>'status'<>'confirmed' OR result->>'requires_payment'<>'false' THEN RAISE EXCEPTION 'Free booking requires checkout'; END IF;
 SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now()+interval '1 day',10000)) x LIMIT 1;
 IF slot IS NULL THEN RAISE EXCEPTION 'No reception-payment fixture slot'; END IF;
 options:=public.get_appointment_booking_options((slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid);
 IF options->>'can_pay_reception'<>'false' THEN RAISE EXCEPTION 'Clinic app still advertises reception'; END IF;
 denied:=false;BEGIN PERFORM public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Reception fixture',gen_random_uuid(),'reception');EXCEPTION WHEN invalid_parameter_value THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Clinic app bypassed online payment through reception'; END IF;
 UPDATE clinzo.practice_service SET fee_minor=50000 WHERE id=(slot->>'practice_service_id')::uuid;
 result:=public.prepare_appointment_booking(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Clinic online fixture',gen_random_uuid(),'online');
 IF result->>'status'<>'pending' OR result->>'requires_payment'<>'true' THEN RAISE EXCEPTION 'Clinic app skipped online checkout'; END IF;
 IF has_function_privilege('anon','public.prepare_appointment_booking(uuid,uuid,uuid,text,uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','clinzo.create_patient_booking(uuid,uuid,uuid,text,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Booking implementation privileges leaked'; END IF;
END $$;
SELECT true AS pay_before_booking_workflow_passed;
ROLLBACK;
