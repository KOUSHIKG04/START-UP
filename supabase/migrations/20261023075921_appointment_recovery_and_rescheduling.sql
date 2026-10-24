ALTER TABLE clinzo.doctor_schedule_preferences
  ADD COLUMN online_grace_minutes integer NOT NULL DEFAULT 15 CHECK(online_grace_minutes BETWEEN 0 AND 180),
  ADD COLUMN reschedule_cutoff_minutes integer NOT NULL DEFAULT 0 CHECK(reschedule_cutoff_minutes BETWEEN 0 AND 10080),
  ADD COLUMN max_self_reschedules integer NOT NULL DEFAULT 1 CHECK(max_self_reschedules BETWEEN 0 AND 10);
ALTER TABLE clinzo.appointment
  ADD COLUMN recovery_outcome text CHECK(recovery_outcome IN ('rescheduled','doctor_unavailable')),
  ADD COLUMN reschedule_count integer NOT NULL DEFAULT 0 CHECK(reschedule_count>=0);
-- Existing no-show transitions release reserved capacity, just like cancellation.
ALTER TABLE clinzo.appointment DROP CONSTRAINT appointment_ck_3;
ALTER TABLE clinzo.appointment ADD CONSTRAINT appointment_ck_3 CHECK(capacity_released_at IS NULL OR (status IN ('cancelled','no_show') AND confirmed_at IS NOT NULL));

CREATE TABLE clinzo.appointment_recovery_request(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES clinzo.appointment(id),
  kind text NOT NULL CHECK(kind IN ('reschedule','review')),
  target_window_id uuid REFERENCES clinzo.appointment_window(id),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 2 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),
  requested_by uuid NOT NULL REFERENCES clinzo.identity(id),
  decided_by uuid REFERENCES clinzo.identity(id),
  decision_note text,
  replacement_id uuid REFERENCES clinzo.appointment(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  row_version bigint NOT NULL DEFAULT 1,
  CHECK((kind='reschedule')=(target_window_id IS NOT NULL))
);
CREATE UNIQUE INDEX appointment_recovery_request_pending_uq ON clinzo.appointment_recovery_request(appointment_id) WHERE status='pending';
CREATE INDEX appointment_recovery_request_appointment_idx ON clinzo.appointment_recovery_request(appointment_id,created_at DESC);
ALTER TABLE clinzo.appointment_recovery_request ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.appointment_recovery_request FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.can_access_recovery(actor uuid,appointment_key uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id WHERE a.id=appointment_key
   AND (coalesce(clinzo.can_manage_practice(actor,s.doctor_facility_id),false) OR EXISTS(
     SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id WHERE pa.patient_id=a.patient_id
       AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL)));
