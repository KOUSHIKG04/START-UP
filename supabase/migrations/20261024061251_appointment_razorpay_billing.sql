-- Appointment billing is separate from ambulance billing. New checkout is disabled
-- until the owner configures the provider and explicitly enables this singleton.
CREATE TABLE clinzo.appointment_billing_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test','live')),
  activated_at timestamptz NOT NULL DEFAULT now(),
  policy_version text NOT NULL DEFAULT 'consultation-zero-deduction-v1',
  deduction_bps integer NOT NULL DEFAULT 0 CHECK (deduction_bps BETWEEN 0 AND 10000)
);
INSERT INTO clinzo.appointment_billing_config(singleton) VALUES(true);

CREATE FUNCTION clinzo.activate_appointment_billing() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.enabled AND NOT OLD.enabled THEN NEW.activated_at:=clock_timestamp(); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER activate_appointment_billing BEFORE UPDATE OF enabled ON clinzo.appointment_billing_config FOR EACH ROW EXECUTE FUNCTION clinzo.activate_appointment_billing();

CREATE TABLE clinzo.appointment_charge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root_appointment_id uuid NOT NULL UNIQUE REFERENCES clinzo.appointment(id),
  appointment_id uuid NOT NULL UNIQUE REFERENCES clinzo.appointment(id),
  amount_minor bigint NOT NULL CHECK (amount_minor BETWEEN 0 AND 9000000000000),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency='INR'),
  mode text NOT NULL CHECK (mode IN ('test','live')),
  policy_version text NOT NULL,
  deduction_bps integer NOT NULL CHECK (deduction_bps BETWEEN 0 AND 10000),
  deduction_minor bigint NOT NULL DEFAULT 0 CHECK (deduction_minor>=0),
  accepted_by uuid NOT NULL REFERENCES clinzo.identity(id),
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinzo.appointment_payment_attempt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid NOT NULL REFERENCES clinzo.appointment_charge(id),
  method text NOT NULL DEFAULT 'gateway' CHECK (method IN ('gateway','cash')),
  amount_minor bigint NOT NULL CHECK (amount_minor BETWEEN 100 AND 9000000000000),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency='INR'),
  order_id text UNIQUE,
  payment_id text UNIQUE,
  status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','created','authorized','captured','failed','uncertain')),
  refunded_minor bigint NOT NULL DEFAULT 0 CHECK (refunded_minor BETWEEN 0 AND amount_minor),
  lease_token uuid,
  claimed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX appointment_payment_active_uq ON clinzo.appointment_payment_attempt(charge_id)
  WHERE status IN ('creating','created','authorized','uncertain');
CREATE INDEX appointment_payment_charge_idx ON clinzo.appointment_payment_attempt(charge_id);

CREATE TABLE clinzo.appointment_refund_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid NOT NULL REFERENCES clinzo.appointment_charge(id),
  kind text NOT NULL CHECK (kind IN ('cancel','surplus')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','processing','refunded','rejected')),
  amount_minor bigint NOT NULL CHECK (amount_minor>0),
  deduction_minor bigint NOT NULL CHECK (deduction_minor>=0),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 2 AND 1000),
  requested_by uuid NOT NULL REFERENCES clinzo.identity(id),
  decided_by uuid REFERENCES clinzo.identity(id),
  decision_note text,
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointment_refund_charge_idx ON clinzo.appointment_refund_request(charge_id);
CREATE UNIQUE INDEX appointment_refund_open_uq ON clinzo.appointment_refund_request(charge_id)
  WHERE status IN ('requested','approved','processing');
