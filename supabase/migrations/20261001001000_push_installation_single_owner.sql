-- One installed app can receive private notifications for only its current user.
DROP INDEX clinzo.notification_endpoint_push_installation_uq;
CREATE UNIQUE INDEX notification_endpoint_push_installation_uq
  ON clinzo.notification_endpoint(installation_id)
  WHERE channel = 'push' AND revoked_at IS NULL;

CREATE FUNCTION clinzo.revoke_previous_push_installation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.channel = 'push' AND NEW.installation_id IS NOT NULL AND NEW.revoked_at IS NULL THEN
    UPDATE clinzo.notification_endpoint
      SET revoked_at = now(), updated_at = now(), row_version = row_version + 1
      WHERE installation_id = NEW.installation_id AND channel = 'push'
        AND revoked_at IS NULL AND id <> NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER revoke_previous_push_installation
  BEFORE INSERT ON clinzo.notification_endpoint FOR EACH ROW
  EXECUTE FUNCTION clinzo.revoke_previous_push_installation();
REVOKE ALL ON FUNCTION clinzo.revoke_previous_push_installation()
  FROM PUBLIC, anon, authenticated, service_role;
