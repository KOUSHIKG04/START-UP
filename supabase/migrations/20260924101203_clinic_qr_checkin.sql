-- Patients receive a short-lived opaque token. Only its hash is persisted.
CREATE FUNCTION public.issue_clinic_checkin_token(p_appointment_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); a clinzo.appointment; s clinzo.session;
  raw_token text := gen_random_uuid()::text || gen_random_uuid()::text;
BEGIN
  SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
  SELECT * INTO s FROM clinzo.session WHERE id=a.session_id;
  IF a.id IS NULL OR a.status <> 'confirmed' OR s.state NOT IN ('published','open')
    OR (now() AT TIME ZONE s.timezone)::date <> (s.starts_at AT TIME ZONE s.timezone)::date
    OR EXISTS(SELECT 1 FROM clinzo.appointment_checkin ac WHERE ac.appointment_id=a.id)
    OR NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
      WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor AND pa.relationship='self'
        AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL) THEN
    RAISE EXCEPTION 'Confirmed appointment on its clinic day required' USING ERRCODE='42501'; END IF;
  UPDATE clinzo.checkin_token SET revoked_at=now() WHERE appointment_id=a.id AND consumed_at IS NULL AND revoked_at IS NULL;
  INSERT INTO clinzo.checkin_token(appointment_id,token_hash,expires_at)
    VALUES(a.id,sha256(convert_to(raw_token,'UTF8')),now()+interval '5 minutes');
  RETURN raw_token;
END $$;

CREATE FUNCTION public.redeem_clinic_checkin_token(p_token text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); target uuid; token clinzo.checkin_token;
  a clinzo.appointment; s clinzo.session;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f-]{72}$' THEN
    RAISE EXCEPTION 'Invalid check-in token' USING ERRCODE='22023'; END IF;
  SELECT appointment_id INTO target FROM clinzo.checkin_token WHERE token_hash=sha256(convert_to(p_token,'UTF8'));
  IF target IS NULL THEN RAISE EXCEPTION 'Check-in token unavailable' USING ERRCODE='42501'; END IF;
  -- Use the same session/appointment lock order as manual check-in.
  SELECT s0.* INTO s FROM clinzo.session s0 JOIN clinzo.appointment a0 ON a0.session_id=s0.id
    WHERE a0.id=target FOR UPDATE OF s0;
  SELECT * INTO a FROM clinzo.appointment WHERE id=target FOR UPDATE;
  SELECT * INTO token FROM clinzo.checkin_token WHERE token_hash=sha256(convert_to(p_token,'UTF8')) FOR UPDATE;
  IF token.id IS NULL OR token.appointment_id IS DISTINCT FROM a.id OR token.consumed_at IS NOT NULL
    OR token.revoked_at IS NOT NULL OR token.expires_at<=now() OR a.status<>'confirmed'
    OR s.state NOT IN ('published','open')
    OR (now() AT TIME ZONE s.timezone)::date <> (s.starts_at AT TIME ZONE s.timezone)::date
    OR NOT clinzo.can_manage_practice(actor,s.doctor_facility_id)
    OR EXISTS(SELECT 1 FROM clinzo.appointment_checkin ac WHERE ac.appointment_id=a.id) THEN
    RAISE EXCEPTION 'Check-in token unavailable for this practice' USING ERRCODE='42501'; END IF;
  UPDATE clinzo.checkin_token SET consumed_at=now() WHERE id=token.id;
  INSERT INTO clinzo.appointment_checkin(appointment_id,token_id,checked_in_by,method)
    VALUES(a.id,token.id,actor,'qr');
  UPDATE clinzo.queue_entry SET state='waiting' WHERE appointment_id=a.id AND state='awaiting_arrival';
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment queue entry unavailable' USING ERRCODE='23514'; END IF;
  UPDATE clinzo.appointment SET updated_at=now() WHERE id=a.id;
  UPDATE clinzo.session_queue SET queue_version=queue_version+1 WHERE session_id=s.id;
  PERFORM clinzo.appointment_event(a.id,actor,'check_in');
  RETURN a.id;
END $$;

REVOKE ALL ON FUNCTION public.issue_clinic_checkin_token(uuid),public.redeem_clinic_checkin_token(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_clinic_checkin_token(uuid),public.redeem_clinic_checkin_token(text) TO authenticated;
