-- Disposable project only. Validates private token leasing and ticket/receipt states.
BEGIN;
DO $$
DECLARE
  recipient uuid; event_id uuid; intent_id uuid; endpoint_id uuid;
  encryption_key text; token text := 'ExpoPushToken[fixture1234567890]';
  batch jsonb; delivery_id uuid; receipts jsonb; denied boolean := false;
BEGIN
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES('fixture',gen_random_uuid()::text,'Push Fixture') RETURNING id INTO recipient;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,request_id,payload)
    VALUES('test.push','identity',recipient,1,gen_random_uuid(),'{}') RETURNING id INTO event_id;
  INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
    VALUES(recipient,event_id,'verification.verified',gen_random_uuid()::text,
      '{"status":"verified"}',now()+interval '1 day') RETURNING id INTO intent_id;
  SELECT decrypted_secret INTO encryption_key FROM vault.decrypted_secrets
    WHERE name='clinzo_expo_push_address_key';
  INSERT INTO clinzo.notification_endpoint(identity_id,channel,installation_id,address_ciphertext,address_digest,verified_at)
    VALUES(recipient,'push',gen_random_uuid(),extensions.pgp_sym_encrypt(token,encryption_key),
      sha256(convert_to(token,'UTF8')),now()) RETURNING id INTO endpoint_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.claim_expo_push_deliveries(1);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT denied THEN RAISE EXCEPTION 'Client could claim decrypted push token'; END IF;
  EXECUTE 'SET LOCAL ROLE service_role';
  SELECT public.claim_expo_push_deliveries(1) INTO batch;
  IF jsonb_array_length(batch)<>1 OR batch->0->>'token'<>token THEN
    RAISE EXCEPTION 'Trusted worker did not claim private token'; END IF;
  delivery_id:=(batch->0->>'delivery_id')::uuid;
  PERFORM public.resolve_expo_push_ticket(delivery_id,'fixture-ticket',NULL);
  EXECUTE 'RESET ROLE';
  UPDATE clinzo.notification_delivery SET next_attempt_at=now()-interval '1 second'
    WHERE id=delivery_id;
  EXECUTE 'SET LOCAL ROLE service_role';
  SELECT public.claim_expo_push_receipts(1) INTO receipts;
  IF jsonb_array_length(receipts)<>1 OR receipts->0->>'ticket_id'<>'fixture-ticket' THEN
    RAISE EXCEPTION 'Receipt was not claimed'; END IF;
  PERFORM public.resolve_expo_push_receipt(delivery_id,true,NULL);
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.notification_delivery
    WHERE id=delivery_id AND status='delivered' AND lease_until IS NULL) THEN
    RAISE EXCEPTION 'Delivery was not settled'; END IF;
END $$;
ROLLBACK;
SELECT true AS push_delivery_smoke_passed;
