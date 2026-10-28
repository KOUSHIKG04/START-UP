-- Money remains private. Dashboard-assisted Route onboarding stores only gateway
-- identifiers here, never bank details. No grants or financial terms are assumed.
CREATE TABLE clinzo.company_finance_member (
 identity_id uuid PRIMARY KEY REFERENCES clinzo.identity(id), active boolean NOT NULL DEFAULT true
);
CREATE TABLE clinzo.marketplace_payment_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false, mode text NOT NULL DEFAULT 'test' CHECK(mode IN ('test','live')),
 appointment_bps integer CHECK(appointment_bps BETWEEN 0 AND 10000),
 ambulance_bps integer CHECK(ambulance_bps BETWEEN 0 AND 10000),
 release_delay_hours integer NOT NULL DEFAULT 0 CHECK(release_delay_hours BETWEEN 0 AND 168),
 row_version bigint NOT NULL DEFAULT 1, CHECK(row_version>0)
);
INSERT INTO clinzo.marketplace_payment_config(singleton) VALUES(true);
CREATE TABLE clinzo.payout_recipient (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 scope_kind text NOT NULL CHECK(scope_kind IN ('practice','driver')), scope_id uuid NOT NULL,
 payee_kind text NOT NULL CHECK(payee_kind IN ('doctor','facility','driver','operator')),
 legal_name text NOT NULL CHECK(length(btrim(legal_name)) BETWEEN 2 AND 200),
 mode text NOT NULL CHECK(mode IN ('test','live')),
 account_id text NOT NULL CHECK(account_id ~ '^acc_[A-Za-z0-9]+$'),
 product_id text NOT NULL CHECK(product_id ~ '^acc_prd_[A-Za-z0-9]+$'),
 active boolean NOT NULL DEFAULT true, verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), created_by uuid NOT NULL REFERENCES clinzo.identity(id)
);
CREATE UNIQUE INDEX payout_recipient_active_uq ON clinzo.payout_recipient(scope_kind,scope_id,mode) WHERE active;
CREATE INDEX payout_recipient_created_by_idx ON clinzo.payout_recipient(created_by);
ALTER TABLE clinzo.payment DROP CONSTRAINT payment_ck_2;
ALTER TABLE clinzo.payment ADD CONSTRAINT payment_ck_2 CHECK ((provider IS NULL) = (provider_payment_id IS NULL) OR (method='gateway' AND status='pending' AND provider='razorpay' AND provider_payment_id IS NULL));
CREATE UNIQUE INDEX ambulance_payment_open_uq ON clinzo.payment(booking_id) WHERE status NOT IN ('failed','cancelled');
CREATE TABLE clinzo.ambulance_payment_attempt (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL UNIQUE REFERENCES clinzo.payment(id),
 mode text NOT NULL CHECK(mode IN ('test','live')), order_id text UNIQUE, gateway_payment_id text UNIQUE,
 status text NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','created','authorized','captured','uncertain','failed')),
 claimed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinzo.payout_entry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_attempt_id uuid UNIQUE REFERENCES clinzo.appointment_payment_attempt(id),
 ambulance_payment_id uuid UNIQUE REFERENCES clinzo.payment(id),
 scope_kind text NOT NULL CHECK(scope_kind IN ('practice','driver')), scope_id uuid NOT NULL,
 mode text NOT NULL CHECK(mode IN ('test','live')), method text NOT NULL CHECK(method IN ('gateway','cash','external_direct')),
 recipient_id uuid REFERENCES clinzo.payout_recipient(id), commission_bps integer CHECK(commission_bps BETWEEN 0 AND 10000),
 gross_minor bigint NOT NULL CHECK(gross_minor BETWEEN 1 AND 9000000000000),
 refunded_minor bigint NOT NULL DEFAULT 0 CHECK(refunded_minor BETWEEN 0 AND gross_minor),
 payment_id text, transfer_id text UNIQUE, transfer_minor bigint NOT NULL DEFAULT 0 CHECK(transfer_minor>=0),
 reversed_minor bigint NOT NULL DEFAULT 0 CHECK(reversed_minor BETWEEN 0 AND transfer_minor),
 transfer_status text NOT NULL DEFAULT 'pending' CHECK(transfer_status IN ('pending','working','uncertain','processed','failed','reversed','partially_reversed')),
 settlement_status text NOT NULL DEFAULT 'pending' CHECK(settlement_status IN ('pending','on_hold','settled')),
 settlement_id text, gateway_fees_minor bigint NOT NULL DEFAULT 0, gateway_tax_minor bigint NOT NULL DEFAULT 0,
 route_fees_minor bigint NOT NULL DEFAULT 0, route_tax_minor bigint NOT NULL DEFAULT 0,
 claimed_at timestamptz, last_checked_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((appointment_attempt_id IS NULL) <> (ambulance_payment_id IS NULL))
);
CREATE INDEX payout_entry_scope_idx ON clinzo.payout_entry(scope_kind,scope_id,created_at,id);
CREATE INDEX payout_entry_recipient_idx ON clinzo.payout_entry(recipient_id);
CREATE INDEX payout_entry_work_idx ON clinzo.payout_entry(mode,last_checked_at);
CREATE TABLE clinzo.payout_reversal (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entry_id uuid NOT NULL REFERENCES clinzo.payout_entry(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), provider_id text UNIQUE,
 status text NOT NULL DEFAULT 'working' CHECK(status IN ('working','uncertain','processed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payout_reversal_open_uq ON clinzo.payout_reversal(entry_id) WHERE status<>'processed';
CREATE TABLE clinzo.cash_commission_receipt (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entry_id uuid NOT NULL REFERENCES clinzo.payout_entry(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), reference text NOT NULL UNIQUE CHECK(length(btrim(reference)) BETWEEN 3 AND 150),
 note text NOT NULL CHECK(length(btrim(note)) BETWEEN 2 AND 1000),
 received_by uuid NOT NULL REFERENCES clinzo.identity(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cash_commission_receipt_entry_idx ON clinzo.cash_commission_receipt(entry_id);
CREATE INDEX cash_commission_receipt_received_by_idx ON clinzo.cash_commission_receipt(received_by);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['company_finance_member','marketplace_payment_config','payout_recipient','ambulance_payment_attempt','payout_entry','payout_reversal','cash_commission_receipt'] LOOP
  EXECUTE format('ALTER TABLE clinzo.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON clinzo.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $$;

CREATE FUNCTION clinzo.finance_identity() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.identity_id FROM clinzo.company_finance_member r
 WHERE r.identity_id=clinzo.company_reviewer_identity() AND r.active;
$$;
CREATE FUNCTION public.has_company_finance_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT clinzo.finance_identity() IS NOT NULL;
$$;
-- Same financial permission as the existing consultation billing panel.
CREATE FUNCTION clinzo.can_manage_appointment_practice_money(actor uuid,scope uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(clinzo.can_manage_practice(actor,scope),false) AND coalesce(clinzo.can_edit_practice_schedule(actor,scope),false);
$$;

CREATE FUNCTION clinzo.can_read_payout(actor uuid,kind text,scope uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT clinzo.finance_identity()=actor OR CASE WHEN kind='practice' THEN coalesce(clinzo.can_manage_appointment_practice_money(actor,scope),false)
 ELSE EXISTS(SELECT 1 FROM clinzo.driver d WHERE d.id=scope AND d.identity_id=actor) END;
$$;

CREATE FUNCTION clinzo.snapshot_payout() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE scope uuid; kind text; saved_mode text; cfg clinzo.marketplace_payment_config; recipient uuid; bps integer; gateway text;
BEGIN
 SELECT * INTO cfg FROM clinzo.marketplace_payment_config WHERE singleton;
 IF TG_TABLE_NAME='appointment_payment_attempt' THEN
  IF NEW.status<>'captured' THEN RETURN NEW; END IF;
  SELECT s.doctor_facility_id,c.mode INTO scope,saved_mode FROM clinzo.appointment_charge c JOIN clinzo.appointment a ON a.id=c.appointment_id JOIN clinzo.session s ON s.id=a.session_id WHERE c.id=NEW.charge_id;
  kind:='practice'; bps:=cfg.appointment_bps; gateway:=NEW.payment_id;
 ELSE
  IF NEW.status<>'confirmed' THEN RETURN NEW; END IF;
  SELECT aa.driver_id INTO scope FROM clinzo.trip t JOIN clinzo.ambulance_assignment aa ON aa.id=t.assignment_id WHERE t.booking_id=NEW.booking_id;
  IF scope IS NULL THEN RETURN NEW; END IF;
  SELECT mode INTO saved_mode FROM clinzo.ambulance_payment_attempt WHERE payment_id=NEW.id;
  saved_mode:=coalesce(saved_mode,cfg.mode); kind:='driver'; bps:=cfg.ambulance_bps; gateway:=NEW.provider_payment_id;
 END IF;
 SELECT id INTO recipient FROM clinzo.payout_recipient WHERE scope_kind=kind AND scope_id=scope AND mode=saved_mode AND active;
 IF TG_TABLE_NAME='appointment_payment_attempt' THEN
  INSERT INTO clinzo.payout_entry(appointment_attempt_id,scope_kind,scope_id,mode,method,recipient_id,commission_bps,gross_minor,refunded_minor,payment_id)
  VALUES(NEW.id,kind,scope,saved_mode,NEW.method,recipient,bps,NEW.amount_minor,NEW.refunded_minor,gateway)
  ON CONFLICT(appointment_attempt_id) DO UPDATE SET refunded_minor=excluded.refunded_minor,payment_id=excluded.payment_id;
 ELSE
  INSERT INTO clinzo.payout_entry(ambulance_payment_id,scope_kind,scope_id,mode,method,recipient_id,commission_bps,gross_minor,payment_id)
  VALUES(NEW.id,kind,scope,saved_mode,NEW.method,recipient,bps,NEW.amount_minor,gateway) ON CONFLICT(ambulance_payment_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER snapshot_appointment_payout AFTER INSERT OR UPDATE ON clinzo.appointment_payment_attempt FOR EACH ROW EXECUTE FUNCTION clinzo.snapshot_payout();
CREATE TRIGGER snapshot_ambulance_payout AFTER INSERT OR UPDATE ON clinzo.payment FOR EACH ROW EXECUTE FUNCTION clinzo.snapshot_payout();

-- Capture data and approved refund reservations define the liability. Historical
-- recipients and percentages never change when current configuration changes.
CREATE FUNCTION clinzo.payout_details(entry_key uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE e clinzo.payout_entry; recipient clinzo.payout_recipient; a clinzo.appointment; c clinzo.appointment_charge;
 cfg clinzo.marketplace_payment_config; net bigint; reserved bigint:=0; prior bigint:=0; company bigint; provider bigint;
 paid_cash bigint; complete boolean:=false; blocked boolean:=false; resource uuid; ready_at timestamptz;
BEGIN
 SELECT * INTO e FROM clinzo.payout_entry WHERE id=entry_key;
 SELECT * INTO recipient FROM clinzo.payout_recipient WHERE id=e.recipient_id;
 SELECT * INTO cfg FROM clinzo.marketplace_payment_config WHERE singleton;
 IF e.appointment_attempt_id IS NOT NULL THEN
  SELECT c0.* INTO c FROM clinzo.appointment_charge c0 JOIN clinzo.appointment_payment_attempt p ON p.charge_id=c0.id WHERE p.id=e.appointment_attempt_id;
  SELECT * INTO a FROM clinzo.appointment WHERE id=c.appointment_id; resource:=a.id;
  SELECT coalesce(sum(j.amount_minor),0) INTO reserved FROM clinzo.appointment_refund_job j WHERE j.attempt_id=e.appointment_attempt_id AND j.status<>'processed';
  SELECT coalesce(sum(greatest(0,p.amount_minor-p.refunded_minor-coalesce((SELECT sum(j.amount_minor) FROM clinzo.appointment_refund_job j WHERE j.attempt_id=p.id AND j.status<>'processed'),0))),0)
   INTO prior FROM clinzo.appointment_payment_attempt p JOIN clinzo.appointment_payment_attempt own ON own.id=e.appointment_attempt_id WHERE p.charge_id=c.id AND p.status='captured' AND (p.created_at,p.id)<(own.created_at,own.id);
  blocked:=EXISTS(SELECT 1 FROM clinzo.appointment_refund_request r WHERE r.charge_id=c.id AND r.status IN ('requested','approved','processing'));
  complete:=a.status='completed';
  SELECT coalesce(v.signed_at,a.updated_at) INTO ready_at FROM clinzo.consultation v WHERE v.appointment_id=a.id ORDER BY v.created_at DESC LIMIT 1;
 ELSE
  SELECT p.booking_id INTO resource FROM clinzo.payment p WHERE p.id=e.ambulance_payment_id;
  SELECT t.status='completed',t.completed_at INTO complete,ready_at FROM clinzo.trip t WHERE t.booking_id=resource;
 END IF;
 net:=greatest(0,e.gross_minor-e.refunded_minor-reserved);
 IF c.id IS NOT NULL THEN net:=least(net,greatest(0,c.amount_minor-prior)); END IF;
 company:=(net*e.commission_bps)/10000; provider:=net-company;
 SELECT coalesce(sum(amount_minor),0) INTO paid_cash FROM clinzo.cash_commission_receipt WHERE entry_id=e.id;
 RETURN to_jsonb(e)||jsonb_build_object('resource_id',resource,'recipient_name',recipient.legal_name,'account_id',recipient.account_id,'product_id',recipient.product_id,
  'net_minor',net,'company_minor',company,'provider_minor',provider,'cash_received_minor',paid_cash,
  'cash_due_minor',CASE WHEN e.method='gateway' THEN 0 WHEN company IS NULL THEN NULL ELSE greatest(0,company-paid_cash) END,
  'cash_credit_minor',CASE WHEN e.method='gateway' THEN 0 WHEN company IS NULL THEN NULL ELSE greatest(0,paid_cash-company) END,
  'complete',coalesce(complete,false),'refund_pending',blocked,'reversal_due_minor',greatest(0,e.transfer_minor-e.reversed_minor-coalesce(provider,0)),
  'ready',cfg.enabled AND cfg.mode=e.mode AND coalesce(complete,false) AND NOT blocked AND e.commission_bps IS NOT NULL AND recipient.verified_at IS NOT NULL AND recipient.active
    AND clock_timestamp()>=coalesce(ready_at,a.updated_at,clock_timestamp())+make_interval(hours=>cfg.release_delay_hours));
END $$;

CREATE FUNCTION public.list_payout_entries(p_appointment_id uuid DEFAULT NULL,p_before_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); result jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(clinzo.payout_details(x.id) ORDER BY x.created_at DESC,x.id DESC),'[]'::jsonb) INTO result FROM (
  SELECT e.id,e.created_at FROM clinzo.payout_entry e WHERE clinzo.can_read_payout(actor,e.scope_kind,e.scope_id)
   AND (p_appointment_id IS NULL OR e.appointment_attempt_id IN (SELECT p.id FROM clinzo.appointment_payment_attempt p WHERE p.charge_id=clinzo.appointment_charge_id(p_appointment_id)))
   AND (p_before_id IS NULL OR (e.created_at,e.id)<(SELECT q.created_at,q.id FROM clinzo.payout_entry q WHERE q.id=p_before_id AND clinzo.can_read_payout(actor,q.scope_kind,q.scope_id)))
  ORDER BY e.created_at DESC,e.id DESC LIMIT 100
 ) x;
 RETURN result;
END $$;

CREATE FUNCTION public.get_company_payment_setup() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF clinzo.finance_identity() IS NULL THEN RAISE EXCEPTION 'Company finance access required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('config',(SELECT to_jsonb(c) FROM clinzo.marketplace_payment_config c WHERE singleton),
  'recipients',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC) FROM clinzo.payout_recipient r WHERE active),'[]'::jsonb));
END $$;

CREATE FUNCTION public.manage_company_payments(p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.finance_identity(); cfg clinzo.marketplace_payment_config; e clinzo.payout_entry; r clinzo.payout_recipient;
 result uuid; scope uuid; quote clinzo.fare_quote; existing clinzo.cash_commission_receipt; details jsonb;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Company finance access required' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_data->>'note',''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'A financial action note is required' USING ERRCODE='22023'; END IF;
 SELECT * INTO cfg FROM clinzo.marketplace_payment_config WHERE singleton FOR UPDATE;
 CASE p_action
 WHEN 'config' THEN
  IF cfg.row_version IS DISTINCT FROM (p_data->>'expectedVersion')::bigint THEN RAISE EXCEPTION 'Payment settings changed. Reload first.' USING ERRCODE='PT409'; END IF;
  UPDATE clinzo.marketplace_payment_config SET enabled=(p_data->>'enabled')::boolean,mode=p_data->>'mode',appointment_bps=(p_data->>'appointmentBps')::integer,ambulance_bps=(p_data->>'ambulanceBps')::integer,release_delay_hours=(p_data->>'releaseDelayHours')::integer,row_version=row_version+1 WHERE singleton;
 WHEN 'recipient' THEN
  scope:=(p_data->>'scopeId')::uuid;
  IF (p_data->>'scopeKind'='practice' AND NOT EXISTS(SELECT 1 FROM clinzo.doctor_facility WHERE id=scope)) OR
   (p_data->>'scopeKind'='driver' AND NOT EXISTS(SELECT 1 FROM clinzo.driver WHERE id=scope)) THEN RAISE EXCEPTION 'Provider scope does not exist' USING ERRCODE='22023'; END IF;
  IF (p_data->>'scopeKind'='practice' AND p_data->>'payeeKind' NOT IN ('doctor','facility')) OR (p_data->>'scopeKind'='driver' AND p_data->>'payeeKind' NOT IN ('driver','operator')) THEN RAISE EXCEPTION 'Recipient type does not match the provider' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.payout_recipient SET active=false WHERE scope_kind=p_data->>'scopeKind' AND scope_id=scope AND mode=cfg.mode;
  INSERT INTO clinzo.payout_recipient(scope_kind,scope_id,payee_kind,legal_name,mode,account_id,product_id,created_by)
   VALUES(p_data->>'scopeKind',scope,p_data->>'payeeKind',p_data->>'legalName',cfg.mode,p_data->>'accountId',p_data->>'productId',actor) RETURNING id INTO result;
 WHEN 'apply_terms' THEN
  SELECT * INTO e FROM clinzo.payout_entry WHERE id=(p_data->>'entryId')::uuid FOR UPDATE;
  IF e.id IS NULL OR e.claimed_at IS NOT NULL OR e.transfer_id IS NOT NULL OR (e.commission_bps IS NOT NULL AND e.recipient_id IS NOT NULL) THEN RAISE EXCEPTION 'Only unconfigured entries can adopt current terms' USING ERRCODE='22023'; END IF;
  SELECT * INTO r FROM clinzo.payout_recipient WHERE scope_kind=e.scope_kind AND scope_id=e.scope_id AND mode=e.mode AND active;
  IF cfg.mode<>e.mode THEN RAISE EXCEPTION 'Switch to the payment environment before applying terms' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.payout_entry SET recipient_id=coalesce(recipient_id,r.id),commission_bps=coalesce(commission_bps,CASE WHEN e.scope_kind='practice' THEN cfg.appointment_bps ELSE cfg.ambulance_bps END) WHERE id=e.id; result:=e.id;
 WHEN 'cash_receipt' THEN
  SELECT * INTO e FROM clinzo.payout_entry WHERE id=(p_data->>'entryId')::uuid FOR UPDATE;
  SELECT * INTO existing FROM clinzo.cash_commission_receipt WHERE reference=btrim(p_data->>'reference');
  IF existing.id IS NOT NULL THEN
   IF existing.entry_id=e.id AND existing.amount_minor=(p_data->>'expectedAmount')::bigint THEN RETURN jsonb_build_object('id',existing.id); END IF;
   RAISE EXCEPTION 'This receipt reference is already used' USING ERRCODE='22023';
  END IF;
  details:=clinzo.payout_details(e.id);
  IF e.method='gateway' OR NOT coalesce((details->>'complete')::boolean,false) OR e.commission_bps IS NULL OR (p_data->>'expectedAmount')::bigint IS DISTINCT FROM (details->>'cash_due_minor')::bigint OR (details->>'cash_due_minor')::bigint<=0 THEN RAISE EXCEPTION 'Cash commission balance changed. Reload first.' USING ERRCODE='PT409'; END IF;
  INSERT INTO clinzo.cash_commission_receipt(entry_id,amount_minor,reference,note,received_by) VALUES(e.id,(p_data->>'expectedAmount')::bigint,btrim(p_data->>'reference'),btrim(p_data->>'note'),actor) RETURNING id INTO result;
 WHEN 'final_fare' THEN
  scope:=(p_data->>'bookingId')::uuid;
  PERFORM id FROM clinzo.ambulance_booking WHERE id=scope FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM clinzo.trip WHERE booking_id=scope AND status='completed') THEN RAISE EXCEPTION 'Record the final fare after the trip is completed' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.payment WHERE booking_id=scope AND status NOT IN ('failed','cancelled')) THEN RAISE EXCEPTION 'A payment already uses this fare' USING ERRCODE='22023'; END IF;
  IF (p_data->>'amountMinor')::bigint NOT BETWEEN 100 AND 9000000000000 THEN RAISE EXCEPTION 'Invalid final fare' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.fare_quote(booking_id,version,kind,currency,base_minor,distance_minor,waiting_minor,other_minor,discount_minor,tax_minor,total_minor,pricing_policy_version,distance_meters)
   SELECT scope,coalesce(max(version),0)+1,'final','INR',(p_data->>'amountMinor')::bigint,0,0,0,0,0,(p_data->>'amountMinor')::bigint,'finance-reviewed-v1',coalesce((SELECT distance_meters FROM clinzo.trip WHERE booking_id=scope),0) FROM clinzo.fare_quote WHERE booking_id=scope RETURNING id INTO result;
 ELSE RAISE EXCEPTION 'Invalid finance action' USING ERRCODE='22023';
 END CASE;
 INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
 VALUES(actor,'identity','marketplace.'||p_action,'marketplace_payment',coalesce(result,e.id,actor),gen_random_uuid(),'allowed',p_data);
 RETURN jsonb_build_object('id',result);
END $$;

-- Gateway worker commands are never executable by a mobile/web user. HTTP stays
-- outside database transactions; every outbound POST is durably claimed once.
CREATE FUNCTION public.payout_provider_command(p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e clinzo.payout_entry; r clinzo.payout_reversal; recipient clinzo.payout_recipient; details jsonb; entity jsonb:=p_data->'entity'; result jsonb; appointment_key uuid;
BEGIN
 IF p_action='appointment_entries' THEN
  SELECT coalesce(jsonb_agg(e.id),'[]'::jsonb) INTO result FROM clinzo.payout_entry e JOIN clinzo.appointment_payment_attempt p ON p.id=e.appointment_attempt_id WHERE p.charge_id=clinzo.appointment_charge_id((p_data->>'appointment_id')::uuid) AND e.mode=p_data->>'mode'; RETURN result;
 END IF;
 IF p_action='payment_target' THEN
  IF EXISTS(SELECT 1 FROM clinzo.ambulance_payment_attempt WHERE order_id=p_data->>'order_id') THEN RETURN '"ambulance"'::jsonb; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.appointment_payment_attempt WHERE order_id=p_data->>'order_id') THEN RETURN '"appointment"'::jsonb; END IF;
  RETURN 'null'::jsonb;
 END IF;
 IF p_action='gateway_costs' THEN
  UPDATE clinzo.payout_entry SET gateway_fees_minor=coalesce((entity->>'fee')::bigint,0),gateway_tax_minor=coalesce((entity->>'tax')::bigint,0)
  WHERE payment_id=entity->>'id' AND mode=p_data->>'mode' AND gross_minor=(entity->>'amount')::bigint AND entity->>'currency'='INR';
  RETURN jsonb_build_object('recorded',FOUND);
 END IF;
 IF p_action='queue' THEN
  SELECT coalesce(jsonb_agg(x.id),'[]'::jsonb) INTO result FROM (SELECT id FROM clinzo.payout_entry WHERE mode=p_data->>'mode' AND method='gateway' ORDER BY last_checked_at,id LIMIT 15) x;
  UPDATE clinzo.payout_entry SET last_checked_at=clock_timestamp() WHERE id IN (SELECT value::uuid FROM jsonb_array_elements_text(result)); RETURN result;
 END IF;
 IF p_action='verify_recipient' THEN
  SELECT * INTO recipient FROM clinzo.payout_recipient WHERE id=(p_data->>'recipient_id')::uuid FOR UPDATE;
  IF recipient.mode IS DISTINCT FROM p_data->>'mode' OR recipient.account_id IS DISTINCT FROM entity->>'account_id' OR recipient.product_id IS DISTINCT FROM entity->>'id' OR entity->>'product_name' IS DISTINCT FROM 'route' THEN RAISE EXCEPTION 'Recipient gateway binding mismatch' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.payout_recipient SET verified_at=CASE WHEN entity->>'activation_status'='activated' AND (entity->'tnc'->>'accepted')::boolean THEN now() ELSE NULL END WHERE id=recipient.id;
  RETURN jsonb_build_object('verified',entity->>'activation_status'='activated' AND coalesce((entity->'tnc'->>'accepted')::boolean,false));
 END IF;
 IF p_action='lookup_transfer' THEN
  SELECT id INTO appointment_key FROM clinzo.payout_entry WHERE transfer_id=p_data->>'transfer_id';
  RETURN to_jsonb(appointment_key);
 END IF;
 SELECT * INTO e FROM clinzo.payout_entry WHERE id=(p_data->>'entry_id')::uuid;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Payout entry not found' USING ERRCODE='22023'; END IF;
 IF e.mode IS DISTINCT FROM p_data->>'mode' THEN RAISE EXCEPTION 'Payout environment mismatch' USING ERRCODE='22023'; END IF;
 IF p_action='work' THEN
  RETURN clinzo.payout_details(e.id)||jsonb_build_object('reversals',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM clinzo.payout_reversal x WHERE x.entry_id=e.id),'[]'::jsonb));
 END IF;
 SELECT c.appointment_id INTO appointment_key FROM clinzo.appointment_charge c JOIN clinzo.appointment_payment_attempt p ON p.charge_id=c.id WHERE p.id=e.appointment_attempt_id;
 IF appointment_key IS NOT NULL THEN PERFORM clinzo.lock_appointment_billing(appointment_key);
 ELSE PERFORM id FROM clinzo.ambulance_booking WHERE id=(SELECT booking_id FROM clinzo.payment WHERE id=e.ambulance_payment_id) FOR UPDATE; END IF;
 SELECT * INTO e FROM clinzo.payout_entry WHERE id=e.id FOR UPDATE;
 details:=clinzo.payout_details(e.id);
 CASE p_action
 WHEN 'claim_transfer' THEN
  IF NOT coalesce((details->>'ready')::boolean,false) OR e.method<>'gateway' OR e.transfer_status<>'pending' OR e.claimed_at IS NOT NULL OR (details->>'provider_minor')::bigint<=0 OR e.payment_id IS NULL THEN RETURN NULL; END IF;
  PERFORM id FROM clinzo.payout_recipient WHERE id=e.recipient_id AND active AND verified_at>now()-interval '5 minutes' FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE clinzo.payout_entry SET transfer_status='working',claimed_at=now(),transfer_minor=(details->>'provider_minor')::bigint WHERE id=e.id;
  RETURN details||jsonb_build_object('transfer_minor',(details->>'provider_minor')::bigint);
 WHEN 'transfer_uncertain' THEN
  UPDATE clinzo.payout_entry SET transfer_status='uncertain' WHERE id=e.id AND transfer_id IS NULL AND transfer_status='working';
 WHEN 'transfer_result' THEN
  IF coalesce(entity->>'id','') !~ '^trf_[A-Za-z0-9]+$' OR entity->>'source' IS DISTINCT FROM e.payment_id OR entity->>'recipient' IS DISTINCT FROM details->>'account_id' OR entity->>'currency' IS DISTINCT FROM 'INR' OR (entity->>'amount')::bigint IS DISTINCT FROM e.transfer_minor OR entity->'notes'->>'entry_id' IS DISTINCT FROM e.id::text OR (e.transfer_id IS NOT NULL AND e.transfer_id IS DISTINCT FROM entity->>'id') THEN RAISE EXCEPTION 'Transfer binding or amount mismatch' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.payout_entry SET transfer_id=entity->>'id',
   transfer_status=CASE WHEN entity->>'status' IN ('processed','failed','reversed','partially_reversed') THEN entity->>'status' ELSE 'working' END,
   reversed_minor=greatest(reversed_minor,coalesce((entity->>'amount_reversed')::bigint,0)),
   settlement_status=CASE WHEN settlement_status='settled' THEN 'settled' WHEN entity->>'settlement_status' IN ('pending','on_hold','settled') THEN entity->>'settlement_status' ELSE settlement_status END,
   settlement_id=coalesce(entity->>'recipient_settlement_id',settlement_id),route_fees_minor=coalesce((entity->>'fees')::bigint,0),route_tax_minor=coalesce((entity->>'tax')::bigint,0) WHERE id=e.id;
 WHEN 'claim_reversal' THEN
  IF e.transfer_id IS NULL OR e.transfer_status NOT IN ('processed','partially_reversed') OR (details->>'reversal_due_minor')::bigint<=0 OR EXISTS(SELECT 1 FROM clinzo.payout_reversal WHERE entry_id=e.id AND status<>'processed')
   OR e.reversed_minor<(SELECT coalesce(sum(amount_minor),0) FROM clinzo.payout_reversal WHERE entry_id=e.id AND status='processed') THEN RETURN NULL; END IF;
  INSERT INTO clinzo.payout_reversal(entry_id,amount_minor) VALUES(e.id,(details->>'reversal_due_minor')::bigint) RETURNING * INTO r;
  RETURN to_jsonb(r)||jsonb_build_object('transfer_id',e.transfer_id);
 WHEN 'reversal_uncertain' THEN
  UPDATE clinzo.payout_reversal SET status='uncertain' WHERE id=(p_data->>'reversal_id')::uuid AND entry_id=e.id AND status='working';
 WHEN 'reversal_result' THEN
  SELECT * INTO r FROM clinzo.payout_reversal WHERE id=(p_data->>'reversal_id')::uuid AND entry_id=e.id FOR UPDATE;
  IF r.id IS NULL OR coalesce(entity->>'id','') !~ '^rvrsl_[A-Za-z0-9]+$' OR entity->>'transfer_id' IS DISTINCT FROM e.transfer_id OR entity->>'currency' IS DISTINCT FROM 'INR' OR (entity->>'amount')::bigint IS DISTINCT FROM r.amount_minor OR entity->'notes'->>'reversal_id' IS DISTINCT FROM r.id::text THEN RAISE EXCEPTION 'Reversal binding mismatch' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.payout_reversal SET status='processed',provider_id=entity->>'id' WHERE id=r.id;
  -- Refresh the transfer separately to obtain its authoritative cumulative reversal.
 ELSE RAISE EXCEPTION 'Invalid payout provider operation' USING ERRCODE='22023';
 END CASE;
 IF appointment_key IS NOT NULL THEN PERFORM clinzo.emit_appointment_change(appointment_key); END IF;
 RETURN clinzo.payout_details(e.id);
END $$;

-- A refund must not race a transfer POST. Once approved, the existing job
-- reservation reduces provider liability; reversal must finish before refund POST.
CREATE FUNCTION clinzo.guard_payout_refund() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='appointment_refund_request' AND NEW.status='approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
  IF EXISTS(SELECT 1 FROM clinzo.payout_entry e JOIN clinzo.appointment_payment_attempt p ON p.id=e.appointment_attempt_id WHERE p.charge_id=NEW.charge_id AND e.transfer_status IN ('working','uncertain')) THEN RAISE EXCEPTION 'Reconcile the provider transfer before approving this refund' USING ERRCODE='PT409'; END IF;
 ELSIF TG_TABLE_NAME='appointment_refund_job' AND NEW.status='working' AND OLD.status IS DISTINCT FROM 'working' THEN
  IF EXISTS(SELECT 1 FROM clinzo.payout_entry e WHERE e.appointment_attempt_id=NEW.attempt_id AND (e.transfer_status IN ('working','uncertain') OR (clinzo.payout_details(e.id)->>'reversal_due_minor')::bigint>0 OR EXISTS(SELECT 1 FROM clinzo.payout_reversal r WHERE r.entry_id=e.id AND r.status<>'processed'))) THEN RAISE EXCEPTION 'Provider reversal is pending; reconcile before refunding' USING ERRCODE='PT409'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_payout_refund_decision BEFORE UPDATE ON clinzo.appointment_refund_request FOR EACH ROW EXECUTE FUNCTION clinzo.guard_payout_refund();
CREATE TRIGGER guard_payout_refund_job BEFORE UPDATE ON clinzo.appointment_refund_job FOR EACH ROW EXECUTE FUNCTION clinzo.guard_payout_refund();

CREATE FUNCTION clinzo.can_access_ambulance_money(actor uuid,booking_key uuid) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT clinzo.finance_identity()=actor OR EXISTS(SELECT 1 FROM clinzo.ambulance_booking b WHERE b.id=booking_key AND (b.requested_by=actor OR EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=b.patient_id AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL)))
 OR EXISTS(SELECT 1 FROM clinzo.trip t JOIN clinzo.ambulance_assignment a ON a.id=t.assignment_id JOIN clinzo.driver d ON d.id=a.driver_id WHERE t.booking_id=booking_key AND d.identity_id=actor);
$$;
CREATE FUNCTION public.get_ambulance_billing(p_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); q clinzo.fare_quote; p clinzo.payment; attempt clinzo.ambulance_payment_attempt; cfg clinzo.marketplace_payment_config; patient_access boolean; manager boolean;
BEGIN
 IF NOT coalesce(clinzo.can_access_ambulance_money(actor,p_booking_id),false) THEN RAISE EXCEPTION 'Booking access required' USING ERRCODE='42501'; END IF;
 SELECT * INTO cfg FROM clinzo.marketplace_payment_config WHERE singleton;
 SELECT * INTO q FROM clinzo.fare_quote WHERE booking_id=p_booking_id AND kind='final' ORDER BY version DESC LIMIT 1;
 SELECT * INTO p FROM clinzo.payment WHERE booking_id=p_booking_id AND status NOT IN ('failed','cancelled') ORDER BY created_at DESC LIMIT 1;
 SELECT * INTO attempt FROM clinzo.ambulance_payment_attempt WHERE payment_id=p.id;
 SELECT b.requested_by=actor OR EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=b.patient_id AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) INTO patient_access FROM clinzo.ambulance_booking b WHERE b.id=p_booking_id;
 manager:=clinzo.finance_identity()=actor OR EXISTS(SELECT 1 FROM clinzo.trip t JOIN clinzo.ambulance_assignment aa ON aa.id=t.assignment_id JOIN clinzo.driver d ON d.id=aa.driver_id WHERE t.booking_id=p_booking_id AND d.identity_id=actor);
 RETURN jsonb_build_object('booking_id',p_booking_id,'enabled',cfg.enabled,'mode',coalesce(attempt.mode,cfg.mode),'quote_id',q.id,'amount_minor',coalesce(q.total_minor,0),'currency','INR',
  'status',CASE WHEN p.status='confirmed' THEN 'paid' WHEN attempt.status='authorized' THEN 'authorized' WHEN attempt.status IN ('creating','uncertain') THEN 'checking' ELSE 'unpaid' END,
  'payment_id',p.provider_payment_id,'method',p.method,'can_pay',coalesce(patient_access,false) AND cfg.enabled AND q.currency='INR' AND q.total_minor>=100 AND coalesce(p.status,'pending')<>'confirmed' AND EXISTS(SELECT 1 FROM clinzo.trip WHERE booking_id=p_booking_id AND status='completed'),
  'can_record_cash',coalesce(manager,false) AND cfg.enabled AND q.currency='INR' AND q.total_minor>=100 AND p.id IS NULL AND EXISTS(SELECT 1 FROM clinzo.trip WHERE booking_id=p_booking_id AND status='completed'),
  'refunded_minor',greatest(coalesce((SELECT sum(amount_minor) FROM clinzo.refund WHERE payment_id=p.id AND status='confirmed'),0),coalesce((SELECT refunded_minor FROM clinzo.payout_entry WHERE ambulance_payment_id=p.id),0)));
