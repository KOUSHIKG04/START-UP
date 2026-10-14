-- Check-in and related clinical actions may leave appointment.status unchanged.
CREATE FUNCTION clinzo.broadcast_clinic_workflow_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.aggregate_type='appointment' THEN PERFORM clinzo.emit_appointment_change(NEW.aggregate_id); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.broadcast_clinic_workflow_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER app_live_clinic_workflow AFTER INSERT ON clinzo.domain_event
 FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_clinic_workflow_event();