$$;
REVOKE ALL ON FUNCTION clinzo.can_access_recovery(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.appointment_recovery_details(appointment_key uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('outcome',a.recovery_outcome,'rescheduled_from_id',a.replaces_appointment_id,
   'rescheduled_to_id',(SELECT id FROM clinzo.appointment WHERE replaces_appointment_id=a.id),
   'reschedule_count',a.reschedule_count,'online_grace_minutes',coalesce(p.online_grace_minutes,15),
   'reschedule_cutoff_minutes',coalesce(p.reschedule_cutoff_minutes,0),'max_self_reschedules',coalesce(p.max_self_reschedules,1),
   'attendance_deadline',CASE WHEN a.visit_mode='clinic' THEN s.ends_at
     ELSE w.ends_at+make_interval(mins=>coalesce(p.online_grace_minutes,15)) END,
   'can_manage',coalesce(clinzo.can_manage_practice(clinzo.require_identity(),s.doctor_facility_id),false),
   'request',(SELECT jsonb_build_object('id',r.id,'kind',r.kind,'reason',r.reason,'status',r.status,'row_version',r.row_version::text,
     'target_starts_at',tw.starts_at,'decision_note',r.decision_note,'replacement_id',r.replacement_id)
     FROM clinzo.appointment_recovery_request r LEFT JOIN clinzo.appointment_window tw ON tw.id=r.target_window_id
     WHERE r.appointment_id=a.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1))
 FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id JOIN clinzo.appointment_window w ON w.id=a.window_id
 LEFT JOIN clinzo.doctor_schedule_preferences p ON p.doctor_facility_id=s.doctor_facility_id WHERE a.id=appointment_key;
$$;
REVOKE ALL ON FUNCTION clinzo.appointment_recovery_details(uuid) FROM PUBLIC,anon,authenticated;

DO $$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('public.list_care_appointments(uuid)'::regprocedure);
 IF position('items.value || jsonb_build_object(' in definition)=0 THEN RAISE EXCEPTION 'Unexpected appointment owner'; END IF;
 definition:=replace(definition,'items.value || jsonb_build_object(',
   'items.value || jsonb_build_object(''recovery'',clinzo.appointment_recovery_details(a.id)) || jsonb_build_object(');
 EXECUTE definition;
 definition:=pg_get_functiondef('public.get_my_schedule_preferences(uuid)'::regprocedure);
 IF position('''row_version'',s.row_version::text' in definition)=0 THEN RAISE EXCEPTION 'Unexpected settings owner'; END IF;
 definition:=replace(definition,'''row_version'',s.row_version::text',
   '''online_grace_minutes'',s.online_grace_minutes,''reschedule_cutoff_minutes'',s.reschedule_cutoff_minutes,''max_self_reschedules'',s.max_self_reschedules,''row_version'',s.row_version::text');
 EXECUTE definition;
END $$;

CREATE FUNCTION public.set_appointment_recovery_policy(p_practice_id uuid,p_expected_version bigint,p_online_grace_minutes integer,p_reschedule_cutoff_minutes integer,p_max_self_reschedules integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor(); prefs clinzo.doctor_schedule_preferences;
BEGIN
 IF NOT coalesce(clinzo.can_edit_practice_schedule(actor,p_practice_id),false) THEN RAISE EXCEPTION 'Schedule access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO prefs FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id FOR UPDATE;
 IF prefs.doctor_facility_id IS NULL OR prefs.row_version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Settings changed; refresh and retry' USING ERRCODE='PT409'; END IF;
 IF p_online_grace_minutes IS NULL OR p_online_grace_minutes NOT BETWEEN 0 AND 180
   OR p_reschedule_cutoff_minutes IS NULL OR p_reschedule_cutoff_minutes NOT BETWEEN 0 AND 10080
   OR p_max_self_reschedules IS NULL OR p_max_self_reschedules NOT BETWEEN 0 AND 10 THEN RAISE EXCEPTION 'Invalid recovery policy' USING ERRCODE='22023'; END IF;
 UPDATE clinzo.doctor_schedule_preferences SET online_grace_minutes=p_online_grace_minutes,reschedule_cutoff_minutes=p_reschedule_cutoff_minutes,max_self_reschedules=p_max_self_reschedules WHERE doctor_facility_id=p_practice_id;
 INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
   VALUES(actor,'identity','appointment.recovery_policy_updated','doctor_facility',p_practice_id,gen_random_uuid(),'allowed',jsonb_build_object('grace',p_online_grace_minutes,'cutoff',p_reschedule_cutoff_minutes,'max_reschedules',p_max_self_reschedules));
 RETURN public.get_my_schedule_preferences(p_practice_id);
END $$;

CREATE FUNCTION public.list_appointment_reschedule_options(p_appointment_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); original clinzo.appointment; practice uuid;
BEGIN
 IF NOT clinzo.can_access_recovery(actor,p_appointment_id) THEN RAISE EXCEPTION 'Appointment access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO original FROM clinzo.appointment WHERE id=p_appointment_id;
 SELECT doctor_facility_id INTO practice FROM clinzo.session WHERE id=original.session_id;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(options) ORDER BY options.starts_at,options.window_id) FROM (
   SELECT w.id AS window_id,ps.id AS practice_service_id,p.id AS practice_id,d.full_name AS doctor_name,f.name AS facility_name,f.address,
     w.starts_at,w.ends_at,s.timezone,ps.fee_minor::text,ps.currency,original.visit_mode AS service_mode
   FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
   JOIN clinzo.doctor_facility p ON p.id=s.doctor_facility_id JOIN clinzo.doctor d ON d.id=s.doctor_id
   JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
   JOIN clinzo.session_service ss ON ss.session_id=s.id JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
   WHERE p.id=practice AND p.active AND f.active AND f.verification_status='verified' AND o.active AND d.active AND d.credential_status='verified'
     AND ps.active AND ps.id=original.practice_service_id AND clinzo.service_mode_for_session(s.id)=original.visit_mode
     AND w.id<>original.window_id AND w.starts_at>now() AND s.state IN ('published','open') AND w.state='open'
     AND clinzo.has_daily_booking_capacity(s.id,original.id)
     AND (original.visit_mode<>'clinic' OR clinzo.remaining_clinic_channel_capacity(s.id,original.source,original.id)>0)
     AND (SELECT count(*) FROM clinzo.appointment a WHERE a.session_id=s.id AND a.id<>original.id AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now())))<s.hard_capacity
     AND (SELECT count(*) FROM clinzo.appointment a WHERE a.window_id=w.id AND a.id<>original.id AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now())))<w.hard_capacity
     AND NOT EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=d.id AND e.state='active'
       AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p.id) AND e.service_mode IN ('all',original.visit_mode) AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at)
   ORDER BY w.starts_at,w.id LIMIT 3000
 ) options),'[]'::jsonb);
END $$;

CREATE FUNCTION public.reschedule_appointment(p_appointment_id uuid,p_expected_version bigint,p_target_window_id uuid,p_reason text,p_idempotency_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); a clinzo.appointment; target clinzo.session; w clinzo.appointment_window;
 prefs clinzo.doctor_schedule_preferences; ps clinzo.practice_service; manager boolean; needs_review boolean; replacement uuid;
 previous clinzo.idempotency_record; fingerprint bytea; request_key uuid; original_practice uuid; q clinzo.session_queue; original_status text;
BEGIN
 IF NOT clinzo.can_access_recovery(actor,p_appointment_id) THEN RAISE EXCEPTION 'Appointment access required' USING ERRCODE='42501'; END IF;
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 2 AND 1000 OR p_target_window_id IS NULL OR p_idempotency_key IS NULL THEN RAISE EXCEPTION 'Choose a time and enter a reason' USING ERRCODE='22023'; END IF;
 fingerprint:=sha256(convert_to(jsonb_build_array(p_appointment_id,p_target_window_id,btrim(p_reason))::text,'UTF8'));
 PERFORM d.id FROM clinzo.doctor d JOIN clinzo.session s ON s.doctor_id=d.id JOIN clinzo.appointment booked ON booked.session_id=s.id WHERE booked.id=p_appointment_id FOR UPDATE OF d;
 -- Acquire both sessions before any appointment/window/day/queue lock.
 PERFORM s.id FROM clinzo.session s WHERE s.id IN ((SELECT session_id FROM clinzo.appointment WHERE id=p_appointment_id),(SELECT session_id FROM clinzo.appointment_window WHERE id=p_target_window_id)) ORDER BY s.id FOR UPDATE;
 SELECT * INTO previous FROM clinzo.idempotency_record WHERE principal_scope=actor::text AND operation='appointment.reschedule' AND key=p_idempotency_key::text;
 IF previous.id IS NOT NULL THEN
   IF previous.request_hash<>fingerprint THEN RAISE EXCEPTION 'Request key already used with different details' USING ERRCODE='22023'; END IF;
   RETURN jsonb_build_object('kind',previous.result_code,'id',previous.resource_id);
 END IF;
 SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
 SELECT doctor_facility_id INTO original_practice FROM clinzo.session WHERE id=a.session_id;
 manager:=coalesce(clinzo.can_manage_practice(actor,original_practice),false);
 IF a.row_version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Appointment changed; refresh and retry' USING ERRCODE='PT409'; END IF;
 IF a.status IN ('in_consultation','completed') OR a.recovery_outcome='rescheduled' OR EXISTS(SELECT 1 FROM clinzo.consultation WHERE appointment_id=a.id)
   OR (a.status IN ('cancelled','rejected') AND a.recovery_outcome IS DISTINCT FROM 'doctor_unavailable' AND coalesce(a.decision_reason,'')<>'Request expired') THEN
   RAISE EXCEPTION 'This appointment cannot be rescheduled' USING ERRCODE='22023'; END IF;
 SELECT * INTO prefs FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=original_practice;
 IF NOT manager AND a.recovery_outcome IS DISTINCT FROM 'doctor_unavailable' AND a.reschedule_count>=coalesce(prefs.max_self_reschedules,1) THEN
   RAISE EXCEPTION 'Self-service rescheduling limit reached; contact the clinic' USING ERRCODE='22023'; END IF;
 SELECT * INTO w FROM clinzo.appointment_window WHERE id=p_target_window_id FOR UPDATE;
 SELECT * INTO target FROM clinzo.session WHERE id=w.session_id;
 IF target.doctor_facility_id IS DISTINCT FROM original_practice OR w.id=a.window_id
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_appointment_reschedule_options(a.id)) x WHERE (x->>'window_id')::uuid=w.id) THEN
   RAISE EXCEPTION 'That time is no longer available. Choose another time.' USING ERRCODE='23514'; END IF;
 needs_review:=NOT manager AND a.recovery_outcome IS DISTINCT FROM 'doctor_unavailable' AND
   (a.status='no_show' OR (a.confirmed_at IS NOT NULL AND (SELECT starts_at FROM clinzo.appointment_window WHERE id=a.window_id)-make_interval(mins=>coalesce(prefs.reschedule_cutoff_minutes,0))<=now()));
 IF needs_review THEN
   IF EXISTS(SELECT 1 FROM clinzo.appointment_recovery_request WHERE appointment_id=a.id AND status='pending') THEN RAISE EXCEPTION 'A request is already awaiting clinic review' USING ERRCODE='22023'; END IF;
   INSERT INTO clinzo.appointment_recovery_request(appointment_id,kind,target_window_id,reason,requested_by)
     VALUES(a.id,'reschedule',w.id,btrim(p_reason),actor) RETURNING id INTO request_key;
   UPDATE clinzo.appointment SET updated_at=now() WHERE id=a.id;
   PERFORM clinzo.emit_appointment_change(a.id);
   INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
     VALUES(actor::text,'appointment.reschedule',p_idempotency_key::text,fingerprint,'appointment_recovery_request',request_key,'requested',now()+interval '30 days');
   RETURN jsonb_build_object('kind','requested','id',request_key);
 END IF;
 SELECT * INTO ps FROM clinzo.practice_service WHERE id=a.practice_service_id;
 original_status:=CASE WHEN a.confirmed_at IS NOT NULL THEN 'confirmed' ELSE 'pending' END;
 -- Release/re-reserve in one transaction so a same-day move at the daily cap
 -- consumes one place. Any validation/insert failure rolls the old state back.
 UPDATE clinzo.appointment SET status='cancelled',recovery_outcome='rescheduled',capacity_released_at=CASE WHEN confirmed_at IS NOT NULL THEN now() END,decision_by=actor,decision_reason=btrim(p_reason) WHERE id=a.id;
 UPDATE clinzo.queue_entry SET state='cancelled' WHERE appointment_id=a.id;
 INSERT INTO clinzo.appointment(public_code,patient_id,session_id,window_id,practice_service_id,source,status,requested_by,request_expires_at,
   confirmed_at,fee_minor,currency,doctor_name_snapshot,facility_name_snapshot,facility_address_snapshot,service_name_snapshot,doctor_registration_snapshot,reason,visit_mode,replaces_appointment_id,reschedule_count)
 VALUES('APT-'||gen_random_uuid()::text,a.patient_id,target.id,w.id,ps.id,a.source,original_status,actor,least(w.starts_at,now()+interval '24 hours'),
   CASE WHEN original_status='confirmed' THEN now() END,ps.fee_minor,ps.currency,a.doctor_name_snapshot,a.facility_name_snapshot,a.facility_address_snapshot,ps.name,a.doctor_registration_snapshot,a.reason,a.visit_mode,a.id,a.reschedule_count+CASE WHEN manager OR a.recovery_outcome='doctor_unavailable' THEN 0 ELSE 1 END) RETURNING id INTO replacement;
 IF original_status='confirmed' AND a.visit_mode='clinic' THEN
   INSERT INTO clinzo.session_queue(session_id) VALUES(target.id) ON CONFLICT(session_id) DO NOTHING;
   SELECT * INTO q FROM clinzo.session_queue WHERE session_id=target.id FOR UPDATE;
   INSERT INTO clinzo.queue_entry(queue_id,appointment_id,ticket_number,state,order_key) VALUES(q.id,replacement,q.next_ticket,'awaiting_arrival',extract(epoch FROM w.starts_at)::bigint);
   UPDATE clinzo.session_queue SET next_ticket=next_ticket+1,queue_version=queue_version+1 WHERE id=q.id;
 END IF;
 UPDATE clinzo.session_queue SET queue_version=queue_version+1 WHERE session_id=a.session_id;
 UPDATE clinzo.appointment_recovery_request SET status='withdrawn',decided_at=now(),decided_by=actor,row_version=row_version+1 WHERE appointment_id=a.id AND status='pending';
 INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
   VALUES(actor::text,'appointment.reschedule',p_idempotency_key::text,fingerprint,'appointment',replacement,'rescheduled',now()+interval '30 days');
 PERFORM clinzo.appointment_event(a.id,actor,'cancel');
 PERFORM clinzo.appointment_event(replacement,actor,CASE WHEN original_status='confirmed' THEN 'approve' ELSE 'requested' END);
 RETURN jsonb_build_object('kind','rescheduled','id',replacement);
END $$;

CREATE FUNCTION public.resolve_appointment_attendance(p_appointment_id uuid,p_expected_version bigint,p_outcome text,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor(); a clinzo.appointment; s clinzo.session; details jsonb;
BEGIN
 SELECT s0.* INTO s FROM clinzo.session s0 JOIN clinzo.appointment a0 ON a0.session_id=s0.id WHERE a0.id=p_appointment_id FOR UPDATE OF s0;
 SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT coalesce(clinzo.can_manage_practice(actor,s.doctor_facility_id),false) THEN RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
 IF a.row_version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Appointment changed; refresh and retry' USING ERRCODE='PT409'; END IF;
 IF a.status<>'confirmed' OR EXISTS(SELECT 1 FROM clinzo.consultation WHERE appointment_id=a.id) THEN RAISE EXCEPTION 'Only an unstarted confirmed appointment can be reviewed' USING ERRCODE='22023'; END IF;
 details:=clinzo.appointment_recovery_details(a.id);
 IF p_outcome NOT IN ('no_show','doctor_unavailable') OR p_outcome IS NULL THEN RAISE EXCEPTION 'Invalid attendance outcome' USING ERRCODE='22023'; END IF;
 IF p_outcome='no_show' AND (details->>'attendance_deadline')::timestamptz>now() THEN RAISE EXCEPTION 'The attendance window has not ended' USING ERRCODE='22023'; END IF;
 IF p_outcome='doctor_unavailable' AND length(btrim(coalesce(p_note,''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Explain why the doctor was unavailable' USING ERRCODE='22023'; END IF;
 UPDATE clinzo.appointment SET status=CASE WHEN p_outcome='no_show' THEN 'no_show' ELSE 'cancelled' END,
   recovery_outcome=CASE WHEN p_outcome='doctor_unavailable' THEN p_outcome END,capacity_released_at=now(),decision_by=actor,decision_reason=nullif(btrim(p_note),'') WHERE id=a.id;
 UPDATE clinzo.queue_entry SET state=CASE WHEN p_outcome='no_show' THEN 'no_show' ELSE 'cancelled' END WHERE appointment_id=a.id;
 UPDATE clinzo.session_queue SET queue_version=queue_version+1 WHERE session_id=s.id;
 PERFORM clinzo.appointment_event(a.id,actor,CASE WHEN p_outcome='no_show' THEN 'no_show' ELSE 'cancel' END);
 RETURN a.id;
END $$;

CREATE FUNCTION public.request_appointment_review(p_appointment_id uuid,p_expected_version bigint,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); a clinzo.appointment; result uuid;
BEGIN
 IF NOT clinzo.can_access_recovery(actor,p_appointment_id) THEN RAISE EXCEPTION 'Appointment access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF a.row_version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Appointment changed; refresh and retry' USING ERRCODE='PT409'; END IF;
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Describe the problem' USING ERRCODE='22023'; END IF;
 IF a.status IN ('completed','in_consultation') OR a.recovery_outcome='rescheduled' THEN RAISE EXCEPTION 'This appointment cannot be reviewed here' USING ERRCODE='22023'; END IF;
 SELECT id INTO result FROM clinzo.appointment_recovery_request WHERE appointment_id=a.id AND kind='review' AND status='pending' AND reason=btrim(p_reason) AND requested_by=actor;
 IF result IS NOT NULL THEN RETURN result; END IF;
 IF EXISTS(SELECT 1 FROM clinzo.appointment_recovery_request WHERE appointment_id=a.id AND status='pending') THEN RAISE EXCEPTION 'A request is already awaiting clinic review' USING ERRCODE='22023'; END IF;
 INSERT INTO clinzo.appointment_recovery_request(appointment_id,kind,reason,requested_by) VALUES(a.id,'review',btrim(p_reason),actor) RETURNING id INTO result;
 UPDATE clinzo.appointment SET updated_at=now() WHERE id=a.id;
 PERFORM clinzo.emit_appointment_change(a.id);
 RETURN result;
END $$;

CREATE FUNCTION public.decide_appointment_recovery(p_request_id uuid,p_expected_version bigint,p_approve boolean,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor(); r clinzo.appointment_recovery_request; a clinzo.appointment; practice uuid; result jsonb;
BEGIN
 SELECT * INTO r FROM clinzo.appointment_recovery_request WHERE id=p_request_id;
 PERFORM d.id FROM clinzo.doctor d JOIN clinzo.session s ON s.doctor_id=d.id JOIN clinzo.appointment booked ON booked.session_id=s.id WHERE booked.id=r.appointment_id FOR UPDATE OF d;
 PERFORM s.id FROM clinzo.session s WHERE s.id IN ((SELECT session_id FROM clinzo.appointment WHERE id=r.appointment_id),(SELECT session_id FROM clinzo.appointment_window WHERE id=r.target_window_id)) ORDER BY s.id FOR UPDATE;
 SELECT * INTO a FROM clinzo.appointment WHERE id=r.appointment_id FOR UPDATE;
 SELECT doctor_facility_id INTO practice FROM clinzo.session WHERE id=a.session_id;
 IF NOT coalesce(clinzo.can_manage_practice(actor,practice),false) THEN RAISE EXCEPTION 'Practice access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM clinzo.appointment_recovery_request WHERE id=p_request_id FOR UPDATE;
 IF r.row_version IS DISTINCT FROM p_expected_version OR r.status<>'pending' THEN RAISE EXCEPTION 'Request changed; refresh and retry' USING ERRCODE='PT409'; END IF;
 IF p_approve IS NULL OR length(btrim(coalesce(p_note,''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Enter a decision note' USING ERRCODE='22023'; END IF;
 IF p_approve AND r.kind='reschedule' THEN
   result:=public.reschedule_appointment(a.id,a.row_version,r.target_window_id,r.reason,r.id);
 END IF;
 UPDATE clinzo.appointment_recovery_request SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,decision_note=btrim(p_note),decided_by=actor,decided_at=now(),row_version=row_version+1,replacement_id=CASE WHEN result->>'kind'='rescheduled' THEN (result->>'id')::uuid END WHERE id=r.id;
 UPDATE clinzo.appointment SET updated_at=now() WHERE id=a.id;
 PERFORM clinzo.emit_appointment_change(a.id);
 RETURN coalesce(result,jsonb_build_object('kind','reviewed','id',r.id));
END $$;

-- Older no-show callers use the same attendance deadline and mode-aware owner.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.transition_clinic_appointment(uuid,bigint,text,text)'::regprocedure);
 definition:=replace(definition,'BEGIN'||chr(10), 'BEGIN'||chr(10)||'  IF p_action=''no_show'' THEN RETURN public.resolve_appointment_attendance(p_appointment_id,p_expected_version,''no_show'',p_note); END IF;'||chr(10));
 EXECUTE definition;
END $$;

-- Join/start enforce the configured window too; an active consultation can still
-- be rejoined and signed after its booked end, rather than being abandoned.
DO $$ DECLARE definition text; function_key regprocedure; BEGIN
 FOR function_key IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('get_online_join_context','start_online_appointment') LOOP
   definition:=pg_get_functiondef(function_key);
   IF position('now()>ends_at+interval ''1 hour''' in definition)=0 THEN RAISE EXCEPTION 'Unexpected online attendance owner: %',function_key; END IF;
   definition:=replace(definition,'now()>ends_at+interval ''1 hour''',
     '(a.status=''confirmed'' AND now()>(clinzo.appointment_recovery_details(a.id)->>''attendance_deadline'')::timestamptz)');
   EXECUTE definition;
 END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.set_appointment_recovery_policy(uuid,bigint,integer,integer,integer),public.list_appointment_reschedule_options(uuid),public.reschedule_appointment(uuid,bigint,uuid,text,uuid),public.resolve_appointment_attendance(uuid,bigint,text,text),public.request_appointment_review(uuid,bigint,text),public.decide_appointment_recovery(uuid,bigint,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_appointment_recovery_policy(uuid,bigint,integer,integer,integer),public.list_appointment_reschedule_options(uuid),public.reschedule_appointment(uuid,bigint,uuid,text,uuid),public.resolve_appointment_attendance(uuid,bigint,text,text),public.request_appointment_review(uuid,bigint,text),public.decide_appointment_recovery(uuid,bigint,boolean,text) TO authenticated;
