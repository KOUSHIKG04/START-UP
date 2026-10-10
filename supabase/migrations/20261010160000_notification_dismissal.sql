-- Per-recipient inbox dismissal preserves append-only notification/delivery history.
ALTER TABLE clinzo.notification_read ADD COLUMN dismissed_at timestamptz;
CREATE FUNCTION public.dismiss_my_notification(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity();
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clinzo.notification_intent WHERE id=p_id AND recipient_id=actor)
 THEN RAISE EXCEPTION 'Notification not found' USING ERRCODE='42501'; END IF;
 INSERT INTO clinzo.notification_read(identity_id,intent_id,dismissed_at) VALUES(actor,p_id,now())
 ON CONFLICT(identity_id,intent_id) DO UPDATE SET dismissed_at=coalesce(clinzo.notification_read.dismissed_at,excluded.dismissed_at);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.dismiss_my_notification(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_my_notification(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_notifications() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_identity();
BEGIN
 RETURN coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
  SELECT i.id,i.created_at,i.template_key,i.safe_parameters,(r.read_at IS NOT NULL) AS is_read,
   (i.template_key IN ('appointment.requested','appointment.check_in')
     OR i.template_key LIKE 'verification.%') AS is_important,
   coalesce((i.template_key ~ '^(sos|emergency)\.' OR coalesce(e.event_type ~ '^(sos|emergency)\.',false)
    OR coalesce(i.safe_parameters->>'booking_type'='sos',false)
    OR (e.aggregate_type='ambulance_booking' AND EXISTS(SELECT 1 FROM clinzo.ambulance_booking b WHERE b.id=e.aggregate_id AND b.booking_type='sos'))
    OR (e.aggregate_type='trip' AND EXISTS(SELECT 1 FROM clinzo.trip t JOIN clinzo.ambulance_booking b ON b.id=t.booking_id WHERE t.id=e.aggregate_id AND b.booking_type='sos'))
   ),false) AS is_emergency
  FROM clinzo.notification_intent i
  LEFT JOIN clinzo.notification_read r ON r.intent_id=i.id AND r.identity_id=actor
  LEFT JOIN clinzo.domain_event e ON e.id=i.event_id
  WHERE i.recipient_id=actor AND i.expires_at>now() AND r.dismissed_at IS NULL
   AND NOT(i.template_key='appointment.requested' AND EXISTS(
    SELECT 1 FROM clinzo.domain_event requested JOIN clinzo.domain_event confirmed
     ON confirmed.aggregate_type='appointment' AND confirmed.aggregate_id=requested.aggregate_id
     AND confirmed.event_type='appointment.auto_confirmed'
    WHERE requested.id=i.event_id AND requested.event_type='appointment.requested'))
  ORDER BY i.created_at DESC LIMIT 100
 ) x),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_my_notifications() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_notifications() TO authenticated;
