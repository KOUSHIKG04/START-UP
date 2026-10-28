-- Disambiguate SQL aliases from the existing a/p PL/pgSQL record variables.
-- Keep the function signature, security boundary and existing grants unchanged.
CREATE OR REPLACE FUNCTION public.ambulance_provider_command(p_action text,p_data jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a clinzo.ambulance_payment_attempt; p clinzo.payment; entity jsonb:=p_data->'entity'; result jsonb;
BEGIN
 IF p_action='queue' THEN
  SELECT coalesce(jsonb_agg(x.id),'[]'::jsonb) INTO result FROM (SELECT payment.booking_id AS id FROM clinzo.ambulance_payment_attempt AS attempt JOIN clinzo.payment AS payment ON payment.id=attempt.payment_id WHERE attempt.mode=p_data->>'mode' AND attempt.status NOT IN ('captured','failed') ORDER BY attempt.created_at LIMIT 10) x; RETURN result;
 END IF;
 IF p_action='work' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(attempt)||jsonb_build_object('amount_minor',payment.amount_minor)),'[]'::jsonb) INTO result FROM clinzo.ambulance_payment_attempt AS attempt JOIN clinzo.payment AS payment ON payment.id=attempt.payment_id WHERE payment.booking_id=(p_data->>'booking_id')::uuid; RETURN result;
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
