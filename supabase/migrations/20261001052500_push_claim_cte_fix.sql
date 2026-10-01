-- PostgreSQL requires data-modifying CTEs at statement top level.
CREATE OR REPLACE FUNCTION public.claim_expo_push_deliveries(p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE encryption_key text; result jsonb;
BEGIN
  IF p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023'; END IF;
  SELECT decrypted_secret INTO encryption_key FROM vault.decrypted_secrets
    WHERE name='clinzo_expo_push_address_key';
  IF encryption_key IS NULL THEN RAISE EXCEPTION 'Push encryption key unavailable' USING ERRCODE='55000'; END IF;
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

  WITH candidates AS (
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
      'template_key',i.template_key,'safe_parameters',i.safe_parameters)) INTO result
    FROM claimed c JOIN clinzo.notification_intent i ON i.id=c.intent_id
    JOIN clinzo.notification_endpoint e ON e.id=c.endpoint_id;
  RETURN coalesce(result,'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.claim_expo_push_receipts(p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023'; END IF;
  WITH candidates AS (
    SELECT id FROM clinzo.notification_delivery
    WHERE status='sent' AND provider_message_id IS NOT NULL
      AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now())
    ORDER BY next_attempt_at LIMIT p_limit FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE clinzo.notification_delivery d SET lease_until=now()+interval '5 minutes'
    FROM candidates c WHERE d.id=c.id RETURNING d.id,d.provider_message_id
  ) SELECT jsonb_agg(jsonb_build_object('delivery_id',id,'ticket_id',provider_message_id))
    INTO result FROM claimed;
  RETURN coalesce(result,'[]'::jsonb);
END $$;