CREATE TABLE clinzo.appointment_refund_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id uuid NOT NULL REFERENCES clinzo.appointment_refund_request(id),
  attempt_id uuid NOT NULL REFERENCES clinzo.appointment_payment_attempt(id),
  amount_minor bigint NOT NULL CHECK (amount_minor>0),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','working','pending','processed','failed','uncertain')),
  provider_refund_id text UNIQUE,
  lease_token uuid,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(refund_id,attempt_id)
);
CREATE INDEX appointment_refund_job_attempt_idx ON clinzo.appointment_refund_job(attempt_id);
CREATE TABLE clinzo.appointment_payment_event (
  event_id text PRIMARY KEY,
  digest text NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clinzo.appointment_billing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinzo.appointment_charge ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinzo.appointment_payment_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinzo.appointment_refund_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinzo.appointment_refund_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinzo.appointment_payment_event ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.appointment_billing_config,clinzo.appointment_charge,clinzo.appointment_payment_attempt,
  clinzo.appointment_refund_request,clinzo.appointment_refund_job,clinzo.appointment_payment_event FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.appointment_charge_id(appointment_key uuid) RETURNS uuid
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH RECURSIVE chain AS (
   SELECT id,replaces_appointment_id FROM clinzo.appointment WHERE id=appointment_key
   UNION ALL SELECT a.id,a.replaces_appointment_id FROM clinzo.appointment a JOIN chain c ON a.id=c.replaces_appointment_id
 ) SELECT c.id FROM clinzo.appointment_charge c JOIN chain a ON a.id=c.root_appointment_id LIMIT 1;
$$;

CREATE FUNCTION clinzo.lock_appointment_billing(appointment_key uuid) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 -- Same first lock as booking and rescheduling. Provider HTTP calls never run
 -- while this transaction is held.
 PERFORM d.id FROM clinzo.doctor d JOIN clinzo.session s ON s.doctor_id=d.id
 JOIN clinzo.appointment a ON a.session_id=s.id WHERE a.id=appointment_key FOR UPDATE OF d;
END $$;

CREATE FUNCTION clinzo.can_manage_appointment_money(actor uuid,appointment_key uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(clinzo.can_manage_practice(actor,s.doctor_facility_id),false)
   AND coalesce(clinzo.can_edit_practice_schedule(actor,s.doctor_facility_id),false)
 FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id WHERE a.id=appointment_key;
$$;

CREATE FUNCTION clinzo.appointment_billing_details(appointment_key uuid,actor uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE a clinzo.appointment; c clinzo.appointment_charge; cfg clinzo.appointment_billing_config;
 captured bigint:=0; refunded bigint:=0; reserved bigint:=0; balance bigint:=0; deduction bigint:=0; surplus bigint:=0; blocked boolean;
 patient_access boolean; manager boolean; can_refund boolean;
BEGIN
 SELECT * INTO a FROM clinzo.appointment WHERE id=appointment_key;
 SELECT * INTO cfg FROM clinzo.appointment_billing_config WHERE singleton;
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=clinzo.appointment_charge_id(appointment_key);
 IF c.id IS NOT NULL THEN
   SELECT coalesce(sum(amount_minor) FILTER(WHERE status='captured'),0),coalesce(sum(refunded_minor),0)
     INTO captured,refunded FROM clinzo.appointment_payment_attempt WHERE charge_id=c.id;
   SELECT coalesce(sum(r.amount_minor+CASE WHEN r.status='requested' THEN r.deduction_minor ELSE 0 END
     -coalesce((SELECT sum(j.amount_minor) FROM clinzo.appointment_refund_job j WHERE j.refund_id=r.id AND j.status='processed'),0)),0)
     INTO reserved FROM clinzo.appointment_refund_request r WHERE r.charge_id=c.id AND r.status IN ('requested','approved','processing');
 END IF;
 balance:=greatest(0,captured-refunded-reserved-coalesce(c.deduction_minor,0));
 surplus:=greatest(0,balance-coalesce(c.amount_minor,a.fee_minor));
 SELECT EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) INTO patient_access;
 manager:=coalesce(clinzo.can_manage_appointment_money(actor,appointment_key),false);
 blocked:=EXISTS(SELECT 1 FROM clinzo.appointment_refund_request WHERE charge_id=c.id AND status IN ('requested','approved','processing'));
 can_refund:=patient_access AND c.appointment_id=a.id AND NOT blocked AND balance>0 AND (surplus>0 OR a.status NOT IN ('in_consultation','completed'));
 deduction:=CASE WHEN a.recovery_outcome='doctor_unavailable'
   OR (a.status='cancelled' AND NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=a.decision_by AND pa.verified_at IS NOT NULL))
   THEN 0 ELSE (balance*coalesce(c.deduction_bps,0))/10000 END;
 RETURN jsonb_build_object('enabled',cfg.enabled AND a.currency='INR','mode',coalesce(c.mode,cfg.mode),
   'policy_version',coalesce(c.policy_version,cfg.policy_version),
   'policy_text',format('Paid credit follows a rescheduled booking. Higher fees require an additional payment; unused credit can be refunded. Cancellation refunds require clinic review. The accepted deduction is %s%%; doctor unavailability has no deduction. Refunds return to the original payment method.',coalesce(c.deduction_bps,cfg.deduction_bps)::numeric/100),
   'currency','INR','appointment_id',coalesce(c.appointment_id,a.id),'charge_id',c.id,'amount_minor',coalesce(c.amount_minor,a.fee_minor),
   'captured_minor',captured,'refunded_minor',refunded,'reserved_minor',reserved,'deduction_minor',coalesce(c.deduction_minor,0),
   'due_minor',greatest(0,coalesce(c.amount_minor,a.fee_minor)-balance),'credit_minor',balance,'surplus_minor',surplus,
   'refund_amount_minor',greatest(0,balance-deduction),'refund_deduction_minor',deduction,
   'can_manage',manager,'can_refund',can_refund,
   'can_pay',cfg.enabled AND a.currency='INR' AND patient_access AND NOT blocked AND coalesce(c.appointment_id,a.id)=a.id AND a.status='confirmed'
     AND greatest(0,coalesce(c.amount_minor,a.fee_minor)-balance)>=100
     AND EXISTS(SELECT 1 FROM clinzo.appointment_window w WHERE w.id=a.window_id AND w.ends_at>now()),
   'attempts',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'method',p.method,'amount_minor',p.amount_minor,'status',p.status,'order_id',p.order_id,'payment_id',p.payment_id) ORDER BY p.created_at) FROM clinzo.appointment_payment_attempt p WHERE p.charge_id=c.id),'[]'::jsonb),
   'refunds',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,'status',r.status,'amount_minor',r.amount_minor,'deduction_minor',r.deduction_minor,'reason',r.reason,'decision_note',r.decision_note,'row_version',r.row_version::text,
     'cash_pending',EXISTS(SELECT 1 FROM clinzo.appointment_refund_job j JOIN clinzo.appointment_payment_attempt cash_attempt ON cash_attempt.id=j.attempt_id WHERE j.refund_id=r.id AND cash_attempt.method='cash' AND j.status='ready'),
     'references',coalesce((SELECT jsonb_agg(j.provider_refund_id) FROM clinzo.appointment_refund_job j WHERE j.refund_id=r.id AND j.provider_refund_id IS NOT NULL),'[]'::jsonb)) ORDER BY r.created_at) FROM clinzo.appointment_refund_request r WHERE r.charge_id=c.id),'[]'::jsonb));
