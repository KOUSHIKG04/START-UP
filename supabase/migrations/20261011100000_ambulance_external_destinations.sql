ALTER TABLE clinzo.ambulance_booking ADD COLUMN destination_google_place_id text;
ALTER TABLE clinzo.ambulance_booking ADD CONSTRAINT ambulance_external_destination_ck CHECK (
  destination_google_place_id IS NULL OR (destination_facility_id IS NULL AND destination_position IS NOT NULL
    AND length(destination_google_place_id) BETWEEN 1 AND 300));
CREATE OR REPLACE FUNCTION public.list_public_hospitals(p_latitude double precision DEFAULT NULL,p_longitude double precision DEFAULT NULL,p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE patient_position extensions.geography;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR (p_latitude IS NULL) <> (p_longitude IS NULL)
    OR (p_latitude IS NOT NULL AND NOT (p_latitude BETWEEN -90 AND 90 AND p_longitude BETWEEN -180 AND 180)) THEN
    RAISE EXCEPTION 'Invalid hospital search' USING ERRCODE='22023'; END IF;
  IF p_latitude IS NOT NULL THEN
    patient_position := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography;
  END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(hospital_row)) FROM (
    SELECT f.id,f.name,f.address,
      extensions.ST_Y(f.location::extensions.geometry) AS latitude,
      extensions.ST_X(f.location::extensions.geometry) AS longitude,
      CASE WHEN patient_position IS NULL THEN NULL ELSE round(extensions.ST_Distance(f.location,patient_position))::integer END AS distance_meters
    FROM clinzo.facility f JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.kind IN ('hospital','clinic') AND f.verification_status='verified' AND f.active AND o.active
    ORDER BY CASE WHEN patient_position IS NULL THEN NULL ELSE extensions.ST_Distance(f.location,patient_position) END NULLS LAST,
      f.name,f.id LIMIT p_limit
  ) hospital_row),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.request_ambulance_booking(p_patient_id uuid,p_pickup_latitude double precision,p_pickup_longitude double precision,
  p_pickup_address text,p_destination_facility_id uuid,p_capability_code text,p_idempotency_key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); patient_row clinzo.patient; hospital clinzo.facility;
  capability_id uuid; booking_id uuid; fingerprint bytea; replay clinzo.idempotency_record; v_verified_phone text;
