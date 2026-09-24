CREATE FUNCTION public.update_my_driver_location(
  p_shift_id uuid,p_latitude double precision,p_longitude double precision,p_accuracy_meters double precision,
  p_device_at timestamptz,p_stream_epoch uuid,p_sequence bigint
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); shift_row clinzo.driver_shift; latest clinzo.driver_location_latest;
  assignment clinzo.ambulance_assignment; active_trip clinzo.trip; position extensions.geography;
BEGIN
  IF p_shift_id IS NULL OR p_stream_epoch IS NULL OR p_sequence IS NULL OR p_sequence<0
    OR p_latitude IS NULL OR p_longitude IS NULL OR NOT(p_latitude BETWEEN -90 AND 90 AND p_longitude BETWEEN -180 AND 180)
    OR p_accuracy_meters IS NULL OR p_accuracy_meters NOT BETWEEN 0 AND 1000
    OR p_device_at IS NULL OR p_device_at NOT BETWEEN now()-interval '2 minutes' AND now()+interval '30 seconds' THEN
    RAISE EXCEPTION 'Invalid driver location sample' USING ERRCODE='22023'; END IF;
  SELECT s.* INTO shift_row FROM clinzo.driver_shift s JOIN clinzo.driver d ON d.id=s.driver_id
    WHERE s.id=p_shift_id AND s.ended_at IS NULL AND d.identity_id=actor AND d.active;
  IF shift_row.id IS NULL THEN RAISE EXCEPTION 'Active driver shift required' USING ERRCODE='42501'; END IF;
  SELECT * INTO assignment FROM clinzo.ambulance_assignment
    WHERE shift_id=shift_row.id AND released_at IS NULL;
  IF shift_row.desired_availability<>'online' AND assignment.id IS NULL THEN
    RAISE EXCEPTION 'Driver is not Available' USING ERRCODE='42501'; END IF;
  SELECT * INTO latest FROM clinzo.driver_location_latest WHERE driver_id=shift_row.driver_id FOR UPDATE;
  IF latest.id IS NOT NULL AND latest.stream_epoch=p_stream_epoch AND p_sequence<=latest.sequence THEN
    RETURN false;
  END IF;
  position:=extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography;
  INSERT INTO clinzo.driver_location_latest(driver_id,shift_id,stream_epoch,sequence,position,accuracy_meters,device_at,received_at)
    VALUES(shift_row.driver_id,shift_row.id,p_stream_epoch,p_sequence,position,p_accuracy_meters,p_device_at,now())
    ON CONFLICT(driver_id) DO UPDATE SET shift_id=excluded.shift_id,stream_epoch=excluded.stream_epoch,
      sequence=excluded.sequence,position=excluded.position,accuracy_meters=excluded.accuracy_meters,
      device_at=excluded.device_at,received_at=excluded.received_at;
  IF assignment.id IS NOT NULL THEN
    SELECT * INTO active_trip FROM clinzo.trip WHERE assignment_id=assignment.id
      AND status NOT IN ('completed','cancelled');
    IF active_trip.id IS NOT NULL THEN
      INSERT INTO clinzo.trip_location(trip_id,assignment_id,stream_epoch,sequence,received_at,device_at,
        position,accuracy_meters,sample_reason)
        VALUES(active_trip.id,assignment.id,p_stream_epoch,p_sequence,now(),p_device_at,position,
          p_accuracy_meters,'periodic');
    END IF;
  END IF;
  RETURN true;
END $$;

CREATE FUNCTION public.get_my_active_ambulance_tracking(p_booking_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM clinzo.ambulance_booking b JOIN clinzo.patient_access pa ON pa.patient_id=b.patient_id
    WHERE b.id=p_booking_id AND pa.identity_id=actor AND pa.relationship='self'
      AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND b.status='assigned') THEN
    RAISE EXCEPTION 'Active ambulance tracking access required' USING ERRCODE='42501'; END IF;
  RETURN (SELECT to_jsonb(tracking_row) FROM (
    SELECT extensions.ST_Y(dl.position::extensions.geometry) AS latitude,
      extensions.ST_X(dl.position::extensions.geometry) AS longitude,
      dl.accuracy_meters::double precision AS accuracy_meters,dl.received_at,
      t.status AS trip_status
    FROM clinzo.ambulance_assignment a JOIN clinzo.trip t ON t.assignment_id=a.id
      JOIN clinzo.driver_location_latest dl ON dl.driver_id=a.driver_id AND dl.shift_id=a.shift_id
    WHERE a.booking_id=p_booking_id AND a.released_at IS NULL
      AND dl.received_at>now()-interval '2 minutes' LIMIT 1
  ) tracking_row);
END $$;

REVOKE ALL ON FUNCTION public.update_my_driver_location(uuid,double precision,double precision,double precision,timestamptz,uuid,bigint),
  public.get_my_active_ambulance_tracking(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_my_driver_location(uuid,double precision,double precision,double precision,timestamptz,uuid,bigint),
  public.get_my_active_ambulance_tracking(uuid) TO authenticated;
