CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

ALTER TABLE clinzo.patient_ambulance_pin ADD COLUMN vault_secret_id uuid UNIQUE;

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='clinzo_patient_completion_pin_pepper') THEN
    PERFORM vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,
      'clinzo_patient_completion_pin_pepper','Clinzo patient completion PIN verifier pepper');
  END IF;
END $$;

CREATE FUNCTION clinzo.generate_four_digit_pin() RETURNS text
LANGUAGE sql VOLATILE SET search_path='' AS $$
  SELECT lpad((((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint) % 10000)::integer)::text,4,'0');
$$;
REVOKE ALL ON FUNCTION clinzo.generate_four_digit_pin() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION clinzo.ensure_patient_completion_pin(p_patient_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE new_pin text; pepper text; secret_id uuid;
BEGIN
  IF EXISTS(SELECT 1 FROM clinzo.patient_ambulance_pin WHERE patient_id=p_patient_id) THEN RETURN; END IF;
  new_pin:=clinzo.generate_four_digit_pin();
  SELECT decrypted_secret INTO pepper FROM vault.decrypted_secrets WHERE name='clinzo_patient_completion_pin_pepper';
  IF pepper IS NULL THEN RAISE EXCEPTION 'Completion PIN key unavailable' USING ERRCODE='55000'; END IF;
  SELECT vault.create_secret(new_pin,'clinzo_patient_completion_pin_'||p_patient_id::text,
    'Patient-specific completion PIN') INTO secret_id;
  INSERT INTO clinzo.patient_ambulance_pin(patient_id,verifier,pepper_key_id,credential_version,
    failed_attempts,last_changed_at,vault_secret_id)
    VALUES(p_patient_id,encode(sha256(convert_to(p_patient_id::text||':'||new_pin||':'||pepper,'UTF8')),'hex'),
      'clinzo_patient_completion_pin_pepper',1,0,now(),secret_id);
END $$;
REVOKE ALL ON FUNCTION clinzo.ensure_patient_completion_pin(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION clinzo.create_patient_completion_pin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM clinzo.ensure_patient_completion_pin(NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER create_patient_completion_pin AFTER INSERT ON clinzo.patient FOR EACH ROW
  EXECUTE FUNCTION clinzo.create_patient_completion_pin();
REVOKE ALL ON FUNCTION clinzo.create_patient_completion_pin() FROM PUBLIC,anon,authenticated,service_role;

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT id FROM clinzo.patient LOOP
    PERFORM clinzo.ensure_patient_completion_pin(p.id);
  END LOOP;
END $$;

CREATE FUNCTION public.get_my_patient_verification_pin(p_patient_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); secret_id uuid; pin text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    WHERE pa.patient_id=p_patient_id AND pa.identity_id=actor AND pa.relationship='self'
      AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL) THEN
    RAISE EXCEPTION 'Patient access required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.ambulance_booking b JOIN clinzo.trip t ON t.booking_id=b.id
    WHERE b.patient_id=p_patient_id AND b.status='assigned'
      AND t.status IN ('in_progress','arrived_at_destination')) THEN
    RAISE EXCEPTION 'PIN is visible only during an active trip' USING ERRCODE='42501'; END IF;
  SELECT vault_secret_id INTO secret_id FROM clinzo.patient_ambulance_pin WHERE patient_id=p_patient_id;
  SELECT decrypted_secret INTO pin FROM vault.decrypted_secrets WHERE id=secret_id;
  IF pin IS NULL THEN RAISE EXCEPTION 'Patient PIN unavailable' USING ERRCODE='55000'; END IF;
  RETURN pin;
END $$;

CREATE FUNCTION public.complete_my_driver_trip(p_trip_id uuid,p_pin text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); trip_row clinzo.trip; assignment clinzo.ambulance_assignment;
  booking clinzo.ambulance_booking; credential clinzo.patient_ambulance_pin; pepper text;
  valid_pin boolean; new_failures integer;
BEGIN
  SELECT * INTO trip_row FROM clinzo.trip WHERE id=p_trip_id FOR UPDATE;
  IF trip_row.id IS NULL THEN RAISE EXCEPTION 'Trip unavailable' USING ERRCODE='22023'; END IF;
  SELECT * INTO assignment FROM clinzo.ambulance_assignment WHERE id=trip_row.assignment_id;
  IF NOT EXISTS(SELECT 1 FROM clinzo.driver d WHERE d.id=assignment.driver_id AND d.identity_id=actor AND d.active)
    OR assignment.released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Driver trip access required' USING ERRCODE='42501'; END IF;
  IF trip_row.status<>'arrived_at_destination' THEN
    RAISE EXCEPTION 'Trip must reach destination before completion' USING ERRCODE='22023'; END IF;
  SELECT * INTO booking FROM clinzo.ambulance_booking WHERE id=trip_row.booking_id FOR UPDATE;
  IF booking.patient_id IS NULL THEN RAISE EXCEPTION 'Patient PIN unavailable for guest trip' USING ERRCODE='22023'; END IF;
  SELECT * INTO credential FROM clinzo.patient_ambulance_pin WHERE patient_id=booking.patient_id FOR UPDATE;
  IF credential.id IS NULL THEN RAISE EXCEPTION 'Patient PIN unavailable' USING ERRCODE='55000'; END IF;
  IF credential.locked_until>now() THEN
    INSERT INTO clinzo.pin_attempt(trip_id,driver_id,credential_version,outcome,request_id)
      VALUES(trip_row.id,assignment.driver_id,credential.credential_version,'throttled',gen_random_uuid());
    RETURN false;
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'Enter a four-digit PIN' USING ERRCODE='22023'; END IF;
  SELECT decrypted_secret INTO pepper FROM vault.decrypted_secrets WHERE name=credential.pepper_key_id;
  IF pepper IS NULL THEN RAISE EXCEPTION 'Completion PIN key unavailable' USING ERRCODE='55000'; END IF;
  valid_pin:=credential.verifier=encode(sha256(convert_to(booking.patient_id::text||':'||p_pin||':'||pepper,'UTF8')),'hex');
  IF NOT valid_pin THEN
    new_failures:=CASE WHEN credential.locked_until IS NOT NULL AND credential.locked_until<=now()
      THEN 1 ELSE credential.failed_attempts+1 END;
    UPDATE clinzo.patient_ambulance_pin SET failed_attempts=new_failures,
      locked_until=CASE WHEN new_failures>=5 THEN now()+interval '30 minutes' ELSE NULL END
      WHERE id=credential.id;
    INSERT INTO clinzo.pin_attempt(trip_id,driver_id,credential_version,outcome,request_id)
      VALUES(trip_row.id,assignment.driver_id,credential.credential_version,'invalid',gen_random_uuid());
    RETURN false;
  END IF;
  UPDATE clinzo.patient_ambulance_pin SET failed_attempts=0,locked_until=NULL WHERE id=credential.id;
  INSERT INTO clinzo.pin_attempt(trip_id,driver_id,credential_version,outcome,request_id)
    VALUES(trip_row.id,assignment.driver_id,credential.credential_version,'success',gen_random_uuid());
  UPDATE clinzo.trip SET status='completed',completed_at=now(),pin_credential_version=credential.credential_version
    WHERE id=trip_row.id;
  UPDATE clinzo.ambulance_booking SET status='fulfilled' WHERE id=booking.id;
  UPDATE clinzo.ambulance_assignment SET released_at=now(),release_reason='completed' WHERE id=assignment.id;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    SELECT 'ambulance.trip_completed','trip',id,row_version,actor,gen_random_uuid(),'{}'::jsonb
      FROM clinzo.trip WHERE id=trip_row.id;
  RETURN true;
END $$;

-- Manual trusted regeneration only; a self-service route requires a fresh phone challenge.
CREATE FUNCTION clinzo.regenerate_patient_completion_pin(p_patient_id uuid,p_reviewer_reference text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE credential clinzo.patient_ambulance_pin; new_pin text; pepper text;
BEGIN
  IF length(trim(coalesce(p_reviewer_reference,''))) NOT BETWEEN 3 AND 120
    OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'Reviewer and reason required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.ambulance_booking b JOIN clinzo.trip t ON t.booking_id=b.id
    WHERE b.patient_id=p_patient_id AND b.status='assigned' AND t.status NOT IN ('completed','cancelled')) THEN
    RAISE EXCEPTION 'Cannot regenerate during an active trip' USING ERRCODE='22023'; END IF;
  SELECT * INTO credential FROM clinzo.patient_ambulance_pin WHERE patient_id=p_patient_id FOR UPDATE;
  IF credential.id IS NULL THEN RAISE EXCEPTION 'Patient PIN missing' USING ERRCODE='22023'; END IF;
  new_pin:=clinzo.generate_four_digit_pin();
  SELECT decrypted_secret INTO pepper FROM vault.decrypted_secrets WHERE name=credential.pepper_key_id;
  IF pepper IS NULL THEN RAISE EXCEPTION 'Completion PIN key unavailable' USING ERRCODE='55000'; END IF;
  PERFORM vault.update_secret(credential.vault_secret_id,new_pin);
  UPDATE clinzo.patient_ambulance_pin SET verifier=encode(sha256(convert_to(p_patient_id::text||':'||new_pin||':'||pepper,'UTF8')),'hex'),
    credential_version=credential.credential_version+1,failed_attempts=0,locked_until=NULL,last_changed_at=now()
    WHERE id=credential.id;
  INSERT INTO clinzo.audit_log(actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES('system','patient_pin.regenerated','patient',p_patient_id,gen_random_uuid(),'allowed',
      jsonb_build_object('reviewer_reference',trim(p_reviewer_reference),'reason',trim(p_reason)));
END $$;

REVOKE ALL ON FUNCTION public.get_my_patient_verification_pin(uuid),public.complete_my_driver_trip(uuid,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_patient_verification_pin(uuid),public.complete_my_driver_trip(uuid,text)
  TO authenticated;
REVOKE ALL ON FUNCTION clinzo.regenerate_patient_completion_pin(uuid,text,text)
  FROM PUBLIC,anon,authenticated,service_role;
