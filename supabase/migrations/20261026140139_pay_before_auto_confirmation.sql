-- Keep pending reservations inside the existing capacity and expiry owner.
ALTER TABLE clinzo.appointment
  ADD COLUMN confirmation_payment_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN booking_payment_method text NOT NULL DEFAULT 'online'
    CHECK (booking_payment_method IN ('online','reception'));

CREATE FUNCTION clinzo.booking_auto_accepts(session_key uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE s clinzo.session; prefs clinzo.doctor_schedule_preferences; used integer; quota integer;
BEGIN
 SELECT * INTO s FROM clinzo.session WHERE id=session_key;
 SELECT * INTO prefs FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=s.doctor_facility_id;
 IF NOT coalesce(prefs.auto_accept,coalesce(s.auto_confirm_limit,0)>0) THEN RETURN false; END IF;
 quota:=coalesce(prefs.auto_accept_limit,s.auto_confirm_limit,0);
 SELECT count(*) INTO used FROM clinzo.appointment a JOIN clinzo.session other ON other.id=a.session_id
 WHERE (CASE WHEN prefs.doctor_facility_id IS NULL THEN other.id=s.id ELSE other.booking_day_id=s.booking_day_id END)
 AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL AND
   (prefs.doctor_facility_id IS NULL OR EXISTS(SELECT 1 FROM clinzo.domain_event e WHERE e.aggregate_id=a.id AND e.event_type='appointment.auto_confirmed')))
   OR (a.confirmation_payment_pending AND a.status='pending' AND a.request_expires_at>now()));
 RETURN used<quota;
END $$;
REVOKE ALL ON FUNCTION clinzo.booking_auto_accepts(uuid) FROM PUBLIC,anon,authenticated;

