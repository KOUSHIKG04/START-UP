-- Self-registered hospitals are not patient-facing until company review.
CREATE OR REPLACE FUNCTION public.list_public_hospitals(p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE patient_position extensions.geography;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR (p_latitude IS NULL) <> (p_longitude IS NULL)
    OR (p_latitude IS NOT NULL AND NOT(p_latitude BETWEEN -90 AND 90 AND p_longitude BETWEEN -180 AND 180)) THEN
    RAISE EXCEPTION 'Invalid hospital search' USING ERRCODE='22023'; END IF;
  IF p_latitude IS NOT NULL THEN
    patient_position:=extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography;
  END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(hospital_row)) FROM (
    SELECT f.id,f.name,f.address,
      extensions.ST_Y(f.location::extensions.geometry) AS latitude,
      extensions.ST_X(f.location::extensions.geometry) AS longitude,
      CASE WHEN patient_position IS NULL THEN NULL
        ELSE round(extensions.ST_Distance(f.location,patient_position))::integer END AS distance_meters
    FROM clinzo.facility f JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.kind='hospital' AND f.active AND f.verification_status='verified' AND o.active
    ORDER BY CASE WHEN patient_position IS NULL THEN NULL
      ELSE extensions.ST_Distance(f.location,patient_position) END NULLS LAST,
      f.name,f.id LIMIT p_limit
  ) hospital_row),'[]'::jsonb);
END $$;

CREATE FUNCTION clinzo.require_verified_hospital_destination() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.destination_facility_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM clinzo.facility f JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.id=NEW.destination_facility_id AND f.kind='hospital' AND f.active
      AND f.verification_status='verified' AND o.active) THEN
    RAISE EXCEPTION 'Destination hospital is not company verified' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.require_verified_hospital_destination() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER require_verified_hospital_destination
  BEFORE INSERT OR UPDATE OF destination_facility_id ON clinzo.ambulance_booking
  FOR EACH ROW EXECUTE FUNCTION clinzo.require_verified_hospital_destination();
