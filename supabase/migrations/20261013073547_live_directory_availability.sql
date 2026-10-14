-- Availability is public directory data; send no appointment or review details.
CREATE FUNCTION clinzo.broadcast_directory_availability() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM clinzo.emit_live_change('directory-events','directory'); RETURN NULL; END $$;
REVOKE ALL ON FUNCTION clinzo.broadcast_directory_availability() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER app_live_appointment_availability AFTER INSERT OR UPDATE OF status,capacity_released_at OR DELETE ON clinzo.appointment
 FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_directory_availability();
CREATE TRIGGER app_live_doctor_review AFTER INSERT OR UPDATE OR DELETE ON clinzo.doctor_review
 FOR EACH ROW EXECUTE FUNCTION clinzo.broadcast_directory_availability();
