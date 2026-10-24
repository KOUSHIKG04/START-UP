-- Run after the migration inside BEGIN/ROLLBACK. Uses only transient fixture
-- patients/bookings and existing verified identities; creates no Auth users.
DO $$
DECLARE practice uuid; doctor_key uuid; doctor_auth uuid; doctor_identity uuid; patient_auth uuid; patient_identity uuid;
  patient_key uuid; original uuid; replacement uuid; next_replacement uuid; occupied uuid; key uuid; slot jsonb; next_slot jsonb;
  result jsonb; replay jsonb; prefs jsonb; day date; local_zone text; version_before bigint; before_count int; denied boolean; request_key uuid;
  clinic_original uuid; clinic_moved uuid; clinic_slot jsonb; clinic_target jsonb;
BEGIN
 SELECT p.id,d.id,i.id,i.subject::uuid,d.booking_timezone INTO practice,doctor_key,doctor_identity,doctor_auth,local_zone
 FROM clinzo.doctor_facility p JOIN clinzo.doctor d ON d.id=p.doctor_id JOIN clinzo.identity i ON i.id=d.identity_id
 JOIN auth.users u ON u.id::text=i.subject JOIN clinzo.doctor_schedule_preferences prefs ON prefs.doctor_facility_id=p.id
 WHERE d.active AND d.credential_status='verified' AND i.disabled_at IS NULL AND prefs.online_daily_limit>0
   AND EXISTS(SELECT 1 FROM clinzo.session s JOIN clinzo.appointment_window w ON w.session_id=s.id
     WHERE s.doctor_facility_id=p.id AND clinzo.service_mode_for_session(s.id)='online' AND w.starts_at>now()+interval '1 day' AND w.state='open') LIMIT 1;
 IF practice IS NULL THEN RAISE EXCEPTION 'No online recovery fixture practice'; END IF;
 SELECT bd.local_date INTO day FROM clinzo.session s JOIN clinzo.doctor_booking_day bd ON bd.id=s.booking_day_id
 JOIN clinzo.appointment_window w ON w.session_id=s.id WHERE s.doctor_facility_id=practice AND clinzo.service_mode_for_session(s.id)='online'
   AND w.starts_at>now()+interval '1 day' AND w.state='open' AND s.state IN ('published','open')
   AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.session booked ON booked.id=a.session_id WHERE booked.booking_day_id=s.booking_day_id AND booked.doctor_facility_id=practice)
 GROUP BY bd.local_date HAVING count(*)>=4 ORDER BY bd.local_date LIMIT 1;
 IF day IS NULL THEN RAISE EXCEPTION 'No empty online fixture day'; END IF;
 SELECT i.id,u.id INTO patient_identity,patient_auth FROM clinzo.identity i JOIN auth.users u ON i.subject=u.id::text AND i.issuer='supabase'
 WHERE i.disabled_at IS NULL AND NOT coalesce(clinzo.can_manage_practice(i.id,practice),false)
   AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL) LIMIT 1;
 IF patient_auth IS NULL THEN RAISE EXCEPTION 'No independent patient identity'; END IF;
 INSERT INTO clinzo.patient(public_code,full_name) VALUES(gen_random_uuid()::text,'Recovery rollback fixture') RETURNING id INTO patient_key;
 INSERT INTO clinzo.patient_access(patient_id,identity_id,relationship,verified_at) VALUES(patient_key,patient_identity,'delegate',now());
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 prefs:=public.get_my_schedule_preferences(practice);
 prefs:=public.set_appointment_recovery_policy(practice,(prefs->>'row_version')::bigint,25,0,1);
 IF (prefs->>'online_grace_minutes')::int<>25 OR (prefs->>'max_self_reschedules')::int<>1 THEN RAISE EXCEPTION 'Editable policy did not persist'; END IF;
 denied:=false;
 BEGIN PERFORM public.set_appointment_recovery_policy(practice,(prefs->>'row_version')::bigint-1,15,0,1); EXCEPTION WHEN SQLSTATE 'PT409' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Stale policy accepted'; END IF;
 UPDATE clinzo.doctor_schedule_preferences SET online_daily_limit=1,auto_accept=false WHERE doctor_facility_id=practice;
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 SELECT x INTO slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'online',NULL,now(),10000)) x
 WHERE ((x->>'starts_at')::timestamptz AT TIME ZONE local_zone)::date=day LIMIT 1;
 original:=public.book_clinic_appointment(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Recovery fixture',gen_random_uuid());
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 PERFORM public.transition_clinic_appointment(original,(SELECT row_version FROM clinzo.appointment WHERE id=original),'approve',NULL);
 version_before:=(SELECT row_version FROM clinzo.appointment WHERE id=original);
 denied:=false;
 BEGIN PERFORM public.resolve_appointment_attendance(original,version_before,'no_show',NULL); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Future patient marked no-show'; END IF;
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 SELECT x INTO next_slot FROM jsonb_array_elements(public.list_appointment_reschedule_options(original)) x
 WHERE ((x->>'starts_at')::timestamptz AT TIME ZONE local_zone)::date=day LIMIT 1;
 IF next_slot IS NULL THEN RAISE EXCEPTION 'Same-day move at daily cap has no options'; END IF;
 key:=gen_random_uuid();
 result:=public.reschedule_appointment(original,version_before,(next_slot->>'window_id')::uuid,'Change appointment time',key);
 replacement:=(result->>'id')::uuid;
 replay:=public.reschedule_appointment(original,version_before,(next_slot->>'window_id')::uuid,'Change appointment time',key);
 IF result IS DISTINCT FROM replay OR result->>'kind'<>'rescheduled' THEN RAISE EXCEPTION 'Reschedule retry duplicated/lost result'; END IF;
 replay:=public.reschedule_appointment(original,(SELECT row_version FROM clinzo.appointment WHERE id=original),(next_slot->>'window_id')::uuid,'Change appointment time',key);
 IF result IS DISTINCT FROM replay THEN RAISE EXCEPTION 'Refresh after lost response prevented idempotent replay'; END IF;
 IF NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=original AND status='cancelled' AND recovery_outcome='rescheduled')
   OR NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=replacement AND replaces_appointment_id=original AND status='confirmed' AND source='patient_online') THEN RAISE EXCEPTION 'Replacement lineage/source/status invalid'; END IF;
 IF (SELECT count(*) FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id JOIN clinzo.doctor_booking_day bd ON bd.id=s.booking_day_id WHERE bd.local_date=day AND s.doctor_facility_id=practice AND a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL)<>1 THEN RAISE EXCEPTION 'Move consumed duplicate daily capacity'; END IF;
 denied:=false;
 BEGIN PERFORM public.reschedule_appointment(replacement,(SELECT row_version FROM clinzo.appointment WHERE id=replacement),(slot->>'window_id')::uuid,'Second direct move',gen_random_uuid()); EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Self-service limit bypassed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 prefs:=public.get_my_schedule_preferences(practice);PERFORM public.set_appointment_recovery_policy(practice,(prefs->>'row_version')::bigint,25,0,3);
 UPDATE clinzo.doctor_schedule_preferences SET online_daily_limit=3 WHERE doctor_facility_id=practice;
 -- Seed a missed attendance outcome to verify the approval path independently
 -- of wall-clock scheduling; the future no-show guard was checked above.
 UPDATE clinzo.appointment SET status='no_show',capacity_released_at=now() WHERE id=replacement;
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 version_before:=(SELECT row_version FROM clinzo.appointment WHERE id=replacement);
 PERFORM set_config('clinzo.live_change_keys','[]',true);
 result:=public.reschedule_appointment(replacement,version_before,(slot->>'window_id')::uuid,'Missed appointment; please move',gen_random_uuid());
 IF NOT (current_setting('clinzo.live_change_keys')::jsonb ? ('identity-events:'||patient_identity::text||'|appointments'))
   OR NOT (current_setting('clinzo.live_change_keys')::jsonb ? ('identity-events:'||doctor_identity::text||'|appointments')) THEN RAISE EXCEPTION 'Pending reschedule did not notify patient and doctor'; END IF;
 request_key:=(result->>'id')::uuid;
 IF result->>'kind'<>'requested' OR (SELECT status FROM clinzo.appointment WHERE id=replacement)<>'no_show' THEN RAISE EXCEPTION 'Late request moved without approval'; END IF;
 occupied:=public.book_clinic_appointment(patient_key,(slot->>'window_id')::uuid,(slot->>'practice_service_id')::uuid,'Target taken while waiting',gen_random_uuid());
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 denied:=false;
 BEGIN PERFORM public.decide_appointment_recovery(request_key,1,true,'Approve requested time'); EXCEPTION WHEN check_violation THEN denied:=true; END;
 IF NOT denied OR (SELECT status FROM clinzo.appointment_recovery_request WHERE id=request_key)<>'pending' OR (SELECT status FROM clinzo.appointment WHERE id=replacement)<>'no_show' THEN RAISE EXCEPTION 'Failed approval released original or resolved request'; END IF;
 PERFORM public.transition_clinic_appointment(occupied,(SELECT row_version FROM clinzo.appointment WHERE id=occupied),'cancel',NULL);
 result:=public.decide_appointment_recovery(request_key,1,true,'Approved after checking availability');
 next_replacement:=(result->>'id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_recovery_request WHERE id=request_key AND status='approved' AND replacement_id=next_replacement) THEN RAISE EXCEPTION 'Approval did not link replacement'; END IF;
 version_before:=(SELECT row_version FROM clinzo.appointment WHERE id=next_replacement);
 PERFORM public.resolve_appointment_attendance(next_replacement,version_before,'doctor_unavailable','Doctor cannot attend this session');
 IF clinzo.appointment_recovery_details(next_replacement)->>'outcome'<>'doctor_unavailable' OR (SELECT status FROM clinzo.appointment WHERE id=next_replacement)<>'cancelled' THEN RAISE EXCEPTION 'Doctor fault classified as patient no-show'; END IF;
 PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
 PERFORM set_config('clinzo.live_change_keys','[]',true);
 request_key:=public.request_appointment_review(next_replacement,(SELECT row_version FROM clinzo.appointment WHERE id=next_replacement),'Please review the interruption');
 IF NOT (current_setting('clinzo.live_change_keys')::jsonb ? ('identity-events:'||doctor_identity::text||'|appointments')) THEN RAISE EXCEPTION 'Attendance review did not notify clinic'; END IF;
 -- A confirmed clinic move must create a fresh arrival ticket and cancel the old
 -- queue entry, while keeping its app-registration source and session deadline.
 SELECT x INTO clinic_slot FROM jsonb_array_elements(public.list_practice_service_slots(practice,'clinic',NULL,now(),10000)) x LIMIT 1;
 IF clinic_slot IS NULL THEN RAISE EXCEPTION 'No clinic recovery fixture time'; END IF;
 clinic_original:=public.book_clinic_appointment(patient_key,(clinic_slot->>'window_id')::uuid,(clinic_slot->>'practice_service_id')::uuid,'Clinic recovery fixture',gen_random_uuid());
 PERFORM set_config('request.jwt.claim.sub',doctor_auth::text,true);
 IF (SELECT status FROM clinzo.appointment WHERE id=clinic_original)='pending' THEN
   PERFORM public.transition_clinic_appointment(clinic_original,(SELECT row_version FROM clinzo.appointment WHERE id=clinic_original),'approve',NULL);
 END IF;
 SELECT x INTO clinic_target FROM jsonb_array_elements(public.list_appointment_reschedule_options(clinic_original)) x LIMIT 1;
 IF clinic_target IS NULL THEN RAISE EXCEPTION 'No clinic replacement fixture time'; END IF;
 result:=public.reschedule_appointment(clinic_original,(SELECT row_version FROM clinzo.appointment WHERE id=clinic_original),(clinic_target->>'window_id')::uuid,'Staff arranged clinic move',gen_random_uuid());
 clinic_moved:=(result->>'id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=clinic_original AND state='cancelled')
   OR NOT EXISTS(SELECT 1 FROM clinzo.queue_entry WHERE appointment_id=clinic_moved AND state='awaiting_arrival')
   OR NOT EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=clinic_moved AND source='patient_online' AND reschedule_count=0)
   OR (clinzo.appointment_recovery_details(clinic_moved)->>'attendance_deadline')::timestamptz IS DISTINCT FROM (SELECT s.ends_at FROM clinzo.session s JOIN clinzo.appointment a ON a.session_id=s.id WHERE a.id=clinic_moved) THEN
   RAISE EXCEPTION 'Clinic move lost queue, source, allowance or session deadline';
 END IF;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);denied:=false;
 BEGIN PERFORM public.list_appointment_reschedule_options(next_replacement); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Unauthorized appointment options exposed'; END IF;
 IF has_function_privilege('anon','public.reschedule_appointment(uuid,bigint,uuid,text,uuid)','EXECUTE')
   OR has_table_privilege('authenticated','clinzo.appointment_recovery_request','SELECT') THEN RAISE EXCEPTION 'Recovery grants exposed'; END IF;
END $$;
SELECT true AS appointment_recovery_workflow_passed;
