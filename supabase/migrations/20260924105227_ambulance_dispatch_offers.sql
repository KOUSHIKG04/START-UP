CREATE FUNCTION clinzo.open_dispatch_round(p_booking_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE booking clinzo.ambulance_booking; current_round clinzo.dispatch_round;
  round_number integer; radius integer; new_round_id uuid; inserted_count integer;
BEGIN
  SELECT * INTO booking FROM clinzo.ambulance_booking WHERE id=p_booking_id FOR UPDATE;
  IF booking.id IS NULL OR booking.status<>'searching' OR booking.pickup_position IS NULL THEN RETURN 0; END IF;
  SELECT * INTO current_round FROM clinzo.dispatch_round
    WHERE booking_id=booking.id AND status='open' FOR UPDATE;
  IF current_round.id IS NOT NULL THEN
    IF current_round.expires_at>now() THEN RETURN 0; END IF;
    UPDATE clinzo.dispatch_offer SET status='expired',responded_at=now()
      WHERE round_id=current_round.id AND status='pending';
    UPDATE clinzo.dispatch_round SET status='exhausted' WHERE id=current_round.id;
  END IF;
  SELECT coalesce(max(r.round_number),0)+1 INTO round_number FROM clinzo.dispatch_round r WHERE r.booking_id=booking.id;
  IF round_number>5 THEN
    UPDATE clinzo.ambulance_booking SET status='unfulfilled' WHERE id=booking.id;
    INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,request_id,payload)
      SELECT 'ambulance.unfulfilled','ambulance_booking',id,row_version,gen_random_uuid(),'{}'::jsonb
      FROM clinzo.ambulance_booking WHERE id=booking.id;
    RETURN 0;
  END IF;
  radius:=CASE round_number WHEN 1 THEN 10000 WHEN 2 THEN 20000 WHEN 3 THEN 40000
    WHEN 4 THEN 80000 ELSE 160000 END;
  INSERT INTO clinzo.dispatch_round(booking_id,round_number,radius_meters,status,expires_at)
    VALUES(booking.id,round_number,radius,'open',now()+interval '60 seconds') RETURNING id INTO new_round_id;
  INSERT INTO clinzo.dispatch_offer(round_id,shift_id,status,expires_at,distance_meters)
    SELECT new_round_id,eligible.shift_id,'pending',now()+interval '45 seconds',eligible.distance_meters
    FROM (
      SELECT s.id AS shift_id,round(extensions.ST_Distance(dl.position,booking.pickup_position))::integer AS distance_meters
      FROM clinzo.driver_shift s
      JOIN clinzo.driver d ON d.id=s.driver_id AND d.active AND d.verification_status='verified'
        AND d.license_expires_on>current_date
      JOIN clinzo.vehicle v ON v.id=s.vehicle_id AND v.active AND v.organization_id=d.organization_id
        AND v.inspection_expires_on>current_date
      JOIN clinzo.organization org ON org.id=d.organization_id AND org.active
      JOIN clinzo.driver_location_latest dl ON dl.driver_id=d.id AND dl.shift_id=s.id
        AND dl.received_at>now()-interval '2 minutes' AND dl.accuracy_meters<=100
      JOIN clinzo.vehicle_capability vc ON vc.vehicle_id=v.id AND vc.expires_at>now()
      JOIN clinzo.booking_capability bc ON bc.booking_id=booking.id AND bc.capability_id=vc.capability_id
      WHERE s.ended_at IS NULL AND s.desired_availability='online' AND s.crew_verified_until>now()
        AND EXISTS(SELECT 1 FROM clinzo.vehicle_review_request rr WHERE rr.driver_id=d.id
          AND rr.vehicle_id=v.id AND rr.capability_id=vc.capability_id AND rr.status='approved'
          AND rr.approved_until>now())
        AND NOT EXISTS(SELECT 1 FROM clinzo.ambulance_assignment a
          WHERE a.driver_id=d.id AND a.released_at IS NULL)
        AND extensions.ST_DWithin(dl.position,booking.pickup_position,radius)
        AND extensions.ST_Intersects(s.service_area,booking.pickup_position)
        AND NOT EXISTS(SELECT 1 FROM clinzo.dispatch_offer previous
          JOIN clinzo.dispatch_round old_round ON old_round.id=previous.round_id
          WHERE old_round.booking_id=booking.id AND previous.shift_id=s.id
            AND previous.status IN ('rejected','accepted'))
      ORDER BY extensions.ST_Distance(dl.position,booking.pickup_position),s.id LIMIT 5
    ) eligible;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,request_id,payload)
    VALUES('ambulance.dispatch_round_opened','dispatch_round',new_round_id,1,gen_random_uuid(),
      jsonb_build_object('round_number',round_number,'offers',inserted_count));
  RETURN inserted_count;