END $$;

CREATE FUNCTION public.get_appointment_billing(p_appointment_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity();
BEGIN
 IF NOT coalesce(clinzo.can_access_recovery(actor,p_appointment_id),false) THEN RAISE EXCEPTION 'Appointment access required' USING ERRCODE='42501'; END IF;
 RETURN clinzo.appointment_billing_details(p_appointment_id,actor);
END $$;

CREATE FUNCTION public.prepare_appointment_payment(p_appointment_id uuid,p_policy_version text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); a clinzo.appointment; c clinzo.appointment_charge; cfg clinzo.appointment_billing_config;
 details jsonb; attempt clinzo.appointment_payment_attempt;
BEGIN
 IF NOT coalesce(clinzo.can_access_recovery(actor,p_appointment_id),false) THEN RAISE EXCEPTION 'Appointment access required' USING ERRCODE='42501'; END IF;
 PERFORM clinzo.lock_appointment_billing(p_appointment_id);
 SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
 SELECT * INTO cfg FROM clinzo.appointment_billing_config WHERE singleton;
 IF NOT cfg.enabled THEN RAISE EXCEPTION 'Online payments are not available' USING ERRCODE='22023'; END IF;
 IF a.status<>'confirmed' OR a.currency<>'INR' OR a.fee_minor<100 OR NOT EXISTS(SELECT 1 FROM clinzo.appointment_window w WHERE w.id=a.window_id AND w.ends_at>now()) THEN RAISE EXCEPTION 'This appointment is not payable' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) THEN RAISE EXCEPTION 'Patient access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=clinzo.appointment_charge_id(a.id) FOR UPDATE;
 IF p_policy_version IS DISTINCT FROM coalesce(c.policy_version,cfg.policy_version) THEN RAISE EXCEPTION 'Payment policy changed. Review the latest terms.' USING ERRCODE='PT409'; END IF;
 IF c.id IS NULL THEN
   INSERT INTO clinzo.appointment_charge(root_appointment_id,appointment_id,amount_minor,currency,mode,policy_version,deduction_bps,accepted_by)
   VALUES(a.id,a.id,a.fee_minor,a.currency,cfg.mode,cfg.policy_version,cfg.deduction_bps,actor) RETURNING * INTO c;
 END IF;
 IF c.appointment_id<>a.id OR c.mode<>cfg.mode OR EXISTS(SELECT 1 FROM clinzo.appointment_refund_request WHERE charge_id=c.id AND kind='cancel' AND status<>'rejected') THEN RAISE EXCEPTION 'This booking has moved or is being refunded' USING ERRCODE='22023'; END IF;
 details:=clinzo.appointment_billing_details(a.id,actor);
 IF (details->>'reserved_minor')::bigint>0 OR (details->>'due_minor')::bigint<100 THEN RAISE EXCEPTION 'No payable balance or a refund is in progress' USING ERRCODE='22023'; END IF;
 SELECT * INTO attempt FROM clinzo.appointment_payment_attempt WHERE charge_id=c.id AND status IN ('creating','created','authorized','uncertain') FOR UPDATE;
 IF attempt.id IS NULL THEN
   INSERT INTO clinzo.appointment_payment_attempt(charge_id,amount_minor,expires_at) VALUES(c.id,(details->>'due_minor')::bigint,(SELECT ends_at FROM clinzo.appointment_window WHERE id=a.window_id)) RETURNING * INTO attempt;
 END IF;
 RETURN to_jsonb(attempt)||jsonb_build_object('mode',c.mode);
END $$;

