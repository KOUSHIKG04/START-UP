-- Patient-created appointments always use online checkout. Staff registration and
-- reception cash collection keep their existing independent authorization owners.
DO $migration$
DECLARE
  definition text;
  old_guard text := 'IF p_payment_method IS NULL OR p_payment_method NOT IN (''online'',''reception'') THEN RAISE EXCEPTION ''Choose a valid payment option'' USING ERRCODE=''22023''; END IF;';
  new_guard text := 'IF p_payment_method IS DISTINCT FROM ''online'' THEN RAISE EXCEPTION ''Patient app bookings require online payment. Reception payment is available for staff-registered clinic visits.'' USING ERRCODE=''22023''; END IF;';
  old_option text := '''can_pay_reception'',ps.code LIKE ''clinic-%''';
BEGIN
  definition := pg_get_functiondef('clinzo.create_patient_booking(uuid,uuid,uuid,text,uuid,text,uuid)'::regprocedure);
  IF position(old_guard IN definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected patient booking payment guard';
  END IF;
  EXECUTE replace(definition, old_guard, new_guard);

  definition := pg_get_functiondef('public.get_appointment_booking_options(uuid,uuid)'::regprocedure);
  IF position(old_option IN definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected patient booking payment options';
  END IF;
  EXECUTE replace(definition, old_option, '''can_pay_reception'',false');
END
$migration$;
