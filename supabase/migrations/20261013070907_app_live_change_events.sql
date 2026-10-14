-- Private invalidation signals only. Records continue to be read through scoped RPCs.
CREATE FUNCTION public.can_receive_app_live_events(p_topic text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM clinzo.identity i JOIN auth.users u ON u.id=auth.uid()
  WHERE i.issuer='supabase' AND i.subject=u.id::text AND i.disabled_at IS NULL
    AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL)
    AND (u.banned_until IS NULL OR u.banned_until<now()) AND (
      p_topic='identity-events:'||i.id::text OR p_topic='directory-events' OR
      EXISTS(SELECT 1 FROM clinzo.organization_member m JOIN clinzo.facility f ON f.organization_id=m.organization_id
        JOIN clinzo.organization o ON o.id=f.organization_id AND o.active
        WHERE m.identity_id=i.id AND m.active AND f.active AND (m.facility_id IS NULL OR m.facility_id=f.id)
          AND m.role IN ('owner','organization_admin','facility_admin','receptionist')
          AND p_topic='facility-events:'||f.id::text)
    ));
$$;
REVOKE ALL ON FUNCTION public.can_receive_app_live_events(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_receive_app_live_events(text) TO authenticated;
CREATE POLICY app_live_broadcast_receive ON realtime.messages FOR SELECT TO authenticated
 USING(extension='broadcast' AND topic=(SELECT realtime.topic()) AND public.can_receive_app_live_events((SELECT realtime.topic())));

CREATE FUNCTION clinzo.emit_live_change(p_topic text,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sent jsonb:=coalesce(nullif(current_setting('clinzo.live_change_keys',true),'')::jsonb,'[]'::jsonb); signal text:=p_topic||'|'||p_kind;
BEGIN
 IF p_topic IS NULL OR sent ? signal THEN RETURN; END IF;
 PERFORM set_config('clinzo.live_change_keys',(sent||jsonb_build_array(signal))::text,true);
 PERFORM realtime.send(jsonb_build_object('kind',p_kind),'app_changed',p_topic,true);
END $$;
CREATE FUNCTION clinzo.emit_identity_change(p_identity uuid,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN IF p_identity IS NOT NULL THEN PERFORM clinzo.emit_live_change('identity-events:'||p_identity::text,p_kind); END IF; END $$;
CREATE FUNCTION clinzo.emit_patient_change(p_patient uuid,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE recipient uuid;
BEGIN FOR recipient IN SELECT DISTINCT pa.identity_id FROM clinzo.patient_access pa JOIN clinzo.identity i ON i.id=pa.identity_id AND i.disabled_at IS NULL
 WHERE pa.patient_id=p_patient AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL LOOP
 PERFORM clinzo.emit_identity_change(recipient,p_kind); END LOOP; END $$;
CREATE FUNCTION clinzo.emit_practice_change(p_practice uuid,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE practice clinzo.doctor_facility; recipient uuid;
BEGIN
 SELECT * INTO practice FROM clinzo.doctor_facility WHERE id=p_practice;
 PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.doctor WHERE id=practice.doctor_id),p_kind);
 IF practice.facility_id IS NOT NULL THEN PERFORM clinzo.emit_live_change('facility-events:'||practice.facility_id::text,p_kind); END IF;
END $$;
CREATE FUNCTION clinzo.emit_appointment_change(p_appointment uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE appointment clinzo.appointment;
BEGIN
 SELECT * INTO appointment FROM clinzo.appointment WHERE id=p_appointment;
 PERFORM clinzo.emit_patient_change(appointment.patient_id,'appointments');
 PERFORM clinzo.emit_practice_change((SELECT doctor_facility_id FROM clinzo.session WHERE id=appointment.session_id),'appointments');
END $$;
CREATE FUNCTION clinzo.emit_booking_change(p_booking uuid,p_kind text DEFAULT 'ambulance') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE booking clinzo.ambulance_booking; recipient uuid;
BEGIN
 SELECT * INTO booking FROM clinzo.ambulance_booking WHERE id=p_booking;
 PERFORM clinzo.emit_patient_change(booking.patient_id,p_kind);
 PERFORM clinzo.emit_identity_change(booking.requested_by,p_kind);
 IF p_kind<>'tracking' THEN FOR recipient IN SELECT DISTINCT d.identity_id FROM clinzo.ambulance_assignment a JOIN clinzo.driver d ON d.id=a.driver_id WHERE a.booking_id=p_booking LOOP
  PERFORM clinzo.emit_identity_change(recipient,p_kind); END LOOP; END IF;
END $$;
CREATE FUNCTION clinzo.emit_verification_change(p_case uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE review clinzo.verification_case;
BEGIN
 SELECT * INTO review FROM clinzo.verification_case WHERE id=p_case;
 PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.doctor WHERE id=review.doctor_id),'profile');
 PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.driver_registration_application WHERE id=review.driver_application_id),'profile');
 IF review.facility_id IS NOT NULL THEN PERFORM clinzo.emit_live_change('facility-events:'||review.facility_id::text,'profile'); END IF;
END $$;

CREATE FUNCTION clinzo.broadcast_app_live_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data jsonb; target uuid; recipient uuid;
BEGIN
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['updated_at','row_version'])=(to_jsonb(OLD)-ARRAY['updated_at','row_version']) THEN RETURN NEW; END IF;
 CASE TG_TABLE_NAME
 WHEN 'appointment' THEN
  PERFORM clinzo.emit_patient_change((row_data->>'patient_id')::uuid,'appointments');
  PERFORM clinzo.emit_practice_change((SELECT doctor_facility_id FROM clinzo.session WHERE id=(row_data->>'session_id')::uuid),'appointments');
 WHEN 'queue_entry' THEN PERFORM clinzo.emit_appointment_change((row_data->>'appointment_id')::uuid);
 WHEN 'notification_intent' THEN PERFORM clinzo.emit_identity_change((row_data->>'recipient_id')::uuid,'notifications');
 WHEN 'notification_read' THEN PERFORM clinzo.emit_identity_change((row_data->>'identity_id')::uuid,'notifications');
 WHEN 'facility_bed_inventory' THEN
  PERFORM clinzo.emit_live_change('facility-events:'||(row_data->>'facility_id'),'beds');
  PERFORM clinzo.emit_live_change('directory-events','beds');
 WHEN 'ambulance_booking' THEN PERFORM clinzo.emit_booking_change((row_data->>'id')::uuid);
 WHEN 'ambulance_assignment' THEN
  PERFORM clinzo.emit_booking_change((row_data->>'booking_id')::uuid);
  PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.driver WHERE id=(row_data->>'driver_id')::uuid),'ambulance');
 WHEN 'trip' THEN PERFORM clinzo.emit_booking_change((row_data->>'booking_id')::uuid);
 WHEN 'dispatch_offer' THEN PERFORM clinzo.emit_identity_change((SELECT d.identity_id FROM clinzo.driver_shift s JOIN clinzo.driver d ON d.id=s.driver_id WHERE s.id=(row_data->>'shift_id')::uuid),'ambulance');
 WHEN 'driver_shift' THEN PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.driver WHERE id=(row_data->>'driver_id')::uuid),'ambulance');
 WHEN 'driver_location_latest' THEN
  FOR target IN SELECT a.booking_id FROM clinzo.ambulance_assignment a JOIN clinzo.trip t ON t.assignment_id=a.id
    WHERE a.driver_id=(row_data->>'driver_id')::uuid AND a.released_at IS NULL AND t.status NOT IN ('completed','cancelled') LOOP
   PERFORM clinzo.emit_booking_change(target,'tracking'); END LOOP;
 WHEN 'doctor_schedule_preferences' THEN
  PERFORM clinzo.emit_practice_change((row_data->>'doctor_facility_id')::uuid,'schedule');
  PERFORM clinzo.emit_live_change('directory-events','directory');
 WHEN 'session' THEN
  PERFORM clinzo.emit_practice_change((row_data->>'doctor_facility_id')::uuid,'schedule');
  PERFORM clinzo.emit_live_change('directory-events','directory');
 WHEN 'schedule_exception' THEN
  PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.doctor WHERE id=(row_data->>'doctor_id')::uuid),'schedule');
  IF row_data->>'doctor_facility_id' IS NOT NULL THEN PERFORM clinzo.emit_practice_change((row_data->>'doctor_facility_id')::uuid,'schedule'); END IF;
  PERFORM clinzo.emit_live_change('directory-events','directory');
 WHEN 'practice_service' THEN PERFORM clinzo.emit_live_change('directory-events','directory');
 WHEN 'doctor_facility_request' THEN PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.doctor WHERE id=(row_data->>'doctor_id')::uuid),'schedule');
 WHEN 'doctor_facility' THEN
  PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.doctor WHERE id=(row_data->>'doctor_id')::uuid),'schedule');
  PERFORM clinzo.emit_live_change('facility-events:'||(row_data->>'facility_id'),'schedule');
  PERFORM clinzo.emit_live_change('directory-events','directory');
 WHEN 'doctor' THEN
  PERFORM clinzo.emit_identity_change((row_data->>'identity_id')::uuid,'profile');
  IF row_data->>'credential_status'='verified' OR (TG_OP='UPDATE' AND OLD.credential_status='verified') THEN PERFORM clinzo.emit_live_change('directory-events','directory'); END IF;
 WHEN 'facility' THEN
  PERFORM clinzo.emit_live_change('facility-events:'||(row_data->>'id'),'profile');
  IF row_data->>'verification_status'='verified' OR (TG_OP='UPDATE' AND OLD.verification_status='verified') THEN PERFORM clinzo.emit_live_change('directory-events','directory'); END IF;
 WHEN 'driver' THEN PERFORM clinzo.emit_identity_change((row_data->>'identity_id')::uuid,'profile');
 WHEN 'driver_registration_application' THEN PERFORM clinzo.emit_identity_change((row_data->>'identity_id')::uuid,'profile');
 WHEN 'verification_case' THEN PERFORM clinzo.emit_verification_change((row_data->>'id')::uuid);
 WHEN 'verification_document' THEN PERFORM clinzo.emit_verification_change((row_data->>'case_id')::uuid);
 WHEN 'patient' THEN PERFORM clinzo.emit_patient_change((row_data->>'id')::uuid,'profile');
 WHEN 'patient_access' THEN PERFORM clinzo.emit_identity_change((row_data->>'identity_id')::uuid,'profile');
 WHEN 'vehicle_review_request' THEN PERFORM clinzo.emit_identity_change((SELECT identity_id FROM clinzo.driver WHERE id=(row_data->>'driver_id')::uuid),'profile');
 WHEN 'consultation' THEN PERFORM clinzo.emit_patient_change((row_data->>'patient_id')::uuid,'clinical');
 WHEN 'prescription_revision' THEN
  PERFORM clinzo.emit_patient_change((SELECT c.patient_id FROM clinzo.prescription p JOIN clinzo.consultation c ON c.id=p.consultation_id WHERE p.id=(row_data->>'prescription_id')::uuid),'clinical');
 ELSE NULL;
 END CASE;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION clinzo.emit_live_change(text,text),clinzo.emit_identity_change(uuid,text),clinzo.emit_patient_change(uuid,text),
 clinzo.emit_practice_change(uuid,text),clinzo.emit_appointment_change(uuid),clinzo.emit_booking_change(uuid,text),clinzo.emit_verification_change(uuid),clinzo.broadcast_app_live_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER app_live_appointment AFTER INSERT OR UPDATE OR DELETE ON clinzo.appointment FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_queue_entry AFTER INSERT OR UPDATE OR DELETE ON clinzo.queue_entry FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_notification_intent AFTER INSERT OR UPDATE OR DELETE ON clinzo.notification_intent FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_notification_read AFTER INSERT OR UPDATE OR DELETE ON clinzo.notification_read FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_facility_bed_inventory AFTER INSERT OR UPDATE OR DELETE ON clinzo.facility_bed_inventory FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_ambulance_booking AFTER INSERT OR UPDATE OR DELETE ON clinzo.ambulance_booking FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_ambulance_assignment AFTER INSERT OR UPDATE OR DELETE ON clinzo.ambulance_assignment FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_trip AFTER INSERT OR UPDATE OR DELETE ON clinzo.trip FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_dispatch_offer AFTER INSERT OR UPDATE OR DELETE ON clinzo.dispatch_offer FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_driver_shift AFTER INSERT OR UPDATE OR DELETE ON clinzo.driver_shift FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_driver_location_latest AFTER INSERT OR UPDATE OR DELETE ON clinzo.driver_location_latest FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_doctor_schedule_preferences AFTER INSERT OR UPDATE OR DELETE ON clinzo.doctor_schedule_preferences FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_session AFTER INSERT OR UPDATE OR DELETE ON clinzo.session FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_schedule_exception AFTER INSERT OR UPDATE OR DELETE ON clinzo.schedule_exception FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_practice_service AFTER INSERT OR UPDATE OR DELETE ON clinzo.practice_service FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_doctor_facility AFTER INSERT OR UPDATE OR DELETE ON clinzo.doctor_facility FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_doctor AFTER INSERT OR UPDATE OR DELETE ON clinzo.doctor FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_facility AFTER INSERT OR UPDATE OR DELETE ON clinzo.facility FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_driver AFTER INSERT OR UPDATE OR DELETE ON clinzo.driver FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_driver_registration_application AFTER INSERT OR UPDATE OR DELETE ON clinzo.driver_registration_application FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_verification_case AFTER INSERT OR UPDATE OR DELETE ON clinzo.verification_case FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_verification_document AFTER INSERT OR UPDATE OR DELETE ON clinzo.verification_document FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_patient AFTER INSERT OR UPDATE OR DELETE ON clinzo.patient FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_patient_access AFTER INSERT OR UPDATE OR DELETE ON clinzo.patient_access FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_vehicle_review_request AFTER INSERT OR UPDATE OR DELETE ON clinzo.vehicle_review_request FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_consultation AFTER INSERT OR UPDATE OR DELETE ON clinzo.consultation FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_prescription_revision AFTER INSERT OR UPDATE OR DELETE ON clinzo.prescription_revision FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
CREATE TRIGGER app_live_doctor_facility_request AFTER INSERT OR UPDATE OR DELETE ON clinzo.doctor_facility_request FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_app_live_change();