CREATE FUNCTION public.request_appointment_refund(p_appointment_id uuid,p_kind text,p_reason text,p_expected_amount bigint,p_expected_deduction bigint) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); c clinzo.appointment_charge; details jsonb; amount bigint; deduction bigint; result uuid;
BEGIN
 IF NOT coalesce(clinzo.can_access_recovery(actor,p_appointment_id),false) THEN RAISE EXCEPTION 'Appointment access required' USING ERRCODE='42501'; END IF;
 PERFORM clinzo.lock_appointment_billing(p_appointment_id);
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=clinzo.appointment_charge_id(p_appointment_id) FOR UPDATE;
 details:=clinzo.appointment_billing_details(p_appointment_id,actor);
 IF NOT (details->>'can_refund')::boolean OR p_kind NOT IN ('cancel','surplus') OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'A refund cannot be requested now' USING ERRCODE='22023'; END IF;
 IF p_kind='cancel' AND EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=p_appointment_id AND status IN ('in_consultation','completed')) THEN RAISE EXCEPTION 'A consultation already started. Only unused credit is refundable here.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM clinzo.appointment_payment_attempt WHERE charge_id=c.id AND status IN ('creating','created','authorized','uncertain')) THEN RAISE EXCEPTION 'Refresh the pending payment before requesting a refund' USING ERRCODE='22023'; END IF;
 amount:=CASE WHEN p_kind='surplus' THEN (details->>'surplus_minor')::bigint ELSE (details->>'refund_amount_minor')::bigint END;
 deduction:=CASE WHEN p_kind='surplus' THEN 0 ELSE (details->>'refund_deduction_minor')::bigint END;
 IF amount<=0 OR amount IS DISTINCT FROM p_expected_amount OR deduction IS DISTINCT FROM p_expected_deduction THEN RAISE EXCEPTION 'Refund amount changed. Review the latest calculation.' USING ERRCODE='PT409'; END IF;
 INSERT INTO clinzo.appointment_refund_request(charge_id,kind,amount_minor,deduction_minor,reason,requested_by)
 VALUES(c.id,p_kind,amount,deduction,btrim(p_reason),actor) RETURNING id INTO result;
 PERFORM clinzo.emit_appointment_change(c.appointment_id);
 RETURN result;
END $$;

CREATE FUNCTION public.decide_appointment_refund(p_refund_id uuid,p_expected_version bigint,p_approve boolean,p_note text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); c clinzo.appointment_charge; r clinzo.appointment_refund_request; a clinzo.appointment;
 p clinzo.appointment_payment_attempt; remaining bigint; available bigint; part bigint;
