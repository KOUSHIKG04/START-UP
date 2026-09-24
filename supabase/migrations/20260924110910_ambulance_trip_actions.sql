CREATE FUNCTION public.list_my_driver_trips() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(trip_row)) FROM (
    SELECT t.id,t.booking_id,t.status,t.row_version::text AS row_version,
      b.public_code,b.booking_type,b.pickup_address,b.destination_address,
      b.patient_name_snapshot,b.contact_phone_snapshot,t.created_at,t.started_at,t.completed_at,
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

CREATE FUNCTION public.transition_my_driver_trip(p_trip_id uuid,p_expected_version bigint,p_action text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); trip_row clinzo.trip; assignment clinzo.ambulance_assignment;
  next_status text;
BEGIN
  SELECT * INTO trip_row FROM clinzo.trip WHERE id=p_trip_id FOR UPDATE;
  IF trip_row.id IS NULL THEN RAISE EXCEPTION 'Trip unavailable' USING ERRCODE='22023'; END IF;
  SELECT * INTO assignment FROM clinzo.ambulance_assignment WHERE id=trip_row.assignment_id;
  IF assignment.released_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM clinzo.driver d
    WHERE d.id=assignment.driver_id AND d.identity_id=actor AND d.active) THEN
    RAISE EXCEPTION 'Active driver assignment required' USING ERRCODE='42501'; END IF;
  IF p_expected_version IS NULL OR trip_row.row_version<>p_expected_version THEN
    RAISE EXCEPTION 'Trip changed; refresh and retry' USING ERRCODE='40001'; END IF;
  IF p_action='arrive_pickup' AND trip_row.status='heading_to_pickup' THEN
    next_status:='arrived_at_pickup';
    UPDATE clinzo.trip SET status=next_status,arrived_pickup_at=now() WHERE id=trip_row.id;
  ELSIF p_action='start' AND trip_row.status='arrived_at_pickup' THEN
    next_status:='in_progress';
    UPDATE clinzo.trip SET status=next_status,started_at=now(),start_authorization='driver_confirmed'
      WHERE id=trip_row.id;
  ELSIF p_action='arrive_destination' AND trip_row.status='in_progress' THEN
    next_status:='arrived_at_destination';
    UPDATE clinzo.trip SET status=next_status,arrived_destination_at=now() WHERE id=trip_row.id;
  ELSE
    RAISE EXCEPTION 'Invalid trip transition' USING ERRCODE='22023';
  END IF;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    SELECT 'ambulance.trip_'||next_status,'trip',id,row_version,actor,gen_random_uuid(),'{}'::jsonb
      FROM clinzo.trip WHERE id=trip_row.id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','trip.'||next_status,'trip',trip_row.id,gen_random_uuid(),'allowed','{}');
  RETURN trip_row.id;
END $$;

REVOKE ALL ON FUNCTION public.list_my_driver_trips(),public.transition_my_driver_trip(uuid,bigint,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_my_driver_trips(),public.transition_my_driver_trip(uuid,bigint,text)
  TO authenticated;