END $$;
CREATE FUNCTION public.prepare_ambulance_payment(p_booking_id uuid,p_quote_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); details jsonb; q clinzo.fare_quote; payment_key uuid; attempt clinzo.ambulance_payment_attempt; cfg clinzo.marketplace_payment_config;
BEGIN
 PERFORM id FROM clinzo.ambulance_booking WHERE id=p_booking_id FOR UPDATE;
 details:=public.get_ambulance_billing(p_booking_id);
 IF NOT coalesce((details->>'can_pay')::boolean,false) OR details->>'quote_id' IS DISTINCT FROM p_quote_id::text THEN RAISE EXCEPTION 'Fare changed or payment is unavailable. Refresh first.' USING ERRCODE='PT409'; END IF;
 SELECT * INTO cfg FROM clinzo.marketplace_payment_config WHERE singleton;
 SELECT a.* INTO attempt FROM clinzo.ambulance_payment_attempt a JOIN clinzo.payment p ON p.id=a.payment_id WHERE p.booking_id=p_booking_id AND p.status NOT IN ('failed','cancelled');
 IF attempt.id IS NULL THEN
  SELECT * INTO q FROM clinzo.fare_quote WHERE id=p_quote_id;
  INSERT INTO clinzo.payment(booking_id,fare_quote_id,method,status,amount_minor,currency,reported_by,provider) VALUES(p_booking_id,q.id,'gateway','pending',q.total_minor,'INR',actor,'razorpay') RETURNING id INTO payment_key;
  INSERT INTO clinzo.ambulance_payment_attempt(payment_id,mode) VALUES(payment_key,cfg.mode) RETURNING * INTO attempt;
 END IF;
 RETURN to_jsonb(attempt)||jsonb_build_object('amount_minor',(details->>'amount_minor')::bigint);
