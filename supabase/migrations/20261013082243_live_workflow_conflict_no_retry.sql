-- Preserve current function definitions/ACLs; change only the custom business-conflict code.
DO $migration$
DECLARE fn record;
BEGIN
 FOR fn IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('cancel_my_ambulance_booking','revoke_clinic_unavailability','transition_clinic_appointment','transition_my_driver_trip')
    AND p.prosrc LIKE '%40001%' LOOP
  EXECUTE replace(pg_get_functiondef(fn.oid),$code$'40001'$code$,$code$'PT409'$code$);
 END LOOP;
END $migration$;
