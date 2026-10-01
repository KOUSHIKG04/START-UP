-- Keep one effective consultation location on the facility (including a solo clinic).
-- Existing facilities remain valid; structured address parts are optional for legacy rows.
ALTER TABLE clinzo.facility
  ADD COLUMN locality text,
  ADD COLUMN city text,
  ADD COLUMN state text,
  ADD COLUMN pincode text;

ALTER TABLE clinzo.facility
  ADD CONSTRAINT facility_locality_length_ck CHECK (locality IS NULL OR length(locality) BETWEEN 2 AND 120),
  ADD CONSTRAINT facility_city_length_ck CHECK (city IS NULL OR length(city) BETWEEN 2 AND 120),
  ADD CONSTRAINT facility_state_length_ck CHECK (state IS NULL OR length(state) BETWEEN 2 AND 120),
  ADD CONSTRAINT facility_pincode_format_ck CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$');

-- Only a doctor who owns the clinic's organization may edit its practice address.
-- Doctors claiming an existing hospital cannot use this to change that hospital.
CREATE FUNCTION public.update_my_owned_clinic_location(p_facility_id uuid, p_location jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := clinzo.require_identity();
  clinic clinzo.facility;
  lat double precision;
  lng double precision;
  clinic_name text := trim(coalesce(p_location->>'name',''));
  address_text text := trim(coalesce(p_location->>'address',''));
  locality_text text := trim(coalesce(p_location->>'locality',''));
  city_text text := trim(coalesce(p_location->>'city',''));
  state_text text := trim(coalesce(p_location->>'state',''));
  pincode_text text := trim(coalesce(p_location->>'pincode',''));
BEGIN
  IF p_facility_id IS NULL OR jsonb_typeof(p_location) IS DISTINCT FROM 'object'
    OR length(clinic_name) NOT BETWEEN 2 AND 160
    OR length(address_text) NOT BETWEEN 5 AND 500
    OR length(locality_text) NOT BETWEEN 2 AND 120
    OR length(city_text) NOT BETWEEN 2 AND 120
    OR length(state_text) NOT BETWEEN 2 AND 120
    OR pincode_text !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid clinic location' USING ERRCODE='22023';
  END IF;
  lat := (p_location->>'latitude')::double precision;
  lng := (p_location->>'longitude')::double precision;
  IF lat IS NULL OR lng IS NULL OR NOT (lat BETWEEN -90 AND 90)
    OR NOT (lng BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'Invalid clinic coordinates' USING ERRCODE='22023';
  END IF;
  SELECT f.* INTO clinic FROM clinzo.facility f
    JOIN clinzo.organization o ON o.id=f.organization_id
    JOIN clinzo.organization_member m ON m.organization_id=o.id
    JOIN clinzo.doctor_facility df ON df.facility_id=f.id
    JOIN clinzo.doctor d ON d.id=df.doctor_id
    WHERE f.id=p_facility_id AND f.kind='clinic' AND f.active AND o.active
      AND o.kind='care_provider' AND m.identity_id=actor AND m.active
      AND m.facility_id IS NULL AND m.role='owner' AND df.active
      AND d.identity_id=actor AND d.active
      AND d.credential_status <> 'suspended'
    FOR UPDATE OF f;
  IF clinic.id IS NULL THEN
    RAISE EXCEPTION 'Owned clinic unavailable' USING ERRCODE='42501';
  END IF;
  UPDATE clinzo.facility SET name=clinic_name, address=address_text,
    locality=locality_text, city=city_text, state=state_text, pincode=pincode_text,
    location=extensions.ST_SetSRID(extensions.ST_MakePoint(lng,lat),4326)::extensions.geography
    WHERE id=clinic.id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,organization_id,facility_id,request_id,outcome,metadata)
    VALUES(actor,'identity','clinic.location.updated','facility',clinic.id,clinic.organization_id,clinic.id,gen_random_uuid(),'allowed','{}'::jsonb);
  RETURN jsonb_build_object('facility_id',clinic.id,'name',clinic_name,'address',address_text,
    'locality',locality_text,'city',city_text,'state',state_text,'pincode',pincode_text,
    'latitude',lat,'longitude',lng);
END $$;
REVOKE ALL ON FUNCTION public.update_my_owned_clinic_location(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_owned_clinic_location(uuid,jsonb) TO authenticated;

-- A trusted company reviewer links an employed doctor only after credential
-- review and independent evidence of the facility relationship. The doctor app
-- submits a name claim, never permission to attach itself to that facility.
CREATE FUNCTION clinzo.record_manual_doctor_facility_association(
  p_doctor_id uuid, p_facility_id uuid, p_reviewer_reference text, p_evidence_reference text
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE link_id uuid; organization_id uuid;
BEGIN
  IF p_doctor_id IS NULL OR p_facility_id IS NULL
    OR length(trim(coalesce(p_reviewer_reference,''))) NOT BETWEEN 3 AND 120
    OR length(trim(coalesce(p_evidence_reference,''))) NOT BETWEEN 3 AND 240 THEN
    RAISE EXCEPTION 'Doctor, facility and review references are required' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.doctor d
    JOIN clinzo.doctor_onboarding_claim c ON c.doctor_id=d.id
    WHERE d.id=p_doctor_id AND d.active AND d.credential_status='verified') THEN
    RAISE EXCEPTION 'Verified doctor claim required' USING ERRCODE='22023';
  END IF;
  SELECT f.organization_id INTO organization_id FROM clinzo.facility f
    JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.id=p_facility_id AND f.active AND o.active AND o.kind='care_provider';
  IF organization_id IS NULL THEN
    RAISE EXCEPTION 'Active care facility required' USING ERRCODE='22023';
  END IF;
  INSERT INTO clinzo.doctor_facility(doctor_id,facility_id)
    VALUES(p_doctor_id,p_facility_id)
    ON CONFLICT (doctor_id,facility_id) DO NOTHING
    RETURNING id INTO link_id;
  IF link_id IS NULL THEN
    SELECT id INTO link_id FROM clinzo.doctor_facility
      WHERE doctor_id=p_doctor_id AND facility_id=p_facility_id AND active;
    IF link_id IS NULL THEN
      RAISE EXCEPTION 'Inactive practice association requires a separate review' USING ERRCODE='22023';
    END IF;
    RETURN link_id;
  END IF;
  INSERT INTO clinzo.audit_log(actor_kind,action,resource_type,resource_id,organization_id,facility_id,request_id,outcome,metadata)
    VALUES('system','doctor.facility.manual_association','doctor_facility',link_id,organization_id,p_facility_id,
      gen_random_uuid(),'allowed',jsonb_build_object('doctor_id',p_doctor_id,
        'reviewer_reference',trim(p_reviewer_reference),'evidence_reference',trim(p_evidence_reference)));
  RETURN link_id;
END $$;
REVOKE ALL ON FUNCTION clinzo.record_manual_doctor_facility_association(uuid,uuid,text,text)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION clinzo.record_manual_doctor_facility_association(uuid,uuid,text,text) IS
  'Trusted database administration only, after manual facility affiliation review; never call from client apps.';
