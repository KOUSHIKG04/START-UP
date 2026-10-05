-- A session groups multiple time windows. Prevent duplicate bookings of one
-- window, while allowing the same patient to book a different window.
DROP INDEX clinzo.appointment_active_uq_1;
CREATE UNIQUE INDEX appointment_active_uq_1 ON clinzo.appointment(patient_id,window_id)
  WHERE status IN ('pending','confirmed','in_consultation','completed','no_show');

CREATE OR REPLACE FUNCTION public.book_clinic_appointment(p_patient_id uuid,p_window_id uuid,p_practice_service_id uuid,
  p_reason text,p_idempotency_key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); s clinzo.session; w clinzo.appointment_window; ps clinzo.practice_service;
  d clinzo.doctor; f clinzo.facility; a_id uuid; old_id uuid; record clinzo.idempotency_record; fingerprint bytea; queue_row clinzo.session_queue;
BEGIN
  IF p_patient_id IS NULL OR p_window_id IS NULL OR p_practice_service_id IS NULL OR p_idempotency_key IS NULL
    OR p_reason IS NULL OR length(trim(p_reason)) > 1000 THEN RAISE EXCEPTION 'Invalid booking request' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    WHERE pa.patient_id=p_patient_id AND pa.identity_id=actor AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL) THEN
    RAISE EXCEPTION 'Patient access required' USING ERRCODE='42501'; END IF;
  fingerprint := sha256(convert_to(jsonb_build_array(p_patient_id,p_window_id,p_practice_service_id,trim(p_reason))::text,'UTF8'));
  SELECT * INTO record FROM clinzo.idempotency_record WHERE principal_scope=actor::text AND operation='clinic.book' AND key=p_idempotency_key::text;
  IF record.id IS NOT NULL THEN
    IF record.request_hash <> fingerprint THEN RAISE EXCEPTION 'Request key already used with different details' USING ERRCODE='22023'; END IF;
    RETURN record.resource_id;
  END IF;
  SELECT s0.* INTO s FROM clinzo.session s0 JOIN clinzo.appointment_window w0 ON w0.session_id=s0.id WHERE w0.id=p_window_id FOR UPDATE OF s0;
  SELECT * INTO w FROM clinzo.appointment_window WHERE id=p_window_id FOR UPDATE;
  SELECT ps0.* INTO ps FROM clinzo.practice_service ps0 JOIN clinzo.session_service ss ON ss.practice_service_id=ps0.id
    WHERE ps0.id=p_practice_service_id AND ss.session_id=s.id AND ps0.active;
  SELECT * INTO d FROM clinzo.doctor WHERE id=s.doctor_id;
  SELECT f0.* INTO f FROM clinzo.facility f0 JOIN clinzo.doctor_facility p ON p.facility_id=f0.id
    JOIN clinzo.organization o ON o.id=f0.organization_id WHERE p.id=s.doctor_facility_id AND p.active AND o.active;
  IF s.id IS NULL OR ps.id IS NULL OR f.id IS NULL OR NOT f.active OR NOT d.active OR d.credential_status<>'verified'
    OR s.state NOT IN ('published','open') OR w.state<>'open' OR w.starts_at<=now() THEN
    RAISE EXCEPTION 'Slot no longer available' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=d.id AND e.state='active'
    AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=s.doctor_facility_id) AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at) THEN
    RAISE EXCEPTION 'Doctor unavailable for this slot' USING ERRCODE='22023'; END IF;
  FOR old_id IN UPDATE clinzo.appointment SET status='rejected',decision_reason='Request expired',decision_by=NULL
    WHERE session_id=s.id AND status='pending' AND request_expires_at<=now() RETURNING id LOOP
    PERFORM clinzo.appointment_event(old_id,NULL,'expired');
  END LOOP;
  IF EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.patient_id=p_patient_id AND a.window_id=w.id
    AND a.status IN ('pending','confirmed','in_consultation','completed','no_show')) THEN
    RAISE EXCEPTION 'You already booked this time' USING ERRCODE='23505'; END IF;
  IF (SELECT count(*) FROM clinzo.appointment a WHERE a.session_id=s.id AND
    ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR a.status='pending')) >= s.hard_capacity
    OR (SELECT count(*) FROM clinzo.appointment a WHERE a.window_id=w.id AND
    ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR a.status='pending')) >= w.hard_capacity THEN
    RAISE EXCEPTION 'Slot is full; choose another time' USING ERRCODE='23514'; END IF;
  INSERT INTO clinzo.appointment(public_code,patient_id,session_id,window_id,practice_service_id,source,status,requested_by,
    request_expires_at,fee_minor,currency,doctor_name_snapshot,facility_name_snapshot,facility_address_snapshot,
    service_name_snapshot,doctor_registration_snapshot,reason,visit_mode)
    VALUES('APT-'||gen_random_uuid()::text,p_patient_id,s.id,w.id,ps.id,'patient_online','pending',actor,
    least(w.starts_at,now()+interval '24 hours'),ps.fee_minor,ps.currency,d.full_name,f.name,f.address,ps.name,d.registration_number,nullif(trim(p_reason),''),'clinic')
    RETURNING id INTO a_id;
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'clinic.book',p_idempotency_key::text,fingerprint,'appointment',a_id,'created',now()+interval '30 days');
  IF s.auto_confirm_limit IS NOT NULL AND s.auto_confirm_limit > 0
    AND (SELECT count(*) FROM clinzo.appointment counted WHERE counted.session_id=s.id
      AND counted.confirmed_at IS NOT NULL AND counted.capacity_released_at IS NULL) < s.auto_confirm_limit THEN
    UPDATE clinzo.appointment SET status='confirmed',confirmed_at=now() WHERE id=a_id;
    INSERT INTO clinzo.session_queue(session_id) VALUES(s.id) ON CONFLICT(session_id) DO NOTHING;
    SELECT * INTO queue_row FROM clinzo.session_queue WHERE session_id=s.id FOR UPDATE;
    INSERT INTO clinzo.queue_entry(queue_id,appointment_id,ticket_number,state,order_key)
      VALUES(queue_row.id,a_id,queue_row.next_ticket,'awaiting_arrival',extract(epoch FROM w.starts_at)::bigint);
    UPDATE clinzo.session_queue SET next_ticket=next_ticket+1,queue_version=queue_version+1 WHERE id=queue_row.id;
    PERFORM clinzo.appointment_event(a_id,NULL,'auto_confirmed');
  ELSE
    PERFORM clinzo.appointment_event(a_id,actor,'requested');
  END IF;
  RETURN a_id;
