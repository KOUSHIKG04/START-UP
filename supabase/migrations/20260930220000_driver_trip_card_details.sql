-- Expose stored trip distance and requested capability to the assigned driver.
CREATE OR REPLACE FUNCTION public.list_my_driver_trips() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(trip_row)) FROM (
    SELECT t.id,t.booking_id,t.status,t.row_version::text AS row_version,
      b.public_code,b.booking_type,b.pickup_address,b.destination_address,
      b.patient_name_snapshot,b.contact_phone_snapshot,t.created_at,t.started_at,t.completed_at,
      t.distance_meters::text AS distance_meters,
      (SELECT c.code FROM clinzo.booking_capability bc JOIN clinzo.capability c ON c.id=bc.capability_id
        WHERE bc.booking_id=b.id ORDER BY c.code LIMIT 1) AS capability_code,
      extensions.ST_Y(b.pickup_position::extensions.geometry) AS pickup_latitude,
      extensions.ST_X(b.pickup_position::extensions.geometry) AS pickup_longitude,
      CASE WHEN b.destination_position IS NULL THEN NULL ELSE extensions.ST_Y(b.destination_position::extensions.geometry) END AS destination_latitude,
      CASE WHEN b.destination_position IS NULL THEN NULL ELSE extensions.ST_X(b.destination_position::extensions.geometry) END AS destination_longitude
    FROM clinzo.driver d JOIN clinzo.ambulance_assignment a ON a.driver_id=d.id
      JOIN clinzo.trip t ON t.assignment_id=a.id JOIN clinzo.ambulance_booking b ON b.id=t.booking_id
    WHERE d.identity_id=actor AND d.active
    ORDER BY (a.released_at IS NULL) DESC,t.created_at DESC LIMIT 50
  ) trip_row),'[]'::jsonb);
END $$;
