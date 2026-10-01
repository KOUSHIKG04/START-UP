-- Trusted worker API. Only service_role may claim decrypted push addresses.
CREATE FUNCTION public.claim_expo_push_deliveries(p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE encryption_key text;
BEGIN
  IF p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023';
  END IF;
  SELECT decrypted_secret INTO encryption_key FROM vault.decrypted_secrets
    WHERE name='clinzo_expo_push_address_key';
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Push encryption key unavailable' USING ERRCODE='55000';
  END IF;
  INSERT INTO clinzo.notification_delivery(intent_id,endpoint_id,status)
    SELECT i.id,e.id,'pending'
    FROM clinzo.notification_intent i
    JOIN clinzo.notification_endpoint e ON e.identity_id=i.recipient_id
      AND e.channel='push' AND e.revoked_at IS NULL AND e.verified_at IS NOT NULL
    WHERE i.expires_at>now() AND NOT EXISTS (
      SELECT 1 FROM clinzo.notification_delivery d
      WHERE d.intent_id=i.id AND d.endpoint_id=e.id)
    ORDER BY i.created_at LIMIT 500
    ON CONFLICT (intent_id,endpoint_id) DO NOTHING;
  RETURN coalesce((WITH candidates AS (
    SELECT d.id FROM clinzo.notification_delivery d
    JOIN clinzo.notification_intent i ON i.id=d.intent_id
    JOIN clinzo.notification_endpoint e ON e.id=d.endpoint_id
    WHERE i.expires_at>now() AND e.revoked_at IS NULL AND d.attempts<5
      AND ((d.status='pending' AND d.next_attempt_at<=now()) OR
           (d.status='leased' AND d.lease_until<now()))
    ORDER BY d.next_attempt_at,d.created_at LIMIT p_limit FOR UPDATE OF d SKIP LOCKED
  ), claimed AS (
    UPDATE clinzo.notification_delivery d SET status='leased',
      attempts=d.attempts+1, lease_until=now()+interval '5 minutes'
    FROM candidates c WHERE d.id=c.id RETURNING d.id,d.intent_id,d.endpoint_id
  ) SELECT jsonb_agg(jsonb_build_object('delivery_id',c.id,
      'token',extensions.pgp_sym_decrypt(e.address_ciphertext,encryption_key),
      'template_key',i.template_key,'safe_parameters',i.safe_parameters))
    FROM claimed c JOIN clinzo.notification_intent i ON i.id=c.intent_id
    JOIN clinzo.notification_endpoint e ON e.id=c.endpoint_id), '[]'::jsonb);
END $$;

CREATE FUNCTION public.resolve_expo_push_ticket(p_delivery_id uuid,p_ticket_id text,
  p_error_code text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE d clinzo.notification_delivery;
BEGIN
  SELECT * INTO d FROM clinzo.notification_delivery WHERE id=p_delivery_id FOR UPDATE;
  IF d.id IS NULL OR d.status<>'leased' THEN
    RAISE EXCEPTION 'Delivery not leased' USING ERRCODE='22023';
  END IF;
  IF p_ticket_id IS NOT NULL AND length(p_ticket_id) BETWEEN 1 AND 128 THEN
    UPDATE clinzo.notification_delivery SET status='sent',provider_message_id=p_ticket_id,
      next_attempt_at=now()+interval '15 minutes',lease_until=NULL,last_error_code=NULL
      WHERE id=p_delivery_id;
  ELSE
    UPDATE clinzo.notification_delivery SET
      status=CASE WHEN attempts>=5 OR p_error_code='DeviceNotRegistered' THEN 'failed' ELSE 'pending' END,
      next_attempt_at=now()+make_interval(mins=>LEAST(60,5*attempts)),lease_until=NULL,
      last_error_code=left(coalesce(p_error_code,'PushSendFailed'),80)
      WHERE id=p_delivery_id;
    IF p_error_code='DeviceNotRegistered' THEN
      UPDATE clinzo.notification_endpoint SET revoked_at=now()
        WHERE id=d.endpoint_id AND revoked_at IS NULL;
    END IF;
  END IF;
END $$;

CREATE FUNCTION public.claim_expo_push_receipts(p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023'; END IF;
  RETURN coalesce((WITH candidates AS (
    SELECT id FROM clinzo.notification_delivery
    WHERE status='sent' AND provider_message_id IS NOT NULL
      AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now())
    ORDER BY next_attempt_at LIMIT p_limit FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE clinzo.notification_delivery d SET lease_until=now()+interval '5 minutes'
    FROM candidates c WHERE d.id=c.id RETURNING d.id,d.provider_message_id
  ) SELECT jsonb_agg(jsonb_build_object('delivery_id',id,'ticket_id',provider_message_id))
    FROM claimed), '[]'::jsonb);
END $$;

CREATE FUNCTION public.resolve_expo_push_receipt(p_delivery_id uuid,p_delivered boolean,
  p_error_code text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE d clinzo.notification_delivery;
BEGIN
  SELECT * INTO d FROM clinzo.notification_delivery WHERE id=p_delivery_id FOR UPDATE;
  IF d.id IS NULL OR d.status<>'sent' OR d.lease_until IS NULL THEN
    RAISE EXCEPTION 'Receipt not leased' USING ERRCODE='22023'; END IF;
  IF p_delivered THEN
    UPDATE clinzo.notification_delivery SET status='delivered',lease_until=NULL,last_error_code=NULL
      WHERE id=p_delivery_id;
  ELSIF p_error_code IS NOT NULL THEN
    UPDATE clinzo.notification_delivery SET status='failed',lease_until=NULL,
      last_error_code=left(p_error_code,80) WHERE id=p_delivery_id;
    IF p_error_code='DeviceNotRegistered' THEN
      UPDATE clinzo.notification_endpoint SET revoked_at=now()
        WHERE id=d.endpoint_id AND revoked_at IS NULL;
    END IF;
  ELSE
    UPDATE clinzo.notification_delivery SET lease_until=NULL,
      next_attempt_at=now()+interval '5 minutes' WHERE id=p_delivery_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.claim_expo_push_deliveries(integer),
  public.resolve_expo_push_ticket(uuid,text,text),
  public.claim_expo_push_receipts(integer),
  public.resolve_expo_push_receipt(uuid,boolean,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expo_push_deliveries(integer),
  public.resolve_expo_push_ticket(uuid,text,text),
  public.claim_expo_push_receipts(integer),
  public.resolve_expo_push_receipt(uuid,boolean,text) TO service_role;