END $$;

-- Auto-confirmed bookings still notify the doctor and scoped facility team,
-- but they must never receive a pending-request notification for that booking.
CREATE OR REPLACE FUNCTION clinzo.notify_appointment_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE appointment_row clinzo.appointment; practice_id uuid; doctor_identity uuid;
BEGIN
  IF NEW.aggregate_type <> 'appointment' OR NEW.event_type NOT IN (
    'appointment.requested', 'appointment.auto_confirmed',
    'appointment.approve', 'appointment.reject', 'appointment.cancel',
    'appointment.call', 'appointment.start', 'appointment.complete',
    'appointment.no_show', 'appointment.rejected_unavailable', 'appointment.expired'
  ) THEN RETURN NEW; END IF;
  SELECT * INTO appointment_row FROM clinzo.appointment WHERE id=NEW.aggregate_id;
  IF appointment_row.id IS NULL THEN RETURN NEW; END IF;
  SELECT p.id,d.identity_id INTO practice_id,doctor_identity
    FROM clinzo.session s
    JOIN clinzo.doctor_facility p ON p.id=s.doctor_facility_id
    JOIN clinzo.doctor d ON d.id=p.doctor_id
    WHERE s.id=appointment_row.session_id;
  INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
  SELECT recipients.identity_id,NEW.id,NEW.event_type,
    'appointment:'||NEW.id||':'||recipients.identity_id,
    jsonb_build_object('appointment_id',appointment_row.id,
      'booking_code',appointment_row.public_code,'status',appointment_row.status),
    now()+interval '30 days'
  FROM (
    SELECT pa.identity_id FROM clinzo.patient_access pa
      WHERE pa.patient_id=appointment_row.patient_id
        AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL
    UNION
    SELECT doctor_identity WHERE doctor_identity IS NOT NULL
      AND NEW.event_type IN ('appointment.requested','appointment.auto_confirmed','appointment.cancel')
    UNION
    SELECT m.identity_id FROM clinzo.organization_member m
      JOIN clinzo.doctor_facility p ON p.id=practice_id
      JOIN clinzo.facility f ON f.id=p.facility_id
      WHERE m.organization_id=f.organization_id AND m.active
        AND (m.facility_id IS NULL OR m.facility_id=f.id)
        AND (m.role IN ('owner','organization_admin','facility_admin') OR
          (m.role='receptionist' AND EXISTS (
            SELECT 1 FROM clinzo.member_doctor_scope scope
              WHERE scope.member_id=m.id AND scope.doctor_facility_id=practice_id AND scope.active)))
        AND NEW.event_type IN ('appointment.requested','appointment.auto_confirmed','appointment.cancel')
  ) recipients
  WHERE recipients.identity_id IS NOT NULL AND recipients.identity_id IS DISTINCT FROM NEW.actor_id
  ON CONFLICT (dedup_key) DO NOTHING;
  RETURN NEW;