-- One canonical booking implementation. Existing callers retain their UUID API.
DO $$
DECLARE definition text; marker text:='IF shared_accept AND shared_count<shared_limit THEN';
BEGIN
 definition:=pg_get_functiondef('public.book_clinic_appointment(uuid,uuid,uuid,text,uuid)'::regprocedure);
 IF position(marker in definition)=0 THEN RAISE EXCEPTION 'Unexpected booking decision owner'; END IF;
 definition:=replace(definition,'CREATE OR REPLACE FUNCTION public.book_clinic_appointment(',
   'CREATE OR REPLACE FUNCTION clinzo.create_patient_booking(');
 definition:=replace(definition,'p_idempotency_key uuid)','p_idempotency_key uuid, p_payment_method text)');
 definition:=replace(definition,'IF p_patient_id IS NULL',
   'IF p_payment_method IS NULL OR p_payment_method NOT IN (''online'',''reception'') THEN RAISE EXCEPTION ''Choose a valid payment option'' USING ERRCODE=''22023''; END IF;
  IF p_patient_id IS NULL');
 definition:=replace(definition,'IF s.id IS NULL',
   'IF p_payment_method=''reception'' AND coalesce(ps.code,'''') NOT LIKE ''clinic-%'' THEN RAISE EXCEPTION ''Reception payment is only available for clinic visits'' USING ERRCODE=''22023''; END IF;
  IF s.id IS NULL');
 definition:=replace(definition,marker,
   'UPDATE clinzo.appointment SET booking_payment_method=p_payment_method WHERE id=a_id;
  IF clinzo.booking_auto_accepts(s.id) THEN
    IF p_payment_method=''online'' AND ps.currency=''INR'' AND ps.fee_minor>0
      AND EXISTS(SELECT 1 FROM clinzo.appointment_billing_config WHERE singleton AND enabled) THEN
      IF ps.fee_minor<100 THEN RAISE EXCEPTION ''Online consultation fees must be at least INR 1'' USING ERRCODE=''22023''; END IF;
      UPDATE clinzo.appointment SET confirmation_payment_pending=true,
        request_expires_at=least(w.ends_at,now()+interval ''10 minutes'') WHERE id=a_id;
      PERFORM clinzo.appointment_event(a_id,actor,''payment_reserved'');
      RETURN a_id;
    END IF;');
 EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION clinzo.create_patient_booking(uuid,uuid,uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.book_clinic_appointment(p_patient_id uuid,p_window_id uuid,p_practice_service_id uuid,p_reason text,p_idempotency_key uuid) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT clinzo.create_patient_booking(p_patient_id,p_window_id,p_practice_service_id,p_reason,p_idempotency_key,'online');
$$;

CREATE FUNCTION public.get_appointment_booking_options(p_window_id uuid,p_practice_service_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); s clinzo.session; ps clinzo.practice_service; cfg clinzo.appointment_billing_config; automatic boolean;
BEGIN
 SELECT s0.* INTO s FROM clinzo.session s0 JOIN clinzo.appointment_window w ON w.session_id=s0.id
 WHERE w.id=p_window_id AND w.state='open' AND w.starts_at>now() AND s0.state IN ('published','open');
 SELECT ps0.* INTO ps FROM clinzo.practice_service ps0 JOIN clinzo.session_service ss ON ss.practice_service_id=ps0.id
 WHERE ps0.id=p_practice_service_id AND ss.session_id=s.id AND ps0.active;
 IF s.id IS NULL OR ps.id IS NULL THEN RAISE EXCEPTION 'Slot no longer available' USING ERRCODE='22023'; END IF;
 SELECT * INTO cfg FROM clinzo.appointment_billing_config WHERE singleton;
 automatic:=clinzo.booking_auto_accepts(s.id);
 RETURN jsonb_build_object('auto_accept',automatic,'requires_payment',automatic AND cfg.enabled AND ps.currency='INR' AND ps.fee_minor>0,
   'can_pay_reception',ps.code LIKE 'clinic-%','policy_version',cfg.policy_version,
   'policy_text',format('Paid credit follows an eligible rescheduled booking. Cancellation refunds require clinic review. The deduction is %s%%; doctor unavailability has no deduction. Refunds return to the original payment method.',cfg.deduction_bps::numeric/100),
   'hold_minutes',10,'mode',cfg.mode);
END $$;

CREATE FUNCTION public.prepare_appointment_booking(p_patient_id uuid,p_window_id uuid,p_practice_service_id uuid,p_reason text,p_idempotency_key uuid,p_payment_method text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid; a clinzo.appointment;
BEGIN
 result:=clinzo.create_patient_booking(p_patient_id,p_window_id,p_practice_service_id,p_reason,p_idempotency_key,p_payment_method);
 SELECT * INTO a FROM clinzo.appointment WHERE id=result;
 IF a.confirmation_payment_pending AND (a.status<>'pending' OR a.request_expires_at<=now()) THEN
   RAISE EXCEPTION 'Reservation expired. Refresh the available times.' USING ERRCODE='PT409'; END IF;
 RETURN jsonb_build_object('appointment_id',a.id,'status',a.status,'requires_payment',a.confirmation_payment_pending AND a.status='pending',
   'reservation_expires_at',CASE WHEN a.confirmation_payment_pending THEN a.request_expires_at END);
END $$;

CREATE FUNCTION public.release_appointment_booking(p_appointment_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); a clinzo.appointment;
BEGIN
 PERFORM clinzo.lock_appointment_billing(p_appointment_id);
 SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) THEN
   RAISE EXCEPTION 'Patient access required' USING ERRCODE='42501'; END IF;
 IF NOT a.confirmation_payment_pending OR a.status<>'pending' THEN RETURN; END IF;
 UPDATE clinzo.appointment SET status='rejected',decision_reason='Payment reservation cancelled' WHERE id=a.id;
 PERFORM clinzo.appointment_event(a.id,actor,'payment_cancelled');
END $$;
REVOKE ALL ON FUNCTION public.get_appointment_booking_options(uuid,uuid),public.prepare_appointment_booking(uuid,uuid,uuid,text,uuid,text),public.release_appointment_booking(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_appointment_booking_options(uuid,uuid),public.prepare_appointment_booking(uuid,uuid,uuid,text,uuid,text),public.release_appointment_booking(uuid) TO authenticated;

-- A capture is recorded even if it arrives after expiry/cancellation. In that
-- case it remains refundable credit, never a second booking of a released slot.
CREATE FUNCTION clinzo.confirm_paid_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c clinzo.appointment_charge; a clinzo.appointment; s clinzo.session; w clinzo.appointment_window; q clinzo.session_queue; paid bigint;
BEGIN
 IF NEW.status<>'captured' THEN RETURN NEW; END IF;
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=NEW.charge_id;
 SELECT * INTO a FROM clinzo.appointment WHERE id=c.appointment_id;
 IF NOT coalesce(a.confirmation_payment_pending,false) THEN RETURN NEW; END IF;
 SELECT * INTO s FROM clinzo.session WHERE id=a.session_id FOR UPDATE;
 SELECT * INTO w FROM clinzo.appointment_window WHERE id=a.window_id FOR UPDATE;
 PERFORM 1 FROM clinzo.doctor_booking_day WHERE id=s.booking_day_id FOR UPDATE;
 SELECT * INTO a FROM clinzo.appointment WHERE id=c.appointment_id FOR UPDATE;
 IF a.status<>'pending' THEN RETURN NEW; END IF;
 IF a.request_expires_at<=now() OR s.state NOT IN ('published','open') OR w.state<>'open' THEN
   UPDATE clinzo.appointment SET status='rejected',decision_reason='Payment reservation expired' WHERE id=a.id;
   PERFORM clinzo.appointment_event(a.id,NULL,'expired');
   RETURN NEW;
 END IF;
 SELECT coalesce(sum(amount_minor-refunded_minor),0) INTO paid FROM clinzo.appointment_payment_attempt WHERE charge_id=c.id AND status='captured';
 IF paid<c.amount_minor THEN RETURN NEW; END IF;
 UPDATE clinzo.appointment SET status='confirmed',confirmed_at=now(),confirmation_payment_pending=false WHERE id=a.id;
 INSERT INTO clinzo.session_queue(session_id) VALUES(s.id) ON CONFLICT(session_id) DO NOTHING;
 SELECT * INTO q FROM clinzo.session_queue WHERE session_id=s.id FOR UPDATE;
 INSERT INTO clinzo.queue_entry(queue_id,appointment_id,ticket_number,state,order_key)
 VALUES(q.id,a.id,q.next_ticket,'awaiting_arrival',extract(epoch FROM w.starts_at)::bigint);
 UPDATE clinzo.session_queue SET next_ticket=next_ticket+1,queue_version=queue_version+1 WHERE id=q.id;
 PERFORM clinzo.appointment_event(a.id,NULL,'auto_confirmed');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.confirm_paid_booking() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER confirm_paid_booking AFTER INSERT OR UPDATE OF status ON clinzo.appointment_payment_attempt
FOR EACH ROW EXECUTE FUNCTION clinzo.confirm_paid_booking();

CREATE FUNCTION clinzo.guard_payment_confirmation() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE paid bigint;
BEGIN
 IF OLD.confirmation_payment_pending AND OLD.status='pending' AND NEW.status IN ('confirmed','in_consultation') THEN
   SELECT coalesce(sum(p.amount_minor-p.refunded_minor),0) INTO paid FROM clinzo.appointment_payment_attempt p
   WHERE p.charge_id=clinzo.appointment_charge_id(OLD.id) AND p.status='captured';
   IF paid<OLD.fee_minor OR OLD.request_expires_at<=now() THEN
     RAISE EXCEPTION 'Awaiting patient payment; this reservation cannot be approved manually' USING ERRCODE='22023'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.guard_payment_confirmation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_payment_confirmation BEFORE UPDATE OF status ON clinzo.appointment
FOR EACH ROW EXECUTE FUNCTION clinzo.guard_payment_confirmation();

-- Extend the existing billing and list projections; no duplicated payment owner.
DO $$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('public.prepare_appointment_payment(uuid,text)'::regprocedure);
 IF position('a.status<>''confirmed''' in definition)=0 THEN RAISE EXCEPTION 'Unexpected checkout owner'; END IF;
 definition:=replace(definition,'a.status<>''confirmed''',
   '(a.status<>''confirmed'' AND NOT(a.status=''pending'' AND a.confirmation_payment_pending AND a.request_expires_at>now()))');
 definition:=replace(definition,'(SELECT ends_at FROM clinzo.appointment_window WHERE id=a.window_id)',
   '(CASE WHEN a.confirmation_payment_pending THEN a.request_expires_at ELSE (SELECT ends_at FROM clinzo.appointment_window WHERE id=a.window_id) END)');
 EXECUTE definition;
 definition:=pg_get_functiondef('clinzo.appointment_billing_details(uuid,uuid)'::regprocedure);
 IF position('AND a.status=''confirmed''' in definition)=0 THEN RAISE EXCEPTION 'Unexpected billing projection'; END IF;
 definition:=replace(definition,'AND a.status=''confirmed''',
   'AND (a.status=''confirmed'' OR (a.status=''pending'' AND a.confirmation_payment_pending AND a.request_expires_at>now()))');
 definition:=replace(definition,'deduction:=CASE WHEN a.recovery_outcome',
   'deduction:=CASE WHEN a.confirmation_payment_pending THEN 0 WHEN a.recovery_outcome');
 EXECUTE definition;
 definition:=pg_get_functiondef('public.list_care_appointments(uuid)'::regprocedure);
 definition:=replace(definition,'items.value || jsonb_build_object(',
   'items.value || jsonb_build_object(''confirmation_payment_pending'',a.confirmation_payment_pending,''booking_payment_method'',a.booking_payment_method) || jsonb_build_object(');
 EXECUTE definition;
END $$;
