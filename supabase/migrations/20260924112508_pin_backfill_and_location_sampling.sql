CREATE OR REPLACE FUNCTION clinzo.ensure_patient_completion_pin(p_patient_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE new_pin text; pepper text; secret_id uuid; credential clinzo.patient_ambulance_pin;
BEGIN
  SELECT * INTO credential FROM clinzo.patient_ambulance_pin WHERE patient_id=p_patient_id FOR UPDATE;
  IF credential.id IS NOT NULL AND credential.vault_secret_id IS NOT NULL THEN RETURN; END IF;
  new_pin:=clinzo.generate_four_digit_pin();
  SELECT decrypted_secret INTO pepper FROM vault.decrypted_secrets WHERE name='clinzo_patient_completion_pin_pepper';
  IF pepper IS NULL THEN RAISE EXCEPTION 'Completion PIN key unavailable' USING ERRCODE='55000'; END IF;
  SELECT vault.create_secret(new_pin,'clinzo_patient_completion_pin_'||p_patient_id::text,
    'Patient-specific completion PIN') INTO secret_id;
  IF credential.id IS NULL THEN
    INSERT INTO clinzo.patient_ambulance_pin(patient_id,verifier,pepper_key_id,credential_version,
      failed_attempts,last_changed_at,vault_secret_id)
      VALUES(p_patient_id,encode(sha256(convert_to(p_patient_id::text||':'||new_pin||':'||pepper,'UTF8')),'hex'),
        'clinzo_patient_completion_pin_pepper',1,0,now(),secret_id);
  ELSE
    UPDATE clinzo.patient_ambulance_pin SET verifier=encode(sha256(convert_to(p_patient_id::text||':'||new_pin||':'||pepper,'UTF8')),'hex'),
      pepper_key_id='clinzo_patient_completion_pin_pepper',vault_secret_id=secret_id,
      credential_version=credential_version+1,failed_attempts=0,locked_until=NULL,last_changed_at=now()
      WHERE id=credential.id;
  END IF;
END $$;

DO $$ DECLARE patient_row record; BEGIN
  FOR patient_row IN SELECT p.id FROM clinzo.patient p
    LEFT JOIN clinzo.patient_ambulance_pin pin ON pin.patient_id=p.id
    WHERE pin.id IS NULL OR pin.vault_secret_id IS NULL LOOP
    PERFORM clinzo.ensure_patient_completion_pin(patient_row.id);
  END LOOP;
END $$;
ALTER TABLE clinzo.patient_ambulance_pin ALTER COLUMN vault_secret_id SET NOT NULL;

CREATE OR REPLACE FUNCTION clinzo.regenerate_patient_completion_pin(p_patient_id uuid,p_reviewer_reference text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE credential clinzo.patient_ambulance_pin; new_pin text; old_pin text; pepper text;
BEGIN
  IF length(trim(coalesce(p_reviewer_reference,''))) NOT BETWEEN 3 AND 120
    OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'Reviewer and reason required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.ambulance_booking b JOIN clinzo.trip t ON t.booking_id=b.id
    WHERE b.patient_id=p_patient_id AND b.status='assigned' AND t.status NOT IN ('completed','cancelled')) THEN
    RAISE EXCEPTION 'Cannot regenerate during an active trip' USING ERRCODE='22023'; END IF;
  SELECT * INTO credential FROM clinzo.patient_ambulance_pin WHERE patient_id=p_patient_id FOR UPDATE;
  IF credential.id IS NULL THEN RAISE EXCEPTION 'Patient PIN missing' USING ERRCODE='22023'; END IF;
  SELECT decrypted_secret INTO old_pin FROM vault.decrypted_secrets WHERE id=credential.vault_secret_id;
  SELECT decrypted_secret INTO pepper FROM vault.decrypted_secrets WHERE name=credential.pepper_key_id;
  IF old_pin IS NULL OR pepper IS NULL THEN RAISE EXCEPTION 'Completion PIN key unavailable' USING ERRCODE='55000'; END IF;
  LOOP
    new_pin:=clinzo.generate_four_digit_pin();
    EXIT WHEN new_pin<>old_pin;
  END LOOP;
  PERFORM vault.update_secret(credential.vault_secret_id,new_pin);
  UPDATE clinzo.patient_ambulance_pin SET verifier=encode(sha256(convert_to(p_patient_id::text||':'||new_pin||':'||pepper,'UTF8')),'hex'),
    credential_version=credential.credential_version+1,failed_attempts=0,locked_until=NULL,last_changed_at=now()
    WHERE id=credential.id;
  INSERT INTO clinzo.audit_log(actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES('system','patient_pin.regenerated','patient',p_patient_id,gen_random_uuid(),'allowed',
      jsonb_build_object('reviewer_reference',trim(p_reviewer_reference),'reason',trim(p_reason)));
END $$;

CREATE FUNCTION clinzo.sample_periodic_trip_location() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF NEW.sample_reason='periodic' AND EXISTS(SELECT 1 FROM clinzo.trip_location previous
    WHERE previous.trip_id=NEW.trip_id AND previous.sample_reason='periodic'
      AND previous.received_at>NEW.received_at-interval '1 minute') THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sample_periodic_trip_location BEFORE INSERT ON clinzo.trip_location
  FOR EACH ROW EXECUTE FUNCTION clinzo.sample_periodic_trip_location();
REVOKE ALL ON FUNCTION clinzo.sample_periodic_trip_location() FROM PUBLIC,anon,authenticated,service_role;