END $$;
REVOKE ALL ON FUNCTION clinzo.open_dispatch_round(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION clinzo.keep_assigned_shift_open() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL AND EXISTS(
    SELECT 1 FROM clinzo.ambulance_assignment a WHERE a.shift_id=OLD.id AND a.released_at IS NULL
  ) THEN RAISE EXCEPTION 'Cannot end a shift during an active trip' USING ERRCODE='22023'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER keep_assigned_shift_open BEFORE UPDATE OF ended_at ON clinzo.driver_shift
  FOR EACH ROW EXECUTE FUNCTION clinzo.keep_assigned_shift_open();
REVOKE ALL ON FUNCTION clinzo.keep_assigned_shift_open() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION clinzo.dispatch_on_capability() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM clinzo.open_dispatch_round(NEW.booking_id);
  RETURN NEW;
END $$;
CREATE TRIGGER dispatch_after_capability AFTER INSERT ON clinzo.booking_capability FOR EACH ROW
  EXECUTE FUNCTION clinzo.dispatch_on_capability();
REVOKE ALL ON FUNCTION clinzo.dispatch_on_capability() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION clinzo.close_dispatch_on_cancel() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.status='cancelled' AND OLD.status<>'cancelled' THEN
    UPDATE clinzo.dispatch_offer o SET status='withdrawn',responded_at=now()
      FROM clinzo.dispatch_round r WHERE o.round_id=r.id AND r.booking_id=NEW.id AND o.status='pending';
    UPDATE clinzo.dispatch_round SET status='cancelled' WHERE booking_id=NEW.id AND status='open';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER close_dispatch_on_cancel AFTER UPDATE OF status ON clinzo.ambulance_booking
  FOR EACH ROW EXECUTE FUNCTION clinzo.close_dispatch_on_cancel();
REVOKE ALL ON FUNCTION clinzo.close_dispatch_on_cancel() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.refresh_my_ambulance_dispatch(p_booking_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM clinzo.ambulance_booking b JOIN clinzo.patient_access pa ON pa.patient_id=b.patient_id
    WHERE b.id=p_booking_id AND pa.identity_id=actor AND pa.relationship='self' AND pa.verified_at IS NOT NULL
      AND pa.revoked_at IS NULL AND b.status='searching') THEN
    RAISE EXCEPTION 'Active ambulance request access required' USING ERRCODE='42501'; END IF;
  RETURN clinzo.open_dispatch_round(p_booking_id);
END $$;

CREATE FUNCTION public.list_my_driver_offers() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(offer_row)) FROM (
    SELECT o.id,o.status,o.expires_at,o.distance_meters,r.radius_meters,b.id AS booking_id,
      b.booking_type,b.pickup_address,b.destination_address,b.priority,c.code AS capability_code
    FROM clinzo.driver d JOIN clinzo.driver_shift s ON s.driver_id=d.id AND s.ended_at IS NULL
      JOIN clinzo.dispatch_offer o ON o.shift_id=s.id JOIN clinzo.dispatch_round r ON r.id=o.round_id
      JOIN clinzo.ambulance_booking b ON b.id=r.booking_id
      JOIN clinzo.booking_capability bc ON bc.booking_id=b.id JOIN clinzo.capability c ON c.id=bc.capability_id
    WHERE d.identity_id=actor AND d.active AND o.status='pending' AND o.expires_at>now()
      AND r.status='open' AND r.expires_at>now() AND b.status='searching'
    ORDER BY b.priority DESC,o.created_at ASC LIMIT 20
  ) offer_row),'[]'::jsonb);
END $$;

CREATE FUNCTION public.respond_my_driver_offer(p_offer_id uuid,p_accept boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); offer_row clinzo.dispatch_offer; booking clinzo.ambulance_booking;
  round_row clinzo.dispatch_round; shift_row clinzo.driver_shift; my_driver clinzo.driver;
  registration clinzo.vehicle; operator clinzo.organization; assignment_id uuid;