BEGIN
 SELECT c0.* INTO c FROM clinzo.appointment_charge c0 JOIN clinzo.appointment_refund_request r0 ON r0.charge_id=c0.id WHERE r0.id=p_refund_id;
 IF NOT coalesce(clinzo.can_manage_appointment_money(actor,c.appointment_id),false) THEN RAISE EXCEPTION 'Financial approval access required' USING ERRCODE='42501'; END IF;
 PERFORM clinzo.lock_appointment_billing(c.appointment_id);
 SELECT * INTO a FROM clinzo.appointment WHERE id=c.appointment_id FOR UPDATE;
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=c.id FOR UPDATE;
 SELECT * INTO r FROM clinzo.appointment_refund_request WHERE id=p_refund_id FOR UPDATE;
 IF r.status<>'requested' OR r.row_version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Refund request changed' USING ERRCODE='PT409'; END IF;
 IF p_approve IS NULL OR length(btrim(coalesce(p_note,''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Enter a decision note' USING ERRCODE='22023'; END IF;
 IF p_approve THEN
   IF r.kind='cancel' AND a.status IN ('completed','in_consultation') THEN RAISE EXCEPTION 'Review completed care before any financial action' USING ERRCODE='22023'; END IF;
   IF (a.recovery_outcome='doctor_unavailable'
     OR (a.status='cancelled' AND NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id AND pa.identity_id=a.decision_by AND pa.verified_at IS NOT NULL)))
     AND r.deduction_minor<>0 THEN RAISE EXCEPTION 'Clinic cancellation requires a refund without deduction. Decline this request and request the corrected amount.' USING ERRCODE='22023'; END IF;
   remaining:=r.amount_minor;
   FOR p IN SELECT * FROM clinzo.appointment_payment_attempt WHERE charge_id=c.id AND status='captured' ORDER BY created_at,id FOR UPDATE LOOP
     SELECT p.amount_minor-p.refunded_minor-coalesce(sum(j.amount_minor) FILTER(WHERE j.status<>'processed'),0) INTO available FROM clinzo.appointment_refund_job j WHERE j.attempt_id=p.id;
     part:=least(remaining,greatest(0,available));
     IF part>0 THEN INSERT INTO clinzo.appointment_refund_job(refund_id,attempt_id,amount_minor) VALUES(r.id,p.id,part); remaining:=remaining-part; END IF;
     EXIT WHEN remaining=0;
   END LOOP;
   IF remaining<>0 THEN RAISE EXCEPTION 'Captured balance changed. Reconcile the payment before approval.' USING ERRCODE='PT409'; END IF;
   IF r.kind='cancel' AND a.status='confirmed' THEN
     PERFORM public.transition_clinic_appointment(a.id,a.row_version,'cancel','Refund approved');
   END IF;
   UPDATE clinzo.appointment_charge SET deduction_minor=deduction_minor+r.deduction_minor WHERE id=c.id;
 END IF;
 UPDATE clinzo.appointment_refund_request SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
   decision_note=btrim(p_note),decided_by=actor,row_version=row_version+1 WHERE id=r.id;
 INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
 VALUES(actor,'identity','appointment.refund_decided','appointment_refund_request',r.id,gen_random_uuid(),'allowed',jsonb_build_object('approved',p_approve,'amount_minor',r.amount_minor,'deduction_minor',r.deduction_minor));
 PERFORM clinzo.emit_appointment_change(c.appointment_id);
 RETURN r.id;
END $$;

-- Single trusted provider boundary. Only the server service role can call it.
CREATE FUNCTION public.appointment_provider_command(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c clinzo.appointment_charge; p clinzo.appointment_payment_attempt; r clinzo.appointment_refund_request;
 j clinzo.appointment_refund_job; entity jsonb:=p_data->'entity'; token uuid; event_digest text; result jsonb;
BEGIN
 IF p_action='work_queue' THEN
   SELECT coalesce(jsonb_agg(work.appointment_id),'[]'::jsonb) INTO result FROM (
     SELECT c0.appointment_id FROM clinzo.appointment_charge c0 WHERE c0.mode=p_data->>'mode'
       AND (EXISTS(SELECT 1 FROM clinzo.appointment_payment_attempt p0 WHERE p0.charge_id=c0.id AND p0.method='gateway' AND p0.status NOT IN ('captured','failed'))
         OR EXISTS(SELECT 1 FROM clinzo.appointment_refund_job j0 JOIN clinzo.appointment_payment_attempt p0 ON p0.id=j0.attempt_id WHERE p0.charge_id=c0.id AND p0.method='gateway' AND j0.status<>'processed'))
     ORDER BY c0.last_checked_at,c0.created_at LIMIT 10
   ) work;
   UPDATE clinzo.appointment_charge SET last_checked_at=clock_timestamp() WHERE appointment_id IN (SELECT value::uuid FROM jsonb_array_elements_text(result));
   RETURN result;
 END IF;
 IF p_action='work' THEN
   SELECT * INTO c FROM clinzo.appointment_charge WHERE id=clinzo.appointment_charge_id((p_data->>'appointment_id')::uuid);
   RETURN jsonb_build_object('mode',c.mode,'attempts',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM clinzo.appointment_payment_attempt x WHERE x.charge_id=c.id),'[]'::jsonb),
     'jobs',coalesce((SELECT jsonb_agg(to_jsonb(x)||jsonb_build_object('payment_id',a.payment_id,'method',a.method)) FROM clinzo.appointment_refund_job x JOIN clinzo.appointment_payment_attempt a ON a.id=x.attempt_id WHERE a.charge_id=c.id AND x.status<>'processed'),'[]'::jsonb));
 END IF;
 IF p_action IN ('claim_order','order_ready','order_uncertain','expire_order') THEN
   SELECT * INTO p FROM clinzo.appointment_payment_attempt WHERE id=(p_data->>'attempt_id')::uuid;
 ELSIF p_action='payment' THEN
   SELECT * INTO p FROM clinzo.appointment_payment_attempt WHERE order_id=entity->>'order_id';
 ELSE
   SELECT * INTO j FROM clinzo.appointment_refund_job WHERE id=(p_data->>'job_id')::uuid;
   SELECT * INTO p FROM clinzo.appointment_payment_attempt WHERE id=j.attempt_id;
 END IF;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Provider payment is not linked yet' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=p.charge_id;
 PERFORM clinzo.lock_appointment_billing(c.appointment_id);
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=c.id FOR UPDATE;
 SELECT * INTO p FROM clinzo.appointment_payment_attempt WHERE id=p.id FOR UPDATE;
 IF p_data->>'event_id' IS NOT NULL THEN
   INSERT INTO clinzo.appointment_payment_event(event_id,digest,event_type) VALUES(p_data->>'event_id',p_data->>'digest',p_data->>'event_type') ON CONFLICT DO NOTHING;
   IF NOT FOUND THEN
     SELECT digest INTO event_digest FROM clinzo.appointment_payment_event WHERE event_id=p_data->>'event_id';
     IF event_digest IS DISTINCT FROM p_data->>'digest' THEN RAISE EXCEPTION 'Provider event digest mismatch' USING ERRCODE='22023'; END IF;
     RETURN jsonb_build_object('duplicate',true);
   END IF;
 END IF;
 CASE p_action
 WHEN 'claim_order' THEN
   IF p.status NOT IN ('creating','uncertain') OR p.claimed_at IS NOT NULL THEN RETURN NULL; END IF;
   token:=gen_random_uuid();
   UPDATE clinzo.appointment_payment_attempt SET lease_token=token,claimed_at=now() WHERE id=p.id;
   RETURN to_jsonb(p)||jsonb_build_object('lease_token',token,'mode',c.mode);
 WHEN 'order_ready' THEN
   IF entity->>'receipt' IS DISTINCT FROM p.id::text OR (entity->>'amount')::bigint IS DISTINCT FROM p.amount_minor OR entity->>'currency' IS DISTINCT FROM p.currency OR coalesce(entity->>'id','') !~ '^order_[A-Za-z0-9]+$' THEN RAISE EXCEPTION 'Order amount or receipt mismatch' USING ERRCODE='22023'; END IF;
   IF p.order_id IS NOT NULL AND p.order_id IS DISTINCT FROM entity->>'id' THEN RAISE EXCEPTION 'Order already bound' USING ERRCODE='22023'; END IF;
   UPDATE clinzo.appointment_payment_attempt SET order_id=entity->>'id',status=CASE WHEN status IN ('captured','authorized') THEN status ELSE 'created' END WHERE id=p.id;
 WHEN 'order_uncertain' THEN
   UPDATE clinzo.appointment_payment_attempt SET status='uncertain' WHERE id=p.id AND status='creating';
 WHEN 'expire_order' THEN
   IF p.expires_at<=now() AND p.status='created' AND entity->>'id'=p.order_id AND entity->>'status' IN ('created','attempted') THEN
     UPDATE clinzo.appointment_payment_attempt SET status='failed' WHERE id=p.id;
   END IF;
 WHEN 'payment' THEN
   IF coalesce(entity->>'id','') !~ '^pay_[A-Za-z0-9]+$' OR entity->>'currency' IS DISTINCT FROM p.currency OR (entity->>'amount')::bigint IS DISTINCT FROM p.amount_minor OR entity->>'order_id' IS DISTINCT FROM p.order_id THEN RAISE EXCEPTION 'Payment amount or order mismatch' USING ERRCODE='22023'; END IF;
   IF p.status='captured' AND p.payment_id IS DISTINCT FROM entity->>'id' THEN RAISE EXCEPTION 'Order has another captured payment' USING ERRCODE='22023'; END IF;
   IF entity->>'status' IN ('captured','refunded') AND coalesce((entity->>'captured')::boolean,false) THEN
     UPDATE clinzo.appointment_payment_attempt SET status='captured',payment_id=entity->>'id',refunded_minor=greatest(refunded_minor,coalesce((entity->>'amount_refunded')::bigint,0)) WHERE id=p.id;
   ELSIF p.status<>'captured' AND entity->>'status'='authorized' THEN
     UPDATE clinzo.appointment_payment_attempt SET status='authorized',payment_id=entity->>'id' WHERE id=p.id;
   ELSIF p.status='authorized' AND p.payment_id=entity->>'id'
     AND (entity->>'status'='failed' OR (entity->>'status'='refunded' AND NOT coalesce((entity->>'captured')::boolean,false))) THEN
     UPDATE clinzo.appointment_payment_attempt SET status='failed' WHERE id=p.id;
   END IF;
   -- Failed individual checkout attempts do not terminally fail an order: the
   -- same Razorpay order can still be retried and subsequently captured.
 WHEN 'claim_refund' THEN
   SELECT * INTO j FROM clinzo.appointment_refund_job WHERE id=j.id FOR UPDATE;
   IF j.status NOT IN ('ready','failed') OR p.method<>'gateway' THEN RETURN NULL; END IF;
   token:=gen_random_uuid();
   UPDATE clinzo.appointment_refund_job SET status='working',lease_token=token,claimed_at=now() WHERE id=j.id;
   UPDATE clinzo.appointment_refund_request SET status='processing',row_version=row_version+1 WHERE id=j.refund_id AND status='approved';
   RETURN to_jsonb(j)||jsonb_build_object('lease_token',token,'payment_id',p.payment_id,'mode',c.mode);
 WHEN 'refund_uncertain' THEN
   UPDATE clinzo.appointment_refund_job SET status='uncertain' WHERE id=j.id AND status='working';
 WHEN 'refund_result' THEN
   SELECT * INTO j FROM clinzo.appointment_refund_job WHERE id=j.id FOR UPDATE;
   IF entity->>'payment_id' IS DISTINCT FROM p.payment_id OR (entity->>'amount')::bigint IS DISTINCT FROM j.amount_minor OR entity->>'currency' IS DISTINCT FROM p.currency OR entity->>'receipt' IS DISTINCT FROM j.id::text OR coalesce(entity->>'id','') !~ '^rfnd_[A-Za-z0-9]+$' THEN RAISE EXCEPTION 'Refund amount or receipt mismatch' USING ERRCODE='22023'; END IF;
   IF j.status<>'processed' THEN
     UPDATE clinzo.appointment_refund_job SET provider_refund_id=entity->>'id',status=CASE entity->>'status' WHEN 'processed' THEN 'processed' WHEN 'failed' THEN 'failed' ELSE 'pending' END WHERE id=j.id;
   END IF;
   UPDATE clinzo.appointment_payment_attempt SET refunded_minor=greatest(refunded_minor,(SELECT coalesce(sum(amount_minor),0) FROM clinzo.appointment_refund_job WHERE attempt_id=p.id AND status='processed')) WHERE id=p.id;
   IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_refund_job WHERE refund_id=j.refund_id AND status<>'processed') THEN
     UPDATE clinzo.appointment_refund_request SET status='refunded',row_version=row_version+1 WHERE id=j.refund_id AND status<>'refunded';
   END IF;
 ELSE RAISE EXCEPTION 'Unknown provider command' USING ERRCODE='22023';
 END CASE;
 PERFORM clinzo.emit_appointment_change(c.appointment_id);
 RETURN jsonb_build_object('ok',true);
