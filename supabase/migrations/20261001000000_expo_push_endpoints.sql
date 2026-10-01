-- Push addresses are private. Clients can only register/revoke their own installation.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE clinzo.notification_endpoint ADD COLUMN installation_id uuid;
CREATE UNIQUE INDEX notification_endpoint_push_installation_uq
  ON clinzo.notification_endpoint(identity_id, installation_id)
  WHERE channel = 'push' AND revoked_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'clinzo_expo_push_address_key') THEN
    PERFORM vault.create_secret(gen_random_uuid()::text || gen_random_uuid()::text,
      'clinzo_expo_push_address_key', 'Encrypt Expo push addresses');
  END IF;
END $$;

CREATE FUNCTION public.register_my_expo_push_token(p_installation_id uuid, p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := clinzo.require_identity();
  encryption_key text;
  token_digest bytea;
  endpoint_id uuid;
BEGIN
  IF p_installation_id IS NULL OR p_token IS NULL OR
     p_token !~ '^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,}\]$' OR
     length(p_token) > 255 THEN
    RAISE EXCEPTION 'Invalid Expo push token' USING ERRCODE = '22023';
  END IF;
  SELECT decrypted_secret INTO encryption_key FROM vault.decrypted_secrets
    WHERE name = 'clinzo_expo_push_address_key';
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Push encryption key unavailable' USING ERRCODE = '55000';
  END IF;
  token_digest := sha256(convert_to(p_token, 'UTF8'));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_installation_id::text, 0));
  UPDATE clinzo.notification_endpoint SET revoked_at = now(), updated_at = now(), row_version = row_version + 1
    WHERE identity_id = actor AND channel = 'push' AND installation_id = p_installation_id
      AND revoked_at IS NULL AND address_digest <> token_digest;
  INSERT INTO clinzo.notification_endpoint
    (identity_id, channel, installation_id, address_ciphertext, address_digest, verified_at)
    VALUES (actor, 'push', p_installation_id,
      extensions.pgp_sym_encrypt(p_token, encryption_key), token_digest, now())
    ON CONFLICT (identity_id, channel, address_digest) DO UPDATE
      SET installation_id = EXCLUDED.installation_id,
          address_ciphertext = EXCLUDED.address_ciphertext,
          verified_at = now(), revoked_at = NULL,
          updated_at = now(), row_version = clinzo.notification_endpoint.row_version + 1
    RETURNING id INTO endpoint_id;
  RETURN endpoint_id;
END $$;

CREATE FUNCTION public.revoke_my_expo_push_token(p_installation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF p_installation_id IS NULL THEN
    RAISE EXCEPTION 'Installation is required' USING ERRCODE = '22023';
  END IF;
  UPDATE clinzo.notification_endpoint SET revoked_at = now(), updated_at = now(), row_version = row_version + 1
    WHERE identity_id = actor AND channel = 'push' AND installation_id = p_installation_id
      AND revoked_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION public.register_my_expo_push_token(uuid,text),
  public.revoke_my_expo_push_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_my_expo_push_token(uuid,text),
  public.revoke_my_expo_push_token(uuid) TO authenticated;
