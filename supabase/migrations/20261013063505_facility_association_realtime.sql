-- Broadcast only a change signal. The authorized RPC remains the source of request details.
CREATE FUNCTION public.can_receive_facility_association_events(p_topic text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinzo.facility f
    JOIN clinzo.organization o ON o.id=f.organization_id AND o.active
    JOIN clinzo.organization_member m ON m.organization_id=f.organization_id AND m.active
      AND (m.facility_id IS NULL OR m.facility_id=f.id)
      AND m.role IN ('owner','organization_admin','facility_admin')
    JOIN clinzo.identity i ON i.id=m.identity_id AND i.issuer='supabase'
      AND i.subject=auth.uid()::text AND i.disabled_at IS NULL
    JOIN auth.users u ON u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL
      AND (u.banned_until IS NULL OR u.banned_until<now())
    WHERE f.active AND p_topic='facility-associations:'||f.id::text
  );
$$;
REVOKE ALL ON FUNCTION public.can_receive_facility_association_events(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_receive_facility_association_events(text) TO authenticated;

-- realtime.messages already has RLS. Do not alter the managed table.
CREATE POLICY facility_association_broadcast_receive ON realtime.messages
  FOR SELECT TO authenticated USING (
    extension='broadcast' AND topic=(SELECT realtime.topic())
    AND public.can_receive_facility_association_events((SELECT realtime.topic()))
  );

CREATE FUNCTION clinzo.broadcast_facility_association_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.initiated_by IS NOT DISTINCT FROM OLD.initiated_by THEN RETURN NEW; END IF;
  PERFORM realtime.send(jsonb_build_object('request_id',NEW.id,'facility_id',NEW.facility_id),
    'doctor_association_changed','facility-associations:'||NEW.facility_id::text,true);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.broadcast_facility_association_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER facility_association_changed AFTER INSERT OR UPDATE ON clinzo.doctor_facility_request
  FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_facility_association_change();