END $$;
CREATE FUNCTION public.record_ambulance_cash(p_booking_id uuid,p_quote_id uuid,p_expected_amount bigint,p_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity(); details jsonb; result uuid;
BEGIN
 PERFORM id FROM clinzo.ambulance_booking WHERE id=p_booking_id FOR UPDATE;
 details:=public.get_ambulance_billing(p_booking_id);
 IF NOT coalesce((details->>'can_record_cash')::boolean,false) OR details->>'quote_id' IS DISTINCT FROM p_quote_id::text OR (details->>'amount_minor')::bigint IS DISTINCT FROM p_expected_amount OR length(btrim(coalesce(p_note,''))) NOT BETWEEN 2 AND 1000 THEN RAISE EXCEPTION 'Cash collection changed or is unavailable. Refresh first.' USING ERRCODE='PT409'; END IF;
 INSERT INTO clinzo.payment(booking_id,fare_quote_id,method,status,amount_minor,currency,reported_by,confirmed_by,confirmed_at) VALUES(p_booking_id,p_quote_id,'cash','confirmed',p_expected_amount,'INR',actor,actor,now()) RETURNING id INTO result;
 INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata) VALUES(actor,'identity','ambulance.cash_received','payment',result,gen_random_uuid(),'allowed',jsonb_build_object('note',btrim(p_note),'amount_minor',p_expected_amount));
 RETURN result;
