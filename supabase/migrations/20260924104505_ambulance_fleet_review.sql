-- Vehicle and required clinical crew are reviewed by company operations, not by the driver.
CREATE TABLE clinzo.vehicle_review_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  driver_id uuid NOT NULL REFERENCES clinzo.driver(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES clinzo.vehicle(id) ON DELETE RESTRICT,
  capability_id uuid NOT NULL REFERENCES clinzo.capability(id) ON DELETE RESTRICT,
  equipment_notes text NOT NULL CHECK (length(equipment_notes) BETWEEN 10 AND 1000),
  crew_notes text NOT NULL CHECK (length(crew_notes) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  reviewed_at timestamptz,
  approved_until timestamptz,
  reviewer_reference text,
  evidence_reference text,
  review_note text,
  CONSTRAINT vehicle_review_decision_ck CHECK (
    (status='pending' AND reviewed_at IS NULL AND approved_until IS NULL)
    OR (status='approved' AND reviewed_at IS NOT NULL AND approved_until > reviewed_at)
    OR (status IN ('rejected','revoked') AND reviewed_at IS NOT NULL AND approved_until IS NULL)
  )
);
ALTER TABLE clinzo.vehicle_review_request ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX vehicle_review_pending_uq ON clinzo.vehicle_review_request(driver_id,vehicle_id,capability_id) WHERE status='pending';
CREATE INDEX vehicle_review_approved_idx ON clinzo.vehicle_review_request(driver_id,vehicle_id,capability_id,approved_until) WHERE status='approved';
CREATE TRIGGER touch_row BEFORE UPDATE ON clinzo.vehicle_review_request FOR EACH ROW EXECUTE FUNCTION clinzo.touch_row();
CREATE TRIGGER immutable_vehicle_review BEFORE UPDATE ON clinzo.vehicle_review_request FOR EACH ROW
  EXECUTE FUNCTION clinzo.prevent_reparenting('driver_id','vehicle_id','capability_id','equipment_notes','crew_notes');
REVOKE ALL ON TABLE clinzo.vehicle_review_request FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.register_my_ambulance_vehicle(
  p_registration_number text,p_display_label text,p_inspection_expires_on date,
  p_capability_code text,p_equipment_notes text,p_crew_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); my_driver clinzo.driver; vehicle_id uuid; capability_id uuid;
BEGIN
  SELECT d.* INTO my_driver FROM clinzo.driver d JOIN clinzo.organization o ON o.id=d.organization_id
    WHERE d.identity_id=actor AND d.active AND o.active AND o.kind IN ('ambulance_operator','mixed');
  IF my_driver.id IS NULL THEN RAISE EXCEPTION 'Driver profile required' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_registration_number,''))) NOT BETWEEN 4 AND 32
    OR length(trim(coalesce(p_display_label,''))) NOT BETWEEN 2 AND 100
    OR p_inspection_expires_on IS NULL OR p_inspection_expires_on<=current_date
    OR length(trim(coalesce(p_equipment_notes,''))) NOT BETWEEN 10 AND 1000
    OR length(trim(coalesce(p_crew_notes,''))) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Complete vehicle, inspection, equipment and crew details required' USING ERRCODE='22023'; END IF;
  SELECT c.id INTO capability_id FROM clinzo.capability c WHERE c.code=p_capability_code;
  IF capability_id IS NULL THEN RAISE EXCEPTION 'Unknown ambulance capability' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.vehicle(organization_id,registration_number,display_label,inspection_expires_on,active)
    VALUES(my_driver.organization_id,upper(trim(p_registration_number)),trim(p_display_label),p_inspection_expires_on,true)
    RETURNING id INTO vehicle_id;
  INSERT INTO clinzo.vehicle_review_request(driver_id,vehicle_id,capability_id,equipment_notes,crew_notes)
    VALUES(my_driver.id,vehicle_id,capability_id,trim(p_equipment_notes),trim(p_crew_notes));
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,organization_id,request_id,outcome,metadata)
    VALUES(actor,'identity','vehicle.review_requested','vehicle',vehicle_id,my_driver.organization_id,gen_random_uuid(),'allowed',
      jsonb_build_object('capability_code',p_capability_code));
  RETURN vehicle_id;
END $$;

CREATE FUNCTION public.list_my_ambulance_fleet() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(fleet_row)) FROM (
    SELECT v.id AS vehicle_id,v.registration_number,v.display_label,v.inspection_expires_on,
      c.code AS capability_code,r.status AS review_status,r.approved_until,
      s.id AS active_shift_id,s.desired_availability,
      (d.verification_status='verified' AND d.license_expires_on>current_date
        AND v.inspection_expires_on>current_date AND r.status='approved' AND r.approved_until>now()) AS ready_to_go_available
    FROM clinzo.driver d JOIN clinzo.vehicle v ON v.organization_id=d.organization_id
      JOIN clinzo.vehicle_review_request r ON r.vehicle_id=v.id AND r.driver_id=d.id
      JOIN clinzo.capability c ON c.id=r.capability_id
      LEFT JOIN clinzo.driver_shift s ON s.driver_id=d.id AND s.vehicle_id=v.id AND s.ended_at IS NULL
    WHERE d.identity_id=actor AND d.active AND v.active
    ORDER BY r.created_at DESC LIMIT 50
  ) fleet_row),'[]'::jsonb);
