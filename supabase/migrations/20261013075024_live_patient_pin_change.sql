CREATE FUNCTION clinzo.broadcast_patient_pin_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.credential_version IS DISTINCT FROM OLD.credential_version THEN PERFORM clinzo.emit_patient_change(NEW.patient_id,'profile'); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.broadcast_patient_pin_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER app_live_patient_pin AFTER UPDATE OF credential_version ON clinzo.patient_ambulance_pin
 FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_patient_pin_change();