END $$;

CREATE FUNCTION clinzo.carry_appointment_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c clinzo.appointment_charge;
BEGIN
 IF NEW.replaces_appointment_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=clinzo.appointment_charge_id(NEW.replaces_appointment_id) FOR UPDATE;
 IF c.id IS NULL THEN RETURN NEW; END IF;
 IF NEW.currency<>c.currency OR c.appointment_id<>NEW.replaces_appointment_id THEN RAISE EXCEPTION 'Payment cannot transfer to this booking' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM clinzo.appointment_refund_request WHERE charge_id=c.id AND ((kind='cancel' AND status<>'rejected') OR status IN ('requested','approved','processing'))) THEN RAISE EXCEPTION 'Resolve the refund request before rescheduling; refunded bookings need a new booking.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM clinzo.appointment_payment_attempt WHERE charge_id=c.id AND status IN ('creating','created','authorized','uncertain')) THEN RAISE EXCEPTION 'Reconcile the pending payment before rescheduling' USING ERRCODE='22023'; END IF;
 UPDATE clinzo.appointment_charge SET appointment_id=NEW.id,amount_minor=NEW.fee_minor WHERE id=c.id;
 RETURN NEW;
END $$;
CREATE TRIGGER carry_appointment_payment AFTER INSERT ON clinzo.appointment FOR EACH ROW EXECUTE FUNCTION clinzo.carry_appointment_payment();

