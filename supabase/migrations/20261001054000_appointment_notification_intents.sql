-- Convert selected appointment domain events into recipient-scoped notifications.
-- Payload contains only a public booking code and state, never clinical notes.
CREATE FUNCTION clinzo.notify_appointment_event() RETURNS trigger
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
      AND NEW.event_type IN ('appointment.requested','appointment.cancel')
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
        AND NEW.event_type IN ('appointment.requested','appointment.cancel')
  ) recipients
  WHERE recipients.identity_id IS NOT NULL AND recipients.identity_id IS DISTINCT FROM NEW.actor_id
  ON CONFLICT (dedup_key) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER appointment_notification_event
AFTER INSERT ON clinzo.domain_event
FOR EACH ROW EXECUTE FUNCTION clinzo.notify_appointment_event();

REVOKE ALL ON FUNCTION clinzo.notify_appointment_event() FROM PUBLIC, anon, authenticated;
