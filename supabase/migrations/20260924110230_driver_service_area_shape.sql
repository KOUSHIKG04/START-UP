CREATE OR REPLACE FUNCTION public.set_my_driver_availability(p_vehicle_id uuid,p_online boolean,p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); my_driver clinzo.driver; registration clinzo.vehicle;
  approval clinzo.vehicle_review_request; shift_row clinzo.driver_shift; shift_id uuid; position extensions.geography;
BEGIN
  SELECT * INTO my_driver FROM clinzo.driver WHERE identity_id=actor AND active FOR UPDATE;
  IF my_driver.id IS NULL THEN RAISE EXCEPTION 'Driver profile required' USING ERRCODE='42501'; END IF;
  SELECT * INTO registration FROM clinzo.vehicle WHERE id=p_vehicle_id AND organization_id=my_driver.organization_id AND active;
  IF registration.id IS NULL THEN RAISE EXCEPTION 'Vehicle unavailable' USING ERRCODE='42501'; END IF;
  SELECT * INTO shift_row FROM clinzo.driver_shift WHERE driver_id=my_driver.id AND ended_at IS NULL FOR UPDATE;
  IF p_online IS DISTINCT FROM true THEN
    IF shift_row.id IS NOT NULL THEN
      UPDATE clinzo.driver_shift SET desired_availability='offline',ended_at=now() WHERE id=shift_row.id;
      RETURN shift_row.id;
    END IF;
    RETURN NULL;
  END IF;
  IF p_latitude IS NULL OR p_longitude IS NULL OR NOT(p_latitude BETWEEN -90 AND 90 AND p_longitude BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'Current location required' USING ERRCODE='22023'; END IF;
  IF my_driver.verification_status<>'verified' OR my_driver.license_expires_on<=current_date
    OR registration.inspection_expires_on<=current_date THEN
    RAISE EXCEPTION 'Driver license, credentials or vehicle inspection require review' USING ERRCODE='42501'; END IF;
  IF shift_row.id IS NOT NULL THEN
    IF shift_row.vehicle_id<>p_vehicle_id THEN RAISE EXCEPTION 'End the current shift before changing vehicles' USING ERRCODE='22023'; END IF;
    IF shift_row.desired_availability='online' THEN RETURN shift_row.id; END IF;
  END IF;
  SELECT r.* INTO approval FROM clinzo.vehicle_review_request r
    JOIN clinzo.vehicle_capability vc ON vc.vehicle_id=r.vehicle_id AND vc.capability_id=r.capability_id
      AND vc.expires_at>now()
    WHERE r.driver_id=my_driver.id AND r.vehicle_id=p_vehicle_id AND r.status='approved' AND r.approved_until>now()
    ORDER BY r.approved_until DESC LIMIT 1;
  IF approval.id IS NULL THEN RAISE EXCEPTION 'Company equipment and crew review required' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.ambulance_assignment a WHERE a.driver_id=my_driver.id AND a.released_at IS NULL) THEN
    RAISE EXCEPTION 'Availability cannot change during an active assignment' USING ERRCODE='22023'; END IF;
  position:=extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography;
  IF shift_row.id IS NULL THEN
    INSERT INTO clinzo.driver_shift(driver_id,vehicle_id,started_at,desired_availability,service_area,crew_attestation,crew_verified_until)
      VALUES(my_driver.id,p_vehicle_id,now(),'online',extensions.ST_Multi(extensions.ST_Buffer(position,50000)::extensions.geometry)::extensions.geography,
        'company-reviewed:'||approval.id::text,approval.approved_until) RETURNING id INTO shift_id;
  ELSE
    UPDATE clinzo.driver_shift SET desired_availability='online',crew_verified_until=approval.approved_until
      WHERE id=shift_row.id RETURNING id INTO shift_id;
  END IF;
  INSERT INTO clinzo.driver_location_latest(driver_id,shift_id,stream_epoch,sequence,position,accuracy_meters,device_at,received_at)
    VALUES(my_driver.id,shift_id,gen_random_uuid(),0,position,0,now(),now())
    ON CONFLICT(driver_id) DO UPDATE SET shift_id=excluded.shift_id,stream_epoch=excluded.stream_epoch,
      sequence=0,position=excluded.position,accuracy_meters=0,device_at=excluded.device_at,received_at=excluded.received_at;
  RETURN shift_id;
END $$;