-- Paid online bookings cannot consume care while a verified top-up is due.
-- Unpaid/clinic pay-at-reception bookings keep the incumbent flow.
CREATE FUNCTION clinzo.require_appointment_payment(appointment_key uuid) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE c clinzo.appointment_charge; details jsonb;
BEGIN
 IF NOT coalesce(clinzo.can_access_recovery(clinzo.require_identity(),appointment_key),false) THEN RAISE EXCEPTION 'Appointment access required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM clinzo.appointment WHERE id=appointment_key AND status IN ('in_consultation','completed')) THEN RETURN; END IF;
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=clinzo.appointment_charge_id(appointment_key);
 IF c.id IS NULL THEN
   IF EXISTS(SELECT 1 FROM clinzo.appointment a JOIN clinzo.appointment_billing_config cfg ON cfg.singleton
     WHERE a.id=appointment_key AND a.visit_mode='online' AND a.currency='INR' AND a.fee_minor>0 AND cfg.enabled AND a.created_at>=cfg.activated_at) THEN
     RAISE EXCEPTION 'Pay the consultation fee before joining' USING ERRCODE='22023';
   END IF;
   RETURN;
 END IF;
 details:=clinzo.appointment_billing_details(appointment_key,NULL);
 IF (details->>'due_minor')::bigint>0 OR (details->>'reserved_minor')::bigint>0 THEN RAISE EXCEPTION 'Payment is pending or a refund is being reviewed' USING ERRCODE='22023'; END IF;
END $$;
DO $$ DECLARE definition text; function_key regprocedure; BEGIN
 FOR function_key IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('get_online_join_context','start_online_appointment') LOOP
   definition:=pg_get_functiondef(function_key);
   definition:=replace(definition,'BEGIN'||chr(10),'BEGIN'||chr(10)||' PERFORM clinzo.require_appointment_payment(p_appointment_id);'||chr(10));
   EXECUTE definition;
 END LOOP;
END $$;