END $$;

-- Historic request intents are append-only. Hide an obsolete request only when
-- the same appointment was auto-confirmed; preserve both events for audit.
CREATE OR REPLACE FUNCTION public.list_my_notifications() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
    SELECT i.id, i.created_at, i.template_key, i.safe_parameters,
      (r.read_at IS NOT NULL) AS is_read
    FROM clinzo.notification_intent i
    LEFT JOIN clinzo.notification_read r ON r.intent_id=i.id AND r.identity_id=actor
    WHERE i.recipient_id=actor AND i.expires_at>now()
      AND NOT (i.template_key='appointment.requested' AND EXISTS (
        SELECT 1 FROM clinzo.domain_event requested
        JOIN clinzo.domain_event confirmed
          ON confirmed.aggregate_type='appointment'
          AND confirmed.aggregate_id=requested.aggregate_id
          AND confirmed.event_type='appointment.auto_confirmed'
        WHERE requested.id=i.event_id AND requested.event_type='appointment.requested'
      ))
    ORDER BY i.created_at DESC LIMIT 100
  ) x), '[]'::jsonb);
END $$;

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
    WHERE i.expires_at>now()
      AND NOT (i.template_key='appointment.requested' AND EXISTS (
        SELECT 1 FROM clinzo.domain_event requested
        JOIN clinzo.domain_event confirmed
          ON confirmed.aggregate_type='appointment'
          AND confirmed.aggregate_id=requested.aggregate_id
          AND confirmed.event_type='appointment.auto_confirmed'
        WHERE requested.id=i.event_id AND requested.event_type='appointment.requested'
      ))
      AND NOT EXISTS (SELECT 1 FROM clinzo.notification_delivery d
        WHERE d.intent_id=i.id AND d.endpoint_id=e.id)
    ORDER BY i.created_at LIMIT 500
    ON CONFLICT (intent_id,endpoint_id) DO NOTHING;

  WITH candidates AS (
    SELECT d.id FROM clinzo.notification_delivery d
    JOIN clinzo.notification_intent i ON i.id=d.intent_id
    JOIN clinzo.notification_endpoint e ON e.id=d.endpoint_id
    WHERE i.expires_at>now() AND e.revoked_at IS NULL AND d.attempts<5
      AND NOT (i.template_key='appointment.requested' AND EXISTS (
        SELECT 1 FROM clinzo.domain_event requested
        JOIN clinzo.domain_event confirmed
          ON confirmed.aggregate_type='appointment'
          AND confirmed.aggregate_id=requested.aggregate_id
          AND confirmed.event_type='appointment.auto_confirmed'
        WHERE requested.id=i.event_id AND requested.event_type='appointment.requested'
      ))
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
