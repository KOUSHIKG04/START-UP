-- Online appointments reuse the established session, slot, booking and review
-- lifecycle. The service code distinguishes media visits from clinic visits.
CREATE FUNCTION clinzo.reject_overlapping_doctor_session() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_id=NEW.doctor_id
    AND s.state IN ('published','open') AND s.starts_at<NEW.ends_at AND s.ends_at>NEW.starts_at) THEN
    RAISE EXCEPTION 'Doctor already has a published session in this time range' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reject_overlapping_doctor_session BEFORE INSERT ON clinzo.session
  FOR EACH ROW EXECUTE FUNCTION clinzo.reject_overlapping_doctor_session();

CREATE FUNCTION public.publish_online_session(
  p_practice_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,
  p_slot_minutes integer,p_fee_minor bigint,p_currency text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid; online_limit integer; slot_count integer;
BEGIN
  SELECT s.online_daily_limit INTO online_limit FROM clinzo.doctor_schedule_preferences s
    WHERE s.doctor_facility_id=p_practice_id;
  IF coalesce(online_limit,0)<1 THEN
    RAISE EXCEPTION 'Enable online slots in your saved schedule first' USING ERRCODE='22023';
  END IF;
  IF p_starts_at IS NULL OR p_ends_at IS NULL OR p_slot_minutes IS NULL OR p_slot_minutes<1 THEN
    RAISE EXCEPTION 'Invalid online session' USING ERRCODE='22023'; END IF;
  slot_count:=extract(epoch FROM p_ends_at-p_starts_at)::integer/(p_slot_minutes*60);
  IF slot_count<1 OR slot_count>online_limit OR EXISTS(
    SELECT 1 FROM clinzo.session WHERE doctor_facility_id=p_practice_id AND starts_at=p_starts_at
  ) THEN RAISE EXCEPTION 'Online slot limit exceeded or session already exists' USING ERRCODE='22023'; END IF;
  sid:=public.publish_clinic_session(p_practice_id,p_starts_at,p_ends_at,p_slot_minutes,p_fee_minor,p_currency);
  UPDATE clinzo.practice_service ps SET code='online-'||sid::text,name='Video consultation'
    FROM clinzo.session_service ss WHERE ss.session_id=sid AND ss.practice_service_id=ps.id;
  RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.publish_online_session(uuid,timestamptz,timestamptz,integer,bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_online_session(uuid,timestamptz,timestamptz,integer,bigint,text) TO authenticated;

-- The existing atomic booking RPC owns capacity, idempotency and auto-approval.
-- Derive the visit mode on insertion so callers cannot mislabel online bookings.
CREATE FUNCTION clinzo.set_appointment_online_mode() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM clinzo.practice_service ps
      WHERE ps.id=NEW.practice_service_id AND ps.code LIKE 'online-%') THEN
    NEW.visit_mode:='online';
  ELSIF NEW.visit_mode='online' THEN
    RAISE EXCEPTION 'Online appointment requires an online service' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER set_appointment_online_mode BEFORE INSERT OR UPDATE OF practice_service_id,visit_mode
  ON clinzo.appointment FOR EACH ROW EXECUTE FUNCTION clinzo.set_appointment_online_mode();

-- Keep the existing appointment projection and authorization rules, adding
-- only the mode needed by the patient and doctor filters.
CREATE FUNCTION public.list_care_appointments(p_practice_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(items.value || jsonb_build_object('visit_mode',a.visit_mode)
    ORDER BY items.ordinality),'[]'::jsonb)
  FROM jsonb_array_elements(public.list_clinic_appointments(p_practice_id)) WITH ORDINALITY items(value,ordinality)
  JOIN clinzo.appointment a ON a.id=(items.value->>'id')::uuid;
$$;
REVOKE ALL ON FUNCTION public.list_care_appointments(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_care_appointments(uuid) TO authenticated;

CREATE FUNCTION public.start_online_appointment(p_appointment_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); a clinzo.appointment; doctor_id uuid; starts_at timestamptz; ends_at timestamptz;
BEGIN
  SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
  SELECT s.doctor_id,w.starts_at,w.ends_at INTO doctor_id,starts_at,ends_at
    FROM clinzo.session s JOIN clinzo.appointment_window w ON w.session_id=s.id AND w.id=a.window_id
    WHERE s.id=a.session_id;
  IF a.id IS NULL OR a.visit_mode<>'online' OR NOT EXISTS(SELECT 1 FROM clinzo.doctor d
      WHERE d.id=doctor_id AND d.identity_id=actor AND d.active AND d.credential_status='verified') THEN
    RAISE EXCEPTION 'Verified appointment doctor required' USING ERRCODE='42501'; END IF;
  IF a.status='in_consultation' THEN RETURN a.id; END IF;
  IF a.status<>'confirmed' OR now()<starts_at-interval '15 minutes' OR now()>ends_at+interval '1 hour' THEN
    RAISE EXCEPTION 'Online consultation is not ready' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.consultation(appointment_id,patient_id,doctor_id,status,started_at)
    VALUES(a.id,a.patient_id,doctor_id,'active',now());
  UPDATE clinzo.appointment SET status='in_consultation' WHERE id=a.id;
  PERFORM clinzo.appointment_event(a.id,actor,'start');
  RETURN a.id;
END $$;
REVOKE ALL ON FUNCTION public.start_online_appointment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_online_appointment(uuid) TO authenticated;

CREATE FUNCTION public.complete_online_appointment(p_appointment_id uuid,p_assessment text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_care_actor(); a clinzo.appointment; doctor_id uuid; consultation_id uuid;
BEGIN
  IF length(trim(coalesce(p_assessment,''))) NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Signed assessment required' USING ERRCODE='22023'; END IF;
  SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
  SELECT s.doctor_id INTO doctor_id FROM clinzo.session s WHERE s.id=a.session_id;
  IF a.id IS NULL OR a.visit_mode<>'online' OR a.status<>'in_consultation'
    OR NOT EXISTS(SELECT 1 FROM clinzo.doctor d WHERE d.id=doctor_id AND d.identity_id=actor
      AND d.active AND d.credential_status='verified') THEN
    RAISE EXCEPTION 'Active online consultation doctor required' USING ERRCODE='42501'; END IF;
  SELECT id INTO consultation_id FROM clinzo.consultation WHERE appointment_id=a.id AND status='active' FOR UPDATE;
  IF consultation_id IS NULL THEN RAISE EXCEPTION 'Active consultation missing' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.clinical_note(consultation_id,author_id,kind,body,signed_at)
    VALUES(consultation_id,actor,'assessment',trim(p_assessment),now());
  UPDATE clinzo.consultation SET status='signed',ended_at=now(),signed_at=now() WHERE id=consultation_id;
  UPDATE clinzo.appointment SET status='completed' WHERE id=a.id;
  PERFORM clinzo.appointment_event(a.id,actor,'complete');
  RETURN a.id;
END $$;
REVOKE ALL ON FUNCTION public.complete_online_appointment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_online_appointment(uuid,text) TO authenticated;

-- A narrowly scoped endpoint returns only the authenticated participant's role.
-- It is also used by the server-side media-token issuer.
CREATE FUNCTION public.get_online_join_context(p_appointment_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; a clinzo.appointment; doctor_identity uuid; starts_at timestamptz; ends_at timestamptz; participant_role text;
BEGIN
  SELECT i.id INTO actor FROM clinzo.identity i
    WHERE i.issuer='supabase' AND i.subject=(SELECT auth.uid())::text AND i.disabled_at IS NULL;
  IF actor IS NULL OR p_appointment_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id;
  SELECT w.starts_at,w.ends_at,d.identity_id INTO starts_at,ends_at,doctor_identity
    FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    JOIN clinzo.doctor d ON d.id=s.doctor_id WHERE w.id=a.window_id;
  IF a.id IS NULL OR a.visit_mode<>'online' OR a.status NOT IN ('confirmed','in_consultation')
    OR now()<starts_at-interval '15 minutes' OR now()>ends_at+interval '1 hour' THEN RETURN NULL; END IF;
  IF doctor_identity=actor THEN participant_role:='doctor';
  ELSIF EXISTS(SELECT 1 FROM clinzo.patient_access pa WHERE pa.patient_id=a.patient_id
    AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL)
    THEN participant_role:='patient';
  ELSE RETURN NULL; END IF;
  RETURN jsonb_build_object('appointment_id',a.id,'room_name','clinzo-online-'||a.id::text,
    'role',participant_role,'starts_at',starts_at,'ends_at',ends_at);
END $$;
REVOKE ALL ON FUNCTION public.get_online_join_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_online_join_context(uuid) TO authenticated;

CREATE FUNCTION public.can_read_online_visit(p_appointment_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(
    SELECT 1 FROM clinzo.appointment a
    JOIN clinzo.session s ON s.id=a.session_id
    JOIN clinzo.doctor d ON d.id=s.doctor_id
    JOIN clinzo.appointment_window w ON w.id=a.window_id
    JOIN clinzo.identity i ON i.issuer='supabase' AND i.subject=(SELECT auth.uid())::text AND i.disabled_at IS NULL
    WHERE a.id=p_appointment_id AND a.visit_mode='online'
      AND a.status IN ('confirmed','in_consultation','completed')
      AND now()<w.ends_at+interval '30 days'
      AND (d.identity_id=i.id OR EXISTS(SELECT 1 FROM clinzo.patient_access pa
        WHERE pa.patient_id=a.patient_id AND pa.identity_id=i.id
          AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL))
  );
$$;
REVOKE ALL ON FUNCTION public.can_read_online_visit(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_online_visit(uuid) TO authenticated;

CREATE TABLE public.online_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES clinzo.appointment(id) ON DELETE RESTRICT,
  sender_id uuid NOT NULL REFERENCES clinzo.identity(id) ON DELETE RESTRICT,
  client_nonce uuid NOT NULL,
  body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(appointment_id,sender_id,client_nonce)
);
CREATE INDEX online_message_thread_idx ON public.online_message(appointment_id,created_at,id);
ALTER TABLE public.online_message ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.online_message FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.online_message TO authenticated;
CREATE POLICY online_message_participant_read ON public.online_message FOR SELECT TO authenticated
  USING(public.can_read_online_visit(appointment_id));

CREATE FUNCTION public.send_online_message(p_appointment_id uuid,p_client_nonce uuid,p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; message_id uuid; context jsonb;
BEGIN
  IF p_appointment_id IS NULL OR p_client_nonce IS NULL OR length(trim(coalesce(p_body,''))) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Invalid message' USING ERRCODE='22023'; END IF;
  context:=public.get_online_join_context(p_appointment_id);
  IF context IS NULL THEN RAISE EXCEPTION 'Active online appointment access required' USING ERRCODE='42501'; END IF;
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

CREATE FUNCTION public.list_online_messages(p_appointment_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.can_read_online_visit(p_appointment_id) THEN
    RAISE EXCEPTION 'Online appointment access required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x.created_at,x.id) FROM (
    SELECT recent.* FROM (
      SELECT m.id,m.appointment_id,m.sender_id,m.body,m.created_at FROM public.online_message m
        WHERE m.appointment_id=p_appointment_id ORDER BY m.created_at DESC,m.id DESC LIMIT 200
    ) recent
  ) x),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_online_messages(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_online_messages(uuid) TO authenticated;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.online_message;
  END IF;
END $$;
