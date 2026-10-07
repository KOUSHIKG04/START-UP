CREATE OR REPLACE FUNCTION clinzo.seed_patient_location_from_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF jsonb_typeof(NEW.home_address)='object'
     AND coalesce(trim(NEW.home_address->>'city'),'')<>'' THEN
    IF TG_OP='UPDATE' THEN
      IF NEW.home_address IS DISTINCT FROM OLD.home_address THEN
        UPDATE clinzo.patient_saved_location
        SET building=NEW.home_address->>'building',street=NEW.home_address->>'line1',
          locality=NEW.home_address->>'line2',city=NEW.home_address->>'city',
          state=NEW.home_address->>'state',pincode=NULLIF(NEW.home_address->>'pincode',''),
          latitude=NULL,longitude=NULL,updated_at=now()
        WHERE patient_id=NEW.id AND kind='house' AND label='Home';
        IF FOUND THEN RETURN NEW; END IF;
      END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM clinzo.patient_saved_location l WHERE l.patient_id=NEW.id) THEN
      INSERT INTO clinzo.patient_saved_location(patient_id,label,kind,building,street,locality,city,state,pincode,selected)
      VALUES (NEW.id,'Home','house',NEW.home_address->>'building',NEW.home_address->>'line1',
        NEW.home_address->>'line2',NEW.home_address->>'city',NEW.home_address->>'state',
        NULLIF(NEW.home_address->>'pincode',''),true);
    END IF;
  END IF;
  RETURN NEW;
END $$;