BEGIN
  IF p_patient_id IS NULL OR p_destination_facility_id IS NULL OR p_idempotency_key IS NULL
    OR p_pickup_latitude IS NULL OR p_pickup_longitude IS NULL
    OR NOT (p_pickup_latitude BETWEEN -90 AND 90 AND p_pickup_longitude BETWEEN -180 AND 180)
    OR p_pickup_address IS NULL OR length(trim(p_pickup_address)) NOT BETWEEN 5 AND 500
    OR p_capability_code NOT IN ('BLS','ALS','NICU') THEN
    RAISE EXCEPTION 'Invalid ambulance booking request' USING ERRCODE='22023'; END IF;
  SELECT p.* INTO patient_row FROM clinzo.patient p JOIN clinzo.patient_access pa ON pa.patient_id=p.id
    WHERE p.id=p_patient_id AND pa.identity_id=actor AND pa.relationship='self'
      AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL;
  IF patient_row.id IS NULL THEN RAISE EXCEPTION 'Patient access required' USING ERRCODE='42501'; END IF;
  SELECT f.* INTO hospital FROM clinzo.facility f JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.id=p_destination_facility_id AND f.kind IN ('hospital','clinic') AND f.verification_status='verified' AND f.active AND o.active;
  IF hospital.id IS NULL THEN RAISE EXCEPTION 'Destination hospital unavailable' USING ERRCODE='22023'; END IF;
  SELECT id INTO capability_id FROM clinzo.capability WHERE code=p_capability_code;
  IF capability_id IS NULL THEN RAISE EXCEPTION 'Ambulance capability unavailable' USING ERRCODE='22023'; END IF;
  fingerprint := sha256(convert_to(jsonb_build_array(p_patient_id,p_pickup_latitude,p_pickup_longitude,
    trim(p_pickup_address),p_destination_facility_id,p_capability_code)::text,'UTF8'));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_patient_id::text,1));
  SELECT * INTO replay FROM clinzo.idempotency_record WHERE principal_scope=actor::text
    AND operation='ambulance.book' AND key=p_idempotency_key::text;
  IF replay.id IS NOT NULL THEN
    IF replay.request_hash<>fingerprint THEN RAISE EXCEPTION 'Request key used with different details' USING ERRCODE='22023'; END IF;
    RETURN replay.resource_id;
  END IF;
  IF EXISTS(SELECT 1 FROM clinzo.ambulance_booking b WHERE b.patient_id=p_patient_id AND b.status IN ('searching','assigned')) THEN
    RAISE EXCEPTION 'Patient already has an active ambulance request' USING ERRCODE='23505'; END IF;
  SELECT i.verified_phone INTO v_verified_phone FROM clinzo.identity i WHERE i.id=actor;
  INSERT INTO clinzo.ambulance_booking(public_code,patient_id,requested_by,booking_type,status,priority,
    pickup_position,pickup_address,destination_facility_id,destination_position,destination_address,
    patient_name_snapshot,contact_phone_snapshot)
    VALUES('AMB-'||gen_random_uuid()::text,p_patient_id,actor,'normal','searching',0,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_pickup_longitude,p_pickup_latitude),4326)::extensions.geography,
      trim(p_pickup_address),hospital.id,hospital.location,hospital.address,patient_row.full_name,coalesce(v_verified_phone,patient_row.contact_phone))
    RETURNING id INTO booking_id;
  INSERT INTO clinzo.booking_capability(booking_id,capability_id) VALUES(booking_id,capability_id);
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'ambulance.book',p_idempotency_key::text,fingerprint,'ambulance_booking',booking_id,'created',now()+interval '30 days');
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    VALUES('ambulance.requested','ambulance_booking',booking_id,1,actor,gen_random_uuid(),jsonb_build_object('booking_type','normal'));
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','ambulance.requested','ambulance_booking',booking_id,gen_random_uuid(),'allowed','{}');
  RETURN booking_id;
END $$;


