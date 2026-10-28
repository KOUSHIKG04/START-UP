-- Always execute inside an outer BEGIN/ROLLBACK, after the billing migration.
-- No provider calls, real charges, Auth users or persistent fixtures are created.
BEGIN;
DO $$
DECLARE practice uuid; doctor_auth uuid; patient_auth uuid; patient_identity uuid; patient_key uuid;
 a uuid; moved uuid; next_moved uuid; cash_appointment uuid; attempt uuid; topup uuid; request_key uuid; job record;
 slot jsonb; target jsonb; next_target jsonb; details jsonb; prepared jsonb; result jsonb; original_order text;
 initial_payment text; topup_payment text; due bigint; denied boolean; version_before bigint;
BEGIN
 SELECT p.id,i.subject::uuid INTO practice,doctor_auth FROM clinzo.doctor_facility p
 JOIN clinzo.doctor d ON d.id=p.doctor_id JOIN clinzo.identity i ON i.id=d.identity_id
 WHERE d.active AND d.credential_status='verified' AND i.disabled_at IS NULL AND EXISTS(
   SELECT 1 FROM clinzo.session s JOIN clinzo.appointment_window w ON w.session_id=s.id
   WHERE s.doctor_facility_id=p.id AND clinzo.service_mode_for_session(s.id)='online' AND w.starts_at>now()+interval '1 day' AND w.state='open'
   GROUP BY s.booking_day_id HAVING count(*)>=4) LIMIT 1;
 IF practice IS NULL THEN RAISE EXCEPTION 'No payment fixture practice'; END IF;
 SELECT i.id,u.id INTO patient_identity,patient_auth FROM clinzo.identity i JOIN auth.users u ON u.id::text=i.subject AND i.issuer='supabase'
 WHERE i.disabled_at IS NULL AND NOT coalesce(clinzo.can_manage_practice(i.id,practice),false)
 AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL) LIMIT 1;
 INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Payment rollback fixture') RETURNING id INTO patient_key;
 INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient_key,patient_identity,'delegate',now());
 UPDATE clinzo.doctor_schedule_preferences SET online_daily_limit=100,auto_accept=false,max_self_reschedules=10 WHERE doctor_facility_id=practice;
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'online',NULL,now()+interval '1 day',10000)) x LIMIT 1;
 IF slot IS NULL THEN RAISE EXCEPTION 'No online payment fixture slot'; END IF;
 a:=public.book_clinic_appointment(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Payment fixture',gen_random_uuid());
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 PERFORM public.transition_clinic_appointment(a,(SELECT row_version FROM clinzo.appointment WHERE id=a),'approve',NULL);
 UPDATE clinzo.appointment SET fee_minor=50000 WHERE id=a;
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 details:=public.get_appointment_billing(a);
 IF (details->>'enabled')::boolean OR (details->>'can_pay')::boolean THEN RAISE EXCEPTION 'Checkout enabled by default'; END IF;
 UPDATE clinzo.appointment_billing_config SET enabled=true,deduction_bps=1000,policy_version='rollback-fixture-10-percent' WHERE singleton;
 UPDATE clinzo.appointment_billing_config SET activated_at=now()-interval '1 second' WHERE singleton;
 denied:=false;
 BEGIN PERFORM clinzo.require_appointment_payment(a); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Unpaid online consultation was allowed'; END IF;
 prepared:=public.prepare_appointment_payment(a,'rollback-fixture-10-percent');
 attempt:=(prepared->>'id')::uuid;
 IF (public.prepare_appointment_payment(a,'rollback-fixture-10-percent')->>'id')::uuid<>attempt THEN RAISE EXCEPTION 'Duplicate payment attempt'; END IF;
 result:=public.appointment_provider_command('claim_order',jsonb_build_object('attempt_id',attempt));
 IF result IS NULL OR public.appointment_provider_command('claim_order',jsonb_build_object('attempt_id',attempt)) IS NOT NULL THEN RAISE EXCEPTION 'Order work claimed twice'; END IF;
 original_order:='order_'||replace(attempt::text,'-','');initial_payment:='pay_'||replace(attempt::text,'-','');
 PERFORM public.appointment_provider_command('order_ready',jsonb_build_object('attempt_id',attempt,'entity',jsonb_build_object('id',original_order,'amount',50000,'currency','INR','receipt',attempt::text)));
 SELECT x INTO target FROM jsonb_array_elements(public.list_appointment_reschedule_options(a)) x LIMIT 1;
 denied:=false;
 BEGIN PERFORM public.reschedule_appointment(a,(SELECT row_version FROM clinzo.appointment WHERE id=a),(target->>'window_id')::uuid,'Move while payment pending',gen_random_uuid()); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied OR (SELECT status FROM clinzo.appointment WHERE id=a)<>'confirmed' THEN RAISE EXCEPTION 'Pending payment released original appointment'; END IF;
 UPDATE clinzo.appointment_payment_attempt SET expires_at=now()-interval '1 second' WHERE id=attempt;
 PERFORM public.appointment_provider_command('expire_order',jsonb_build_object('attempt_id',attempt,'entity',jsonb_build_object('id',original_order,'status','created')));
 IF (SELECT status FROM clinzo.appointment_payment_attempt WHERE id=attempt)<>'failed' THEN RAISE EXCEPTION 'Expired unpaid attempt blocked recovery forever'; END IF;
 denied:=false;
 BEGIN PERFORM public.appointment_provider_command('payment',jsonb_build_object('entity',jsonb_build_object('id',initial_payment,'order_id',original_order,'amount',1,'currency','INR','status','captured','captured',true))); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Tampered payment amount accepted'; END IF;
 PERFORM public.appointment_provider_command('payment',jsonb_build_object('entity',jsonb_build_object('id',initial_payment,'order_id',original_order,'amount',50000,'currency','INR','status','authorized','captured',false)));
 IF (public.get_appointment_billing(a)->>'captured_minor')::bigint<>0 THEN RAISE EXCEPTION 'Authorized payment treated as paid'; END IF;
 result:=jsonb_build_object('event_id','payment-fixture-'||attempt::text,'digest','fixture-digest','event_type','payment.captured','entity',jsonb_build_object('id',initial_payment,'order_id',original_order,'amount',50000,'currency','INR','status','captured','captured',true));
 PERFORM public.appointment_provider_command('payment',result);
 PERFORM public.appointment_provider_command('payment',result);
 PERFORM public.appointment_provider_command('payment',jsonb_build_object('entity',jsonb_build_object('id',initial_payment,'order_id',original_order,'amount',50000,'currency','INR','status','failed')));
 details:=public.get_appointment_billing(a);
 IF (details->>'captured_minor')::bigint<>50000 OR (details->>'due_minor')::bigint<>0 THEN RAISE EXCEPTION 'Capture duplicated or regressed'; END IF;
 PERFORM clinzo.require_appointment_payment(a);
 UPDATE clinzo.practice_service SET fee_minor=70000 WHERE id=(slot->>'practice_service_id')::uuid;
 result:=public.reschedule_appointment(a,(SELECT row_version FROM clinzo.appointment WHERE id=a),(target->>'window_id')::uuid,'Higher fee move',gen_random_uuid());
 moved:=(result->>'id')::uuid;details:=public.get_appointment_billing(moved);
 IF (details->>'due_minor')::bigint<>20000 OR (details->>'captured_minor')::bigint<>50000 OR (details->>'appointment_id')::uuid<>moved THEN RAISE EXCEPTION 'Payment not carried or top-up incorrect'; END IF;
 prepared:=public.prepare_appointment_payment(moved,'rollback-fixture-10-percent');topup:=(prepared->>'id')::uuid;
 topup_payment:='pay_'||replace(topup::text,'-','');
 PERFORM public.appointment_provider_command('order_ready',jsonb_build_object('attempt_id',topup,'entity',jsonb_build_object('id','order_'||replace(topup::text,'-',''),'amount',20000,'currency','INR','receipt',topup::text)));
 PERFORM public.appointment_provider_command('payment',jsonb_build_object('entity',jsonb_build_object('id',topup_payment,'order_id','order_'||replace(topup::text,'-',''),'amount',20000,'currency','INR','status','captured','captured',true)));
 SELECT x INTO next_target FROM jsonb_array_elements(public.list_appointment_reschedule_options(moved)) x LIMIT 1;
 UPDATE clinzo.practice_service SET fee_minor=40000 WHERE id=(slot->>'practice_service_id')::uuid;
 result:=public.reschedule_appointment(moved,(SELECT row_version FROM clinzo.appointment WHERE id=moved),(next_target->>'window_id')::uuid,'Lower fee move',gen_random_uuid());next_moved:=(result->>'id')::uuid;
 details:=public.get_appointment_billing(next_moved);
 IF (details->>'surplus_minor')::bigint<>30000 THEN RAISE EXCEPTION 'Lower fee lost unused credit'; END IF;
 request_key:=public.request_appointment_refund(next_moved,'surplus','Return unused credit',30000,0);
 denied:=false;
 BEGIN PERFORM public.reschedule_appointment(next_moved,(SELECT row_version FROM clinzo.appointment WHERE id=next_moved),(target->>'window_id')::uuid,'Refund race',gen_random_uuid()); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Reserved refund credit reused'; END IF;
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 PERFORM public.decide_appointment_refund(request_key,1,true,'Return surplus only');
 FOR job IN SELECT j.*,p.payment_id AS provider_payment FROM clinzo.appointment_refund_job j JOIN clinzo.appointment_payment_attempt p ON p.id=j.attempt_id WHERE j.refund_id=request_key LOOP
   PERFORM public.appointment_provider_command('claim_refund',jsonb_build_object('job_id',job.id));
   PERFORM public.appointment_provider_command('refund_result',jsonb_build_object('job_id',job.id,'entity',jsonb_build_object('id','rfnd_'||replace(job.id::text,'-',''),'payment_id',job.provider_payment,'amount',job.amount_minor,'currency','INR','receipt',job.id::text,'status','processed')));
 END LOOP;
 details:=public.get_appointment_billing(next_moved);
 IF (details->>'credit_minor')::bigint<>40000 OR (details->>'refunded_minor')::bigint<>30000 THEN RAISE EXCEPTION 'Surplus refund balance incorrect'; END IF;
 PERFORM public.resolve_appointment_attendance(next_moved,(SELECT row_version FROM clinzo.appointment WHERE id=next_moved),'doctor_unavailable','Doctor cannot attend');
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 details:=public.get_appointment_billing(next_moved);
 IF (details->>'refund_deduction_minor')::bigint<>0 THEN RAISE EXCEPTION 'Doctor fault deducted patient money'; END IF;
 request_key:=public.request_appointment_refund(next_moved,'cancel','Refund doctor unavailable appointment',40000,0);
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 PERFORM public.decide_appointment_refund(request_key,1,true,'Full remaining balance');
 FOR job IN SELECT j.*,p.payment_id AS provider_payment FROM clinzo.appointment_refund_job j JOIN clinzo.appointment_payment_attempt p ON p.id=j.attempt_id WHERE j.refund_id=request_key LOOP
   result:=jsonb_build_object('job_id',job.id,'entity',jsonb_build_object('id','rfnd_'||replace(job.id::text,'-',''),'payment_id',job.provider_payment,'amount',job.amount_minor,'currency','INR','receipt',job.id::text,'status','processed'));
   PERFORM public.appointment_provider_command('refund_result',result);
   PERFORM public.appointment_provider_command('refund_result',result);
 END LOOP;
 details:=public.get_appointment_billing(next_moved);
 IF (details->>'refunded_minor')::bigint<>70000 OR (details->>'credit_minor')::bigint<>0 THEN RAISE EXCEPTION 'Refund repeated or balance reused'; END IF;
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now()+interval '1 day',10000)) x LIMIT 1;
 IF slot IS NULL THEN RAISE EXCEPTION 'No cash fixture clinic slot'; END IF;
 cash_appointment:=public.book_clinic_appointment(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Cash fixture',gen_random_uuid());
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 PERFORM public.transition_clinic_appointment(cash_appointment,(SELECT row_version FROM clinzo.appointment WHERE id=cash_appointment),'approve',NULL);
 UPDATE clinzo.appointment SET fee_minor=50000 WHERE id=cash_appointment;
 PERFORM public.record_appointment_cash(cash_appointment,50000,'Patient accepted terms and paid cash');
 denied:=false;
 BEGIN PERFORM public.record_appointment_cash(cash_appointment,50000,'Duplicate cash confirmation'); EXCEPTION WHEN SQLSTATE 'PT409' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cash recorded twice'; END IF;
 PERFORM public.resolve_appointment_attendance(cash_appointment,(SELECT row_version FROM clinzo.appointment WHERE id=cash_appointment),'doctor_unavailable','Doctor unavailable');
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 request_key:=public.request_appointment_refund(cash_appointment,'cancel','Return cash',50000,0);
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 PERFORM public.decide_appointment_refund(request_key,1,true,'Cash refund approved');
 PERFORM public.confirm_appointment_cash_refund(request_key,'Cash handed back to patient');
 PERFORM public.confirm_appointment_cash_refund(request_key,'Repeated confirmation');
 IF (public.get_appointment_billing(cash_appointment)->>'refunded_minor')::bigint<>50000 THEN RAISE EXCEPTION 'Cash refund repeated'; END IF;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);denied:=false;
 BEGIN PERFORM public.get_appointment_billing(a); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Unauthorized billing exposed'; END IF;
 IF has_function_privilege('authenticated','public.appointment_provider_command(text,jsonb)','EXECUTE')
   OR has_function_privilege('anon','public.prepare_appointment_payment(uuid,text)','EXECUTE')
   OR has_table_privilege('authenticated','clinzo.appointment_charge','SELECT') THEN RAISE EXCEPTION 'Billing grants exposed'; END IF;
END $$;
SELECT true AS appointment_payment_workflow_passed;
ROLLBACK;
