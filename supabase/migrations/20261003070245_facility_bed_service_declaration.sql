-- A registered facility's bed services are separate from its live inventory.
-- NULL preserves the legacy inventory behavior until an existing facility is reviewed.
ALTER TABLE clinzo.facility ADD COLUMN bed_service_declared boolean;

CREATE TABLE clinzo.facility_bed_offering (
  facility_id uuid NOT NULL REFERENCES clinzo.facility(id) ON DELETE RESTRICT,
  bed_type_id uuid NOT NULL REFERENCES clinzo.bed_type(id) ON DELETE RESTRICT,
  PRIMARY KEY (facility_id, bed_type_id)
);
ALTER TABLE clinzo.facility_bed_offering ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.facility_bed_offering FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.list_bed_type_catalog() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to view bed categories' USING ERRCODE='42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('code', b.code, 'name', b.name) ORDER BY b.name)
    FROM clinzo.bed_type b), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_bed_type_catalog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_bed_type_catalog() TO authenticated;

CREATE OR REPLACE FUNCTION public.register_my_care_facility(p_registration jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE auth_user uuid := auth.uid(); actor uuid; organization_id uuid; facility_id uuid;
  facility_name text := trim(coalesce(p_registration->>'name',''));
  facility_kind text := trim(coalesce(p_registration->>'kind',''));
  facility_address text := trim(coalesce(p_registration->>'address',''));
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
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status,bed_service_declared)
    VALUES(organization_id,'FAC-'||gen_random_uuid()::text,facility_name,facility_kind,facility_address,
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

-- Existing facilities remain unclassified; explicit new registrations show only
-- the categories declared at signup. Inventory counts are entered separately.
CREATE OR REPLACE FUNCTION public.list_facility_bed_inventory(p_facility_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity();
BEGIN
  IF p_facility_id IS NULL OR NOT clinzo.can_access_facility_inventory(actor,p_facility_id,false) THEN
    RAISE EXCEPTION 'Facility inventory access required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT i.id AS inventory_id,p_facility_id AS facility_id,
      b.id AS bed_type_id,b.code AS bed_type_code,b.name AS bed_type_name,
      coalesce(i.total,0) AS total,coalesce(i.occupied,0) AS occupied,
      coalesce(i.maintenance,0) AS maintenance,
      coalesce(i.total-i.occupied-i.maintenance,0) AS available,
      i.observed_at,i.row_version::text AS row_version,
      i.id IS NOT NULL AS configured
    FROM clinzo.facility f CROSS JOIN clinzo.bed_type b
    LEFT JOIN clinzo.facility_bed_inventory i
      ON i.bed_type_id=b.id AND i.facility_id=f.id
    WHERE f.id=p_facility_id AND (f.bed_service_declared IS NULL
      OR (f.bed_service_declared AND EXISTS(SELECT 1 FROM clinzo.facility_bed_offering o
        WHERE o.facility_id=f.id AND o.bed_type_id=b.id)))
    ORDER BY b.name,b.id LIMIT 100
  ) x),'[]'::jsonb);
END $$;

CREATE FUNCTION clinzo.enforce_declared_bed_offering() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE declaration boolean;
BEGIN
  SELECT f.bed_service_declared INTO declaration FROM clinzo.facility f WHERE f.id=NEW.facility_id;
  IF declaration IS NOT NULL AND (NOT declaration OR NOT EXISTS (
    SELECT 1 FROM clinzo.facility_bed_offering o
    WHERE o.facility_id=NEW.facility_id AND o.bed_type_id=NEW.bed_type_id)) THEN
    RAISE EXCEPTION 'Bed category is not offered by this facility' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.enforce_declared_bed_offering() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_declared_bed_offering
  BEFORE INSERT OR UPDATE ON clinzo.facility_bed_inventory
  FOR EACH ROW EXECUTE FUNCTION clinzo.enforce_declared_bed_offering();

CREATE FUNCTION public.get_company_facility_bed_declaration(p_case_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF clinzo.company_reviewer_identity() IS NULL THEN
    RAISE EXCEPTION 'Company reviewer required' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object('offers_beds',f.bed_service_declared,
    'bed_types',coalesce((SELECT jsonb_agg(b.name ORDER BY b.name)
      FROM clinzo.facility_bed_offering o JOIN clinzo.bed_type b ON b.id=o.bed_type_id
      WHERE o.facility_id=f.id),'[]'::jsonb)) INTO result
  FROM clinzo.verification_case c JOIN clinzo.facility f ON f.id=c.facility_id
  WHERE c.id=p_case_id;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_company_facility_bed_declaration(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_facility_bed_declaration(uuid) TO authenticated;
