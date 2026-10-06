-- App-booked in-person visits require the patient's short-lived QR at arrival.
-- Manual check-in remains available for separately created walk-in/staff bookings.
CREATE FUNCTION clinzo.enforce_clinic_checkin_method() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE appointment_row clinzo.appointment;
BEGIN
  SELECT * INTO appointment_row FROM clinzo.appointment WHERE id=NEW.appointment_id;
  IF appointment_row.id IS NULL THEN
    RAISE EXCEPTION 'Appointment unavailable' USING ERRCODE='23503';
  END IF;
  IF appointment_row.visit_mode <> 'clinic' THEN
    RAISE EXCEPTION 'Only in-person clinic visits can be checked in' USING ERRCODE='22023';
  END IF;
  IF appointment_row.source='patient_online' AND NEW.method <> 'qr' THEN
    RAISE EXCEPTION 'Scan the patient check-in QR for an app-booked visit' USING ERRCODE='22023';
  END IF;
  IF appointment_row.source <> 'patient_online' AND NEW.method='qr' THEN
    RAISE EXCEPTION 'QR check-in is for app-booked visits' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER enforce_clinic_checkin_method
BEFORE INSERT ON clinzo.appointment_checkin
FOR EACH ROW EXECUTE FUNCTION clinzo.enforce_clinic_checkin_method();
REVOKE ALL ON FUNCTION clinzo.enforce_clinic_checkin_method() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.issue_clinic_checkin_token(p_appointment_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); a clinzo.appointment; s clinzo.session;
  raw_token text := gen_random_uuid()::text || gen_random_uuid()::text;
BEGIN
  SELECT * INTO a FROM clinzo.appointment WHERE id=p_appointment_id FOR UPDATE;
  SELECT * INTO s FROM clinzo.session WHERE id=a.session_id;
  IF a.id IS NULL OR a.status <> 'confirmed' OR a.visit_mode <> 'clinic'
    OR a.source <> 'patient_online' OR s.state NOT IN ('published','open')
    OR (now() AT TIME ZONE s.timezone)::date <> (s.starts_at AT TIME ZONE s.timezone)::date
    OR EXISTS(SELECT 1 FROM clinzo.appointment_checkin ac WHERE ac.appointment_id=a.id)
    OR NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
      WHERE pa.patient_id=a.patient_id AND pa.identity_id=actor AND pa.relationship='self'
        AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL) THEN
    RAISE EXCEPTION 'Confirmed app-booked clinic visit on its scheduled day required' USING ERRCODE='42501';
  END IF;
  UPDATE clinzo.checkin_token SET revoked_at=now() WHERE appointment_id=a.id AND consumed_at IS NULL AND revoked_at IS NULL;
  INSERT INTO clinzo.checkin_token(appointment_id,token_hash,expires_at)
    VALUES(a.id,sha256(convert_to(raw_token,'UTF8')),now()+interval '5 minutes');
  RETURN raw_token;
END $$;

-- Reception scanning creates a doctor-only arrival notification. The existing
-- appointment event is the audit source; no patient details enter the payload.
CREATE FUNCTION clinzo.notify_doctor_clinic_arrival() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE appointment_row clinzo.appointment; doctor_identity uuid;
BEGIN
  IF NEW.aggregate_type <> 'appointment' OR NEW.event_type <> 'appointment.check_in' THEN RETURN NEW; END IF;
  SELECT * INTO appointment_row FROM clinzo.appointment WHERE id=NEW.aggregate_id;
  SELECT d.identity_id INTO doctor_identity FROM clinzo.session s
    JOIN clinzo.doctor d ON d.id=s.doctor_id WHERE s.id=appointment_row.session_id;
  IF doctor_identity IS NOT NULL AND doctor_identity IS DISTINCT FROM NEW.actor_id THEN
    INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
      VALUES(doctor_identity,NEW.id,'appointment.check_in',
        'appointment:'||NEW.id||':'||doctor_identity,
        jsonb_build_object('appointment_id',appointment_row.id,'booking_code',appointment_row.public_code,'queue_state','waiting'),
        now()+interval '30 days')
      ON CONFLICT (dedup_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER appointment_doctor_arrival_notification
AFTER INSERT ON clinzo.domain_event
FOR EACH ROW EXECUTE FUNCTION clinzo.notify_doctor_clinic_arrival();
REVOKE ALL ON FUNCTION clinzo.notify_doctor_clinic_arrival() FROM PUBLIC,anon,authenticated;