CREATE OR REPLACE FUNCTION public.request_google_ambulance_booking(p_auth_user_id uuid,p_patient_id uuid,p_pickup_latitude double precision,p_pickup_longitude double precision,
  p_pickup_address text,p_destination_place_id text,p_destination_name text,p_destination_address text,p_destination_latitude double precision,p_destination_longitude double precision,p_capability_code text,p_idempotency_key uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; patient_row clinzo.patient; hospital clinzo.facility;
  capability_id uuid; booking_id uuid; fingerprint bytea; replay clinzo.idempotency_record; v_verified_phone text;
BEGIN
  SELECT id INTO actor FROM clinzo.identity WHERE issuer='supabase' AND subject=p_auth_user_id::text AND disabled_at IS NULL;
  IF actor IS NULL THEN RAISE EXCEPTION 'Patient identity required' USING ERRCODE='42501'; END IF;
  IF p_patient_id IS NULL OR p_destination_place_id IS NULL OR length(p_destination_place_id) NOT BETWEEN 1 AND 300
    OR p_destination_place_id !~ '^[A-Za-z0-9_-]+$'
    OR p_destination_name IS NULL OR length(trim(p_destination_name)) NOT BETWEEN 1 AND 200
    OR p_destination_address IS NULL OR length(trim(p_destination_address)) NOT BETWEEN 5 AND 500
    OR p_destination_latitude IS NULL OR p_destination_longitude IS NULL
    OR NOT (p_destination_latitude BETWEEN -90 AND 90 AND p_destination_longitude BETWEEN -180 AND 180) OR p_idempotency_key IS NULL
    OR p_pickup_latitude IS NULL OR p_pickup_longitude IS NULL
    OR NOT (p_pickup_latitude BETWEEN -90 AND 90 AND p_pickup_longitude BETWEEN -180 AND 180)
    OR p_pickup_address IS NULL OR length(trim(p_pickup_address)) NOT BETWEEN 5 AND 500
    OR p_capability_code NOT IN ('BLS','ALS','NICU') THEN
    RAISE EXCEPTION 'Invalid ambulance booking request' USING ERRCODE='22023'; END IF;
  SELECT p.* INTO patient_row FROM clinzo.patient p JOIN clinzo.patient_access pa ON pa.patient_id=p.id
    WHERE p.id=p_patient_id AND pa.identity_id=actor AND pa.relationship='self'
      AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL;
  IF patient_row.id IS NULL THEN RAISE EXCEPTION 'Patient access required' USING ERRCODE='42501'; END IF;
  SELECT id INTO capability_id FROM clinzo.capability WHERE code=p_capability_code;
  IF capability_id IS NULL THEN RAISE EXCEPTION 'Ambulance capability unavailable' USING ERRCODE='22023'; END IF;
  fingerprint := sha256(convert_to(jsonb_build_array(p_patient_id,p_pickup_latitude,p_pickup_longitude,
    trim(p_pickup_address),p_destination_place_id,p_destination_name,p_destination_address,p_destination_latitude,p_destination_longitude,p_capability_code)::text,'UTF8'));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_patient_id::text,1));
  SELECT * INTO replay FROM clinzo.idempotency_record WHERE principal_scope=actor::text
    AND operation='ambulance.book' AND key=p_idempotency_key::text;
  IF replay.id IS NOT NULL THEN
    IF replay.request_hash<>fingerprint THEN RAISE EXCEPTION 'Request key used with different details' USING ERRCODE='22023'; END IF;
    RETURN replay.resource_id;
  END IF;
  IF EXISTS(SELECT 1 FROM clinzo.ambulance_booking b WHERE b.patient_id=p_patient_id AND b.status IN ('searching','assigned')) THEN
    RAISE EXCEPTION 'Patient already has an active ambulance request' USING ERRCODE='23505'; END IF;
  SELECT i.verified_phone INTO v_verified_phone FROM clinzo.identity i WHERE i.id=actor;
  INSERT INTO clinzo.ambulance_booking(public_code,patient_id,requested_by,booking_type,status,priority,
    pickup_position,pickup_address,destination_facility_id,destination_google_place_id,destination_position,destination_address,
    patient_name_snapshot,contact_phone_snapshot)
    VALUES('AMB-'||gen_random_uuid()::text,p_patient_id,actor,'normal','searching',0,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_pickup_longitude,p_pickup_latitude),4326)::extensions.geography,
      trim(p_pickup_address),NULL,p_destination_place_id,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_destination_longitude,p_destination_latitude),4326)::extensions.geography,
      trim(p_destination_name)||', '||trim(p_destination_address),patient_row.full_name,coalesce(v_verified_phone,patient_row.contact_phone))
    RETURNING id INTO booking_id;
  INSERT INTO clinzo.booking_capability(booking_id,capability_id) VALUES(booking_id,capability_id);
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'ambulance.book',p_idempotency_key::text,fingerprint,'ambulance_booking',booking_id,'created',now()+interval '30 days');
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    VALUES('ambulance.requested','ambulance_booking',booking_id,1,actor,gen_random_uuid(),jsonb_build_object('booking_type','normal'));
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','ambulance.requested','ambulance_booking',booking_id,gen_random_uuid(),'allowed','{}');
  RETURN booking_id;
END $$;


REVOKE ALL ON FUNCTION public.request_google_ambulance_booking(uuid,uuid,double precision,double precision,text,text,text,text,double precision,double precision,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_google_ambulance_booking(uuid,uuid,double precision,double precision,text,text,text,text,double precision,double precision,text,uuid) TO service_role;
-- Bound provider calls per patient before invoking the paid Places service.
CREATE FUNCTION public.authorize_ambulance_hospital_lookup() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM clinzo.patient_access pa JOIN clinzo.patient p ON p.id=pa.patient_id
    WHERE pa.identity_id=actor AND pa.relationship='self' AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL AND p.archived_at IS NULL) THEN
    RAISE EXCEPTION 'Patient account required' USING ERRCODE='42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,87));
  IF (SELECT count(*) FROM clinzo.idempotency_record WHERE principal_scope=actor::text
    AND operation='ambulance.places_lookup' AND expires_at>now())>=20 THEN RETURN false; END IF;
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor::text,'ambulance.places_lookup',gen_random_uuid()::text,sha256(convert_to(actor::text,'UTF8')),
      'provider_lookup',actor,'authorized',now()+interval '1 minute');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.authorize_ambulance_hospital_lookup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_ambulance_hospital_lookup() TO authenticated;