END $$;

CREATE FUNCTION public.ambulance_provider_command(p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a clinzo.ambulance_payment_attempt; p clinzo.payment; entity jsonb:=p_data->'entity'; result jsonb;
BEGIN
 IF p_action='queue' THEN
  SELECT coalesce(jsonb_agg(x.id),'[]'::jsonb) INTO result FROM (SELECT b.booking_id AS id FROM clinzo.ambulance_payment_attempt a JOIN clinzo.payment b ON b.id=a.payment_id WHERE a.mode=p_data->>'mode' AND a.status NOT IN ('captured','failed') ORDER BY a.created_at LIMIT 10) x; RETURN result;
 END IF;
 IF p_action='work' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('amount_minor',p.amount_minor)),'[]'::jsonb) INTO result FROM clinzo.ambulance_payment_attempt a JOIN clinzo.payment p ON p.id=a.payment_id WHERE p.booking_id=(p_data->>'booking_id')::uuid; RETURN result;
 END IF;
 IF p_action='payment' THEN SELECT * INTO a FROM clinzo.ambulance_payment_attempt WHERE order_id=entity->>'order_id';
 ELSE SELECT * INTO a FROM clinzo.ambulance_payment_attempt WHERE id=(p_data->>'attempt_id')::uuid; END IF;
 IF a.id IS NULL THEN RETURN jsonb_build_object('managed',false); END IF;
 SELECT * INTO p FROM clinzo.payment WHERE id=a.payment_id;
 PERFORM id FROM clinzo.ambulance_booking WHERE id=p.booking_id FOR UPDATE;
 SELECT * INTO a FROM clinzo.ambulance_payment_attempt WHERE id=a.id FOR UPDATE;
 IF a.mode IS DISTINCT FROM p_data->>'mode' THEN RAISE EXCEPTION 'Ambulance payment environment mismatch' USING ERRCODE='22023'; END IF;
 CASE p_action
 WHEN 'claim_order' THEN
  IF a.claimed_at IS NOT NULL THEN RETURN NULL; END IF;
  UPDATE clinzo.ambulance_payment_attempt SET claimed_at=now() WHERE id=a.id;
  RETURN to_jsonb(a)||jsonb_build_object('amount_minor',p.amount_minor);
 WHEN 'order_ready' THEN
  IF entity->>'receipt' IS DISTINCT FROM a.id::text OR entity->>'currency' IS DISTINCT FROM 'INR' OR (entity->>'amount')::bigint IS DISTINCT FROM p.amount_minor OR coalesce(entity->>'id','') !~ '^order_[A-Za-z0-9]+$' OR (a.order_id IS NOT NULL AND a.order_id IS DISTINCT FROM entity->>'id') THEN RAISE EXCEPTION 'Ambulance order mismatch' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.ambulance_payment_attempt SET order_id=entity->>'id',status=CASE WHEN status IN ('authorized','captured') THEN status ELSE 'created' END WHERE id=a.id;
 WHEN 'order_uncertain' THEN UPDATE clinzo.ambulance_payment_attempt SET status='uncertain' WHERE id=a.id AND status='creating';
 WHEN 'payment' THEN
  IF entity->>'order_id' IS DISTINCT FROM a.order_id OR entity->>'currency' IS DISTINCT FROM 'INR' OR (entity->>'amount')::bigint IS DISTINCT FROM p.amount_minor OR coalesce(entity->>'id','') !~ '^pay_[A-Za-z0-9]+$' OR (a.status='captured' AND a.gateway_payment_id IS DISTINCT FROM entity->>'id') THEN RAISE EXCEPTION 'Ambulance payment mismatch' USING ERRCODE='22023'; END IF;
  IF entity->>'status' IN ('captured','refunded') AND coalesce((entity->>'captured')::boolean,false) THEN
   UPDATE clinzo.ambulance_payment_attempt SET status='captured',gateway_payment_id=entity->>'id' WHERE id=a.id;
   UPDATE clinzo.payment SET status='confirmed',provider='razorpay',provider_payment_id=entity->>'id',confirmed_at=coalesce(confirmed_at,now()) WHERE id=p.id;
   UPDATE clinzo.payout_entry SET refunded_minor=greatest(refunded_minor,coalesce((entity->>'amount_refunded')::bigint,0)),gateway_fees_minor=coalesce((entity->>'fee')::bigint,0),gateway_tax_minor=coalesce((entity->>'tax')::bigint,0) WHERE ambulance_payment_id=p.id;
  ELSIF a.status<>'captured' AND entity->>'status'='authorized' THEN UPDATE clinzo.ambulance_payment_attempt SET status='authorized',gateway_payment_id=entity->>'id' WHERE id=a.id;
  END IF;
 ELSE RAISE EXCEPTION 'Invalid ambulance provider operation' USING ERRCODE='22023';
 END CASE;
 RETURN jsonb_build_object('managed',true);
END $$;

REVOKE ALL ON FUNCTION clinzo.finance_identity(),clinzo.can_manage_appointment_practice_money(uuid,uuid),clinzo.can_read_payout(uuid,text,uuid),clinzo.snapshot_payout(),clinzo.payout_details(uuid),clinzo.guard_payout_refund(),clinzo.can_access_ambulance_money(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.has_company_finance_access(),public.list_payout_entries(uuid,uuid),public.get_company_payment_setup(),public.manage_company_payments(text,jsonb),public.get_ambulance_billing(uuid),public.prepare_ambulance_payment(uuid,uuid),public.record_ambulance_cash(uuid,uuid,bigint,text),public.payout_provider_command(text,jsonb),public.ambulance_provider_command(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_finance_access(),public.list_payout_entries(uuid,uuid),public.get_company_payment_setup(),public.manage_company_payments(text,jsonb),public.get_ambulance_billing(uuid),public.prepare_ambulance_payment(uuid,uuid),public.record_ambulance_cash(uuid,uuid,bigint,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payout_provider_command(text,jsonb),public.ambulance_provider_command(text,jsonb) TO service_role;


