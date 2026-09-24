CREATE FUNCTION public.request_my_sos(
  p_patient_id uuid,p_pickup_latitude double precision,p_pickup_longitude double precision,
  p_pickup_address text,p_summary text,p_idempotency_key uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); patient_row clinzo.patient; booking_id uuid;
  capability_id uuid; replay clinzo.idempotency_record; fingerprint bytea; phone text;
BEGIN
  IF p_patient_id IS NULL OR p_idempotency_key IS NULL OR p_pickup_latitude IS NULL OR p_pickup_longitude IS NULL
    OR NOT(p_pickup_latitude BETWEEN -90 AND 90 AND p_pickup_longitude BETWEEN -180 AND 180)
    OR length(trim(coalesce(p_pickup_address,''))) NOT BETWEEN 5 AND 500
    OR length(trim(coalesce(p_summary,''))) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'Current location and emergency details required' USING ERRCODE='22023'; END IF;
  SELECT p.* INTO patient_row FROM clinzo.patient p JOIN clinzo.patient_access pa ON pa.patient_id=p.id
    WHERE p.id=p_patient_id AND p.archived_at IS NULL AND pa.identity_id=actor AND pa.relationship='self'
      AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL;
  IF patient_row.id IS NULL THEN RAISE EXCEPTION 'Patient access required' USING ERRCODE='42501'; END IF;
  SELECT id INTO capability_id FROM clinzo.capability WHERE code='ALS';
  IF capability_id IS NULL THEN RAISE EXCEPTION 'ALS dispatch capability unavailable' USING ERRCODE='55000'; END IF;
  fingerprint:=sha256(convert_to(jsonb_build_array(p_patient_id,p_pickup_latitude,p_pickup_longitude,
    trim(p_pickup_address),trim(p_summary))::text,'UTF8'));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_patient_id::text,2));
  SELECT * INTO replay FROM clinzo.idempotency_record WHERE principal_scope=actor::text
    AND operation='ambulance.sos' AND key=p_idempotency_key::text;
  IF replay.id IS NOT NULL THEN
    IF replay.request_hash<>fingerprint THEN RAISE EXCEPTION 'Request key used with different details' USING ERRCODE='22023'; END IF;
    RETURN replay.resource_id;
  END IF;
  IF EXISTS(SELECT 1 FROM clinzo.ambulance_booking WHERE patient_id=p_patient_id AND booking_type='sos'
    AND status IN ('awaiting_location','searching','assigned')) THEN
    RAISE EXCEPTION 'An active SOS request already exists' USING ERRCODE='23505'; END IF;
  SELECT verified_phone INTO phone FROM clinzo.identity WHERE id=actor;
  INSERT INTO clinzo.ambulance_booking(public_code,patient_id,requested_by,booking_type,status,priority,
    pickup_position,pickup_address,patient_name_snapshot,contact_phone_snapshot)
    VALUES('SOS-'||gen_random_uuid()::text,p_patient_id,actor,'sos','searching',100,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_pickup_longitude,p_pickup_latitude),4326)::extensions.geography,
      trim(p_pickup_address),patient_row.full_name,phone) RETURNING id INTO booking_id;
  INSERT INTO clinzo.emergency_case(booking_id,reported_summary,opened_at)
    VALUES(booking_id,trim(p_summary),now());
  INSERT INTO clinzo.booking_capability(booking_id,capability_id) VALUES(booking_id,capability_id);
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'ambulance.sos',p_idempotency_key::text,fingerprint,'ambulance_booking',booking_id,'created',now()+interval '30 days');
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    VALUES('sos.requested','ambulance_booking',booking_id,1,actor,gen_random_uuid(),jsonb_build_object('priority',100));
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','sos.requested','ambulance_booking',booking_id,gen_random_uuid(),'allowed','{}');
  RETURN booking_id;
END $$;

REVOKE ALL ON FUNCTION public.request_my_sos(uuid,double precision,double precision,text,text,uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_my_sos(uuid,double precision,double precision,text,text,uuid)
  TO authenticated;