BEGIN
  SELECT o.* INTO offer_row FROM clinzo.dispatch_offer o JOIN clinzo.dispatch_round r ON r.id=o.round_id WHERE o.id=p_offer_id;
  IF offer_row.id IS NULL THEN RAISE EXCEPTION 'Offer unavailable' USING ERRCODE='22023'; END IF;
  SELECT * INTO round_row FROM clinzo.dispatch_round WHERE id=offer_row.round_id;
  SELECT * INTO booking FROM clinzo.ambulance_booking WHERE id=round_row.booking_id FOR UPDATE;
  SELECT * INTO offer_row FROM clinzo.dispatch_offer WHERE id=p_offer_id FOR UPDATE;
  SELECT * INTO shift_row FROM clinzo.driver_shift WHERE id=offer_row.shift_id FOR UPDATE;
  SELECT * INTO my_driver FROM clinzo.driver WHERE id=shift_row.driver_id AND identity_id=actor AND active;
  IF my_driver.id IS NULL THEN RAISE EXCEPTION 'Driver offer access required' USING ERRCODE='42501'; END IF;
  IF offer_row.status<>'pending' OR offer_row.expires_at<=now() OR round_row.expires_at<=now()
    OR round_row.status<>'open' OR booking.status<>'searching' THEN
    RAISE EXCEPTION 'Offer is no longer available' USING ERRCODE='22023'; END IF;
  IF p_accept IS DISTINCT FROM true THEN
    UPDATE clinzo.dispatch_offer SET status='rejected',responded_at=now() WHERE id=p_offer_id;
    IF NOT EXISTS(SELECT 1 FROM clinzo.dispatch_offer WHERE round_id=round_row.id AND status='pending' AND expires_at>now()) THEN
      UPDATE clinzo.dispatch_round SET status='exhausted' WHERE id=round_row.id;
      PERFORM clinzo.open_dispatch_round(booking.id);
    END IF;
    RETURN NULL;
  END IF;
  SELECT * INTO registration FROM clinzo.vehicle WHERE id=shift_row.vehicle_id AND active;
  SELECT * INTO operator FROM clinzo.organization WHERE id=my_driver.organization_id AND active;
  IF shift_row.ended_at IS NOT NULL OR shift_row.desired_availability<>'online' OR shift_row.crew_verified_until<=now()
    OR my_driver.verification_status<>'verified' OR my_driver.license_expires_on<=current_date
    OR registration.id IS NULL OR registration.inspection_expires_on<=current_date OR operator.id IS NULL
    OR NOT EXISTS(SELECT 1 FROM clinzo.vehicle_review_request rr
      JOIN clinzo.vehicle_capability vc ON vc.vehicle_id=rr.vehicle_id AND vc.capability_id=rr.capability_id
      JOIN clinzo.booking_capability bc ON bc.capability_id=rr.capability_id AND bc.booking_id=booking.id
      WHERE rr.driver_id=my_driver.id AND rr.vehicle_id=registration.id AND rr.status='approved'
        AND rr.approved_until>now() AND vc.expires_at>now())
    OR EXISTS(SELECT 1 FROM clinzo.ambulance_assignment a WHERE a.driver_id=my_driver.id AND a.released_at IS NULL) THEN
    RAISE EXCEPTION 'Driver, vehicle or crew is not currently available' USING ERRCODE='42501'; END IF;
  UPDATE clinzo.dispatch_offer SET status='accepted',responded_at=now() WHERE id=p_offer_id;
  UPDATE clinzo.dispatch_offer SET status='withdrawn',responded_at=now()
    WHERE round_id=round_row.id AND id<>p_offer_id AND status='pending';
  UPDATE clinzo.dispatch_round SET status='matched' WHERE id=round_row.id;
  UPDATE clinzo.ambulance_booking SET status='assigned' WHERE id=booking.id;
  INSERT INTO clinzo.ambulance_assignment(booking_id,offer_id,shift_id,driver_id,vehicle_id,
    accepted_at,driver_name_snapshot,vehicle_registration_snapshot,operator_name_snapshot)
    VALUES(booking.id,p_offer_id,shift_row.id,my_driver.id,registration.id,now(),my_driver.full_name,
      registration.registration_number,operator.name) RETURNING id INTO assignment_id;
  INSERT INTO clinzo.trip(booking_id,assignment_id,status) VALUES(booking.id,assignment_id,'heading_to_pickup');
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    SELECT 'ambulance.assigned','ambulance_booking',id,row_version,actor,gen_random_uuid(),
      jsonb_build_object('assignment_id',assignment_id) FROM clinzo.ambulance_booking WHERE id=booking.id;
  RETURN assignment_id;
END $$;

REVOKE ALL ON FUNCTION public.refresh_my_ambulance_dispatch(uuid),public.list_my_driver_offers(),
  public.respond_my_driver_offer(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_ambulance_dispatch(uuid),public.list_my_driver_offers(),
  public.respond_my_driver_offer(uuid,boolean) TO authenticated;
