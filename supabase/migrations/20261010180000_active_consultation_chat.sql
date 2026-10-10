CREATE OR REPLACE FUNCTION public.send_online_message(p_appointment_id uuid,p_client_nonce uuid,p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; message_id uuid; context jsonb;
BEGIN
  IF p_appointment_id IS NULL OR p_client_nonce IS NULL OR length(trim(coalesce(p_body,''))) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE='22023'; END IF;
  context:=public.get_online_join_context(p_appointment_id);
  IF context IS NULL THEN RAISE EXCEPTION 'Active online appointment access required' USING ERRCODE='42501'; END IF;
  -- Serialize message writes with appointment completion/cancellation.
  PERFORM 1 FROM clinzo.appointment WHERE id=p_appointment_id AND status='in_consultation' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chat is available only during an active consultation' USING ERRCODE='42501'; END IF;
  SELECT i.id INTO actor FROM clinzo.identity i
    WHERE i.issuer='supabase' AND i.subject=(SELECT auth.uid())::text AND i.disabled_at IS NULL;
  INSERT INTO public.online_message(appointment_id,sender_id,client_nonce,body)
    VALUES(p_appointment_id,actor,p_client_nonce,trim(p_body))
    ON CONFLICT(appointment_id,sender_id,client_nonce) DO NOTHING RETURNING id INTO message_id;
  IF message_id IS NULL THEN SELECT id INTO message_id FROM public.online_message
    WHERE appointment_id=p_appointment_id AND sender_id=actor AND client_nonce=p_client_nonce; END IF;
  RETURN message_id;
END $$;
REVOKE ALL ON FUNCTION public.send_online_message(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_online_message(uuid,uuid,text) TO authenticated;