END $$;

-- PostgreSQL administration executes this only after the company completes its manual review.
-- The future company reviewer app must call a separately authorized server boundary.
CREATE FUNCTION clinzo.record_manual_fleet_review(
  p_request_id uuid,p_decision text,p_approved_until timestamptz,
  p_reviewer_reference text,p_evidence_reference text,p_review_note text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE review_request clinzo.vehicle_review_request; registration clinzo.vehicle;
BEGIN
  IF p_decision NOT IN ('approved','rejected','revoked')
    OR length(trim(coalesce(p_reviewer_reference,''))) NOT BETWEEN 3 AND 120
    OR length(trim(coalesce(p_evidence_reference,''))) NOT BETWEEN 3 AND 240
    OR length(trim(coalesce(p_review_note,''))) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'Decision, reviewer, evidence and note required' USING ERRCODE='22023'; END IF;
  SELECT * INTO review_request FROM clinzo.vehicle_review_request WHERE id=p_request_id FOR UPDATE;
  IF review_request.id IS NULL OR review_request.status NOT IN ('pending','approved') THEN
    RAISE EXCEPTION 'Review request is not actionable' USING ERRCODE='22023'; END IF;
  SELECT * INTO registration FROM clinzo.vehicle WHERE id=review_request.vehicle_id;
  IF p_decision='approved' AND (review_request.status<>'pending'
    OR p_approved_until IS NULL OR p_approved_until<=now()
    OR p_approved_until>now()+interval '1 year'
    OR registration.inspection_expires_on<=current_date) THEN
    RAISE EXCEPTION 'Approval must be current and within the inspection period' USING ERRCODE='22023'; END IF;
  IF p_decision<>'approved' AND p_approved_until IS NOT NULL THEN
    RAISE EXCEPTION 'Non-approval cannot carry an expiry' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.vehicle_review_request SET status=p_decision,reviewed_at=now(),
    approved_until=CASE WHEN p_decision='approved' THEN p_approved_until ELSE NULL END,
    reviewer_reference=trim(p_reviewer_reference),evidence_reference=trim(p_evidence_reference),
    review_note=trim(p_review_note) WHERE id=p_request_id;
  IF p_decision='approved' THEN
    INSERT INTO clinzo.vehicle_capability(vehicle_id,capability_id,verified_at,expires_at)
      VALUES(review_request.vehicle_id,review_request.capability_id,now(),p_approved_until)
      ON CONFLICT(vehicle_id,capability_id) DO UPDATE SET verified_at=excluded.verified_at,expires_at=excluded.expires_at;
  ELSE
    DELETE FROM clinzo.vehicle_capability WHERE vehicle_id=review_request.vehicle_id AND capability_id=review_request.capability_id;
    UPDATE clinzo.driver_shift SET desired_availability='offline'
      WHERE driver_id=review_request.driver_id AND vehicle_id=review_request.vehicle_id AND ended_at IS NULL;
  END IF;
  INSERT INTO clinzo.audit_log(actor_kind,action,resource_type,resource_id,organization_id,request_id,outcome,metadata)
    VALUES('system','fleet.manual_review','vehicle_review_request',p_request_id,registration.organization_id,
      gen_random_uuid(),'allowed',jsonb_build_object('decision',p_decision,'reviewer_reference',trim(p_reviewer_reference),
        'evidence_reference',trim(p_evidence_reference)));
END $$;

CREATE FUNCTION public.set_my_driver_availability(p_vehicle_id uuid,p_online boolean,p_latitude double precision DEFAULT NULL,
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
      VALUES(my_driver.id,p_vehicle_id,now(),'online',extensions.ST_Buffer(position,50000)::extensions.geography,
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

REVOKE ALL ON FUNCTION public.register_my_ambulance_vehicle(text,text,date,text,text,text),
  public.list_my_ambulance_fleet(),public.set_my_driver_availability(uuid,boolean,double precision,double precision)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_my_ambulance_vehicle(text,text,date,text,text,text),
  public.list_my_ambulance_fleet(),public.set_my_driver_availability(uuid,boolean,double precision,double precision)
  TO authenticated;
REVOKE ALL ON FUNCTION clinzo.record_manual_fleet_review(uuid,text,timestamptz,text,text,text)
  FROM PUBLIC,anon,authenticated,service_role;
