-- In-app read state belongs to an identity and never changes the delivery intent.
CREATE TABLE clinzo.notification_read (
  identity_id uuid NOT NULL REFERENCES clinzo.identity(id) ON DELETE RESTRICT,
  intent_id uuid NOT NULL REFERENCES clinzo.notification_intent(id) ON DELETE RESTRICT,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (identity_id, intent_id)
);
CREATE INDEX notification_read_intent_id_idx ON clinzo.notification_read(intent_id);
ALTER TABLE clinzo.notification_read ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.notification_read FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.list_my_notifications() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
    SELECT i.id, i.created_at, i.template_key, i.safe_parameters,
      (r.read_at IS NOT NULL) AS is_read
    FROM clinzo.notification_intent i
    LEFT JOIN clinzo.notification_read r ON r.intent_id=i.id AND r.identity_id=actor
    WHERE i.recipient_id=actor AND i.expires_at>now()
    ORDER BY i.created_at DESC LIMIT 100
  ) x), '[]'::jsonb);
END $$;

CREATE FUNCTION public.mark_my_notifications_read(p_ids uuid[] DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); affected integer;
BEGIN
  IF p_ids IS NOT NULL AND cardinality(p_ids)>100 THEN
    RAISE EXCEPTION 'Too many notification IDs' USING ERRCODE='22023';
  END IF;
  INSERT INTO clinzo.notification_read(identity_id,intent_id)
    SELECT actor,i.id FROM clinzo.notification_intent i
    WHERE i.recipient_id=actor AND i.expires_at>now()
      AND (p_ids IS NULL OR i.id=ANY(p_ids))
    ORDER BY i.created_at DESC LIMIT 100
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

REVOKE ALL ON FUNCTION public.list_my_notifications(),
  public.mark_my_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_notifications(),
  public.mark_my_notifications_read(uuid[]) TO authenticated;
