-- Persist structured facility address fields already present on clinzo.facility.
CREATE OR REPLACE FUNCTION public.register_my_care_facility(p_registration jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE auth_user uuid := auth.uid(); actor uuid; organization_id uuid; facility_id uuid;
  facility_name text := trim(coalesce(p_registration->>'name',''));
  facility_kind text := trim(coalesce(p_registration->>'kind',''));
  facility_address text := trim(coalesce(p_registration->>'address',''));
  facility_locality text := trim(coalesce(p_registration->>'locality',''));
  facility_city text := trim(coalesce(p_registration->>'city',''));
  facility_state text := trim(coalesce(p_registration->>'state',''));
  facility_pincode text := trim(coalesce(p_registration->>'pincode',''));
  selected_types jsonb := p_registration->'bedTypeCodes';
  declared_beds boolean;
  latitude double precision; longitude double precision;
BEGIN
  IF auth_user IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth_user
    AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<now())) THEN
    RAISE EXCEPTION 'A confirmed facility email account is required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_registration) IS DISTINCT FROM 'object'
    OR length(facility_name) NOT BETWEEN 2 AND 160
    OR facility_kind NOT IN ('hospital','clinic')
    OR length(facility_address) NOT BETWEEN 5 AND 500
    OR length(facility_locality) NOT BETWEEN 2 AND 120
    OR length(facility_city) NOT BETWEEN 2 AND 120
    OR length(facility_state) NOT BETWEEN 2 AND 120
    OR facility_pincode !~ '^[0-9]{6}$'
    OR jsonb_typeof(p_registration->'offersBeds') IS DISTINCT FROM 'boolean'
    OR jsonb_typeof(selected_types) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Valid facility and bed-service declaration required' USING ERRCODE='22023'; END IF;
  declared_beds := (p_registration->>'offersBeds')::boolean;
  IF jsonb_array_length(selected_types) > 20
    OR (declared_beds AND jsonb_array_length(selected_types)=0)
    OR (NOT declared_beds AND jsonb_array_length(selected_types)<>0)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(selected_types) AS entry(value)
      WHERE jsonb_typeof(entry.value)<>'string'
        OR NOT EXISTS(SELECT 1 FROM clinzo.bed_type b WHERE b.code=entry.value #>> '{}'))
    OR (SELECT count(*) FROM jsonb_array_elements_text(selected_types)) <>
      (SELECT count(DISTINCT code) FROM jsonb_array_elements_text(selected_types) AS selected(code)) THEN
    RAISE EXCEPTION 'Select distinct existing bed categories only when beds are offered' USING ERRCODE='22023'; END IF;
  latitude := (p_registration->>'latitude')::double precision;
  longitude := (p_registration->>'longitude')::double precision;
  IF latitude IS NULL OR longitude IS NULL OR NOT(latitude BETWEEN -90 AND 90)
    OR NOT(longitude BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'Valid facility coordinates required' USING ERRCODE='22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth_user::text,0));
  SELECT i.id INTO actor FROM clinzo.identity i WHERE i.issuer='supabase'
    AND i.subject=auth_user::text AND i.disabled_at IS NULL;
  IF actor IS NULL THEN
    INSERT INTO clinzo.identity(issuer,subject,display_name)
      VALUES('supabase',auth_user::text,facility_name) RETURNING id INTO actor;
  END IF;
  IF EXISTS(SELECT 1 FROM clinzo.organization_member m WHERE m.identity_id=actor AND m.active
    AND m.role IN ('owner','organization_admin')) THEN
    RAISE EXCEPTION 'This account already owns an organization; ask Clinzo to add another facility' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.organization(public_code,name,kind)
    VALUES('ORG-'||gen_random_uuid()::text,facility_name,'care_provider') RETURNING id INTO organization_id;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,locality,city,state,pincode,location,verification_status,bed_service_declared)
    VALUES(organization_id,'FAC-'||gen_random_uuid()::text,facility_name,facility_kind,facility_address,
      facility_locality,facility_city,facility_state,facility_pincode,
      extensions.ST_SetSRID(extensions.ST_MakePoint(longitude,latitude),4326)::extensions.geography,
      'pending',declared_beds) RETURNING id INTO facility_id;
  INSERT INTO clinzo.facility_bed_offering(facility_id,bed_type_id)
    SELECT facility_id,b.id FROM clinzo.bed_type b
    JOIN jsonb_array_elements_text(selected_types) AS selected(code) ON selected.code=b.code;
  INSERT INTO clinzo.organization_member(identity_id,organization_id,role)
    VALUES(actor,organization_id,'owner');
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,
    organization_id,facility_id,request_id,outcome,metadata)
    VALUES(actor,'identity','facility.registered','facility',facility_id,
      organization_id,facility_id,gen_random_uuid(),'allowed',
      jsonb_build_object('offers_beds',declared_beds,'bed_type_codes',selected_types));
  RETURN facility_id;
END $$;