CREATE FUNCTION public.record_appointment_cash(p_appointment_id uuid,p_expected_due bigint,p_note text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); a clinzo.appointment; c clinzo.appointment_charge; cfg clinzo.appointment_billing_config; details jsonb; result uuid;
BEGIN
 IF NOT coalesce(clinzo.can_manage_appointment_money(actor,p_appointment_id),false) THEN RAISE EXCEPTION 'Financial access required' USING ERRCODE='42501'; END IF;
 PERFORM clinzo.lock_appointment_billing(p_appointment_id);
 SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
 SELECT * INTO cfg FROM clinzo.appointment_billing_config WHERE singleton;
 IF NOT cfg.enabled OR a.visit_mode<>'clinic' OR a.status<>'confirmed' OR a.currency<>'INR' OR length(btrim(coalesce(p_note,''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Cash can only be recorded for a confirmed clinic booking' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM clinzo.appointment_charge WHERE id=clinzo.appointment_charge_id(a.id) FOR UPDATE;
 IF c.id IS NULL THEN
   INSERT INTO clinzo.appointment_charge(root_appointment_id,appointment_id,amount_minor,currency,mode,policy_version,deduction_bps,accepted_by)
   VALUES(a.id,a.id,a.fee_minor,a.currency,cfg.mode,cfg.policy_version,cfg.deduction_bps,actor) RETURNING * INTO c;
 END IF;
 IF c.appointment_id<>a.id OR EXISTS(SELECT 1 FROM clinzo.appointment_payment_attempt WHERE charge_id=c.id AND status IN ('creating','created','authorized','uncertain')) THEN RAISE EXCEPTION 'Reconcile the pending online payment before collecting cash' USING ERRCODE='22023'; END IF;
 details:=clinzo.appointment_billing_details(a.id,actor);
 IF (details->>'reserved_minor')::bigint>0 OR p_expected_due IS DISTINCT FROM (details->>'due_minor')::bigint OR p_expected_due<100 THEN RAISE EXCEPTION 'Amount changed. Refresh before recording cash.' USING ERRCODE='PT409'; END IF;
 INSERT INTO clinzo.appointment_payment_attempt(charge_id,method,amount_minor,status) VALUES(c.id,'cash',p_expected_due,'captured') RETURNING id INTO result;
 INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
 VALUES(actor,'identity','appointment.cash_received','appointment_payment_attempt',result,gen_random_uuid(),'allowed',jsonb_build_object('amount_minor',p_expected_due,'note',btrim(p_note),'policy_version',c.policy_version));
 PERFORM clinzo.emit_appointment_change(a.id);
 RETURN result;
END $$;

CREATE FUNCTION public.confirm_appointment_cash_refund(p_refund_id uuid,p_note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); c clinzo.appointment_charge; j clinzo.appointment_refund_job;
BEGIN
 SELECT c0.* INTO c FROM clinzo.appointment_charge c0 JOIN clinzo.appointment_refund_request r ON r.charge_id=c0.id WHERE r.id=p_refund_id;
 IF NOT coalesce(clinzo.can_manage_appointment_money(actor,c.appointment_id),false) THEN RAISE EXCEPTION 'Financial access required' USING ERRCODE='42501'; END IF;
 PERFORM clinzo.lock_appointment_billing(c.appointment_id);
 PERFORM id FROM clinzo.appointment_charge WHERE id=c.id FOR UPDATE;
 IF length(btrim(coalesce(p_note,''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Record how cash was returned' USING ERRCODE='22023'; END IF;
 FOR j IN SELECT j0.* FROM clinzo.appointment_refund_job j0 JOIN clinzo.appointment_payment_attempt p ON p.id=j0.attempt_id WHERE j0.refund_id=p_refund_id AND j0.status='ready' AND p.method='cash' FOR UPDATE OF j0 LOOP
   UPDATE clinzo.appointment_refund_job SET status='processed',provider_refund_id='cash_refund_'||j.id::text WHERE id=j.id;
   UPDATE clinzo.appointment_payment_attempt SET refunded_minor=refunded_minor+j.amount_minor WHERE id=j.attempt_id;
   INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
   VALUES(actor,'identity','appointment.cash_refunded','appointment_refund_job',j.id,gen_random_uuid(),'allowed',jsonb_build_object('amount_minor',j.amount_minor,'note',btrim(p_note)));
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM clinzo.appointment_refund_job WHERE refund_id=p_refund_id AND status<>'processed') THEN
   UPDATE clinzo.appointment_refund_request SET status='refunded',row_version=row_version+1 WHERE id=p_refund_id AND status IN ('approved','processing');
 END IF;
 PERFORM clinzo.emit_appointment_change(c.appointment_id);
END $$;

REVOKE ALL ON FUNCTION public.record_appointment_cash(uuid,bigint,text),public.confirm_appointment_cash_refund(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_appointment_cash(uuid,bigint,text),public.confirm_appointment_cash_refund(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION clinzo.activate_appointment_billing(),clinzo.appointment_charge_id(uuid),clinzo.lock_appointment_billing(uuid),clinzo.can_manage_appointment_money(uuid,uuid),clinzo.appointment_billing_details(uuid,uuid),clinzo.carry_appointment_payment(),clinzo.require_appointment_payment(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_appointment_billing(uuid),public.prepare_appointment_payment(uuid,text),public.request_appointment_refund(uuid,text,text,bigint,bigint),public.decide_appointment_refund(uuid,bigint,boolean,text),public.appointment_provider_command(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_billing(uuid),public.prepare_appointment_payment(uuid,text),public.request_appointment_refund(uuid,text,text,bigint,bigint),public.decide_appointment_refund(uuid,bigint,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.appointment_provider_command(text,jsonb) TO service_role;
