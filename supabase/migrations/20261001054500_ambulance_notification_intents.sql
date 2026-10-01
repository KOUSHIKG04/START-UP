-- Fan out operational ambulance events to the assigned patient or offered driver.
-- Guest SOS has no authenticated recipient until a separate consented contact flow exists.
CREATE FUNCTION clinzo.notify_ambulance_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE booking_id uuid; recipient uuid; code text; status text;
BEGIN
  IF NEW.event_type='ambulance.dispatch_round_opened' AND NEW.aggregate_type='dispatch_round' THEN
    SELECT r.booking_id INTO booking_id FROM clinzo.dispatch_round r WHERE r.id=NEW.aggregate_id;
    SELECT b.public_code INTO code FROM clinzo.ambulance_booking b WHERE b.id=booking_id;
    INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
    SELECT DISTINCT d.identity_id,NEW.id,'ambulance.offer',
      'ambulance:'||NEW.id||':'||d.identity_id,
      jsonb_build_object('booking_code',code,'booking_id',booking_id,'status','offer_pending'),
      now()+interval '1 day'
    FROM clinzo.dispatch_offer offer
    JOIN clinzo.driver_shift shift ON shift.id=offer.shift_id
    JOIN clinzo.driver d ON d.id=shift.driver_id
    WHERE offer.round_id=NEW.aggregate_id AND offer.status='pending' AND d.active
    ON CONFLICT (dedup_key) DO NOTHING;
    RETURN NEW;
  END IF;

  IF NEW.event_type IN ('ambulance.assigned','ambulance.unfulfilled','ambulance.cancelled')
    AND NEW.aggregate_type='ambulance_booking' THEN
    booking_id:=NEW.aggregate_id;
  ELSIF NEW.event_type IN ('ambulance.trip_arrived_at_pickup','ambulance.trip_in_progress',
    'ambulance.trip_arrived_at_destination','ambulance.trip_completed')
    AND NEW.aggregate_type='trip' THEN
    SELECT t.booking_id INTO booking_id FROM clinzo.trip t WHERE t.id=NEW.aggregate_id;
  ELSE RETURN NEW; END IF;

  SELECT b.requested_by,b.public_code,b.status INTO recipient,code,status
    FROM clinzo.ambulance_booking b WHERE b.id=booking_id;
  IF recipient IS NULL OR recipient=NEW.actor_id THEN RETURN NEW; END IF;
  INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
    VALUES(recipient,NEW.id,NEW.event_type,
      'ambulance:'||NEW.id||':'||recipient,
      jsonb_build_object('booking_code',code,'booking_id',booking_id,'status',status),
      now()+interval '30 days')
    ON CONFLICT (dedup_key) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER ambulance_notification_event
AFTER INSERT ON clinzo.domain_event
FOR EACH ROW EXECUTE FUNCTION clinzo.notify_ambulance_event();

REVOKE ALL ON FUNCTION clinzo.notify_ambulance_event() FROM PUBLIC, anon, authenticated;
