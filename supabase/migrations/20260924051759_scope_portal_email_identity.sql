-- Restore phone-only authorization for mobile clinic/driver workflows.
-- The preceding migration is immutable on the disposable test database.
CREATE OR REPLACE FUNCTION clinzo.require_identity(p_name text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid := clinzo.require_phone_user(); i clinzo.identity; verified_number text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
  SELECT phone INTO verified_number FROM auth.users WHERE id=u;
  SELECT * INTO i FROM clinzo.identity WHERE issuer='supabase' AND subject=u::text;
  IF i.disabled_at IS NOT NULL THEN RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501'; END IF;
  IF i.id IS NULL THEN
    IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
      RAISE EXCEPTION 'Complete your profile first' USING ERRCODE='22023';
    END IF;
    INSERT INTO clinzo.identity(issuer,subject,display_name,verified_phone)
      VALUES('supabase',u::text,trim(p_name),verified_number) RETURNING * INTO i;
  ELSIF i.verified_phone IS DISTINCT FROM verified_number THEN
    UPDATE clinzo.identity SET verified_phone=verified_number WHERE id=i.id RETURNING * INTO i;
  END IF;
  RETURN i.id;
END $$;

REVOKE ALL ON FUNCTION clinzo.require_identity(text) FROM PUBLIC,anon,authenticated;

-- Portal login is a separately verified email/password Auth account. It must
-- already be linked to a Clinzo identity and scoped organization membership;
-- neither is created from client input here.
CREATE FUNCTION clinzo.require_portal_identity() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid := auth.uid(); actor uuid;
BEGIN
  IF u IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id=u AND (banned_until IS NULL OR banned_until < now())
      AND ((email IS NOT NULL AND email_confirmed_at IS NOT NULL)
        OR (phone IS NOT NULL AND phone_confirmed_at IS NOT NULL))
  ) THEN
    RAISE EXCEPTION 'A verified portal account is required' USING ERRCODE='42501';
  END IF;
  SELECT id INTO actor FROM clinzo.identity
    WHERE issuer='supabase' AND subject=u::text AND disabled_at IS NULL;
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Portal membership setup is incomplete' USING ERRCODE='42501';
  END IF;
  RETURN actor;
END $$;
REVOKE ALL ON FUNCTION clinzo.require_portal_identity() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.list_my_inventory_facilities() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT DISTINCT f.id AS facility_id,f.name AS facility_name,f.kind AS facility_kind
    FROM clinzo.facility f JOIN clinzo.organization o ON o.id=f.organization_id
    JOIN clinzo.organization_member m ON m.organization_id=o.id
    WHERE m.identity_id=actor AND m.active AND f.active AND o.active
      AND o.kind IN ('care_provider','mixed')
      AND (m.facility_id IS NULL OR m.facility_id=f.id)
      AND m.role IN ('owner','organization_admin','facility_admin','receptionist')
    ORDER BY f.name,f.id LIMIT 100
  ) x),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.list_facility_bed_inventory(p_facility_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity();
BEGIN
  IF p_facility_id IS NULL OR NOT clinzo.can_access_facility_inventory(actor,p_facility_id,false) THEN
    RAISE EXCEPTION 'Facility inventory access required' USING ERRCODE='42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT i.id AS inventory_id,p_facility_id AS facility_id,
      b.id AS bed_type_id,b.code AS bed_type_code,b.name AS bed_type_name,
      coalesce(i.total,0) AS total,coalesce(i.occupied,0) AS occupied,
      coalesce(i.maintenance,0) AS maintenance,
      coalesce(i.total-i.occupied-i.maintenance,0) AS available,
      i.observed_at,i.row_version::text AS row_version,
      i.id IS NOT NULL AS configured
    FROM clinzo.bed_type b LEFT JOIN clinzo.facility_bed_inventory i
      ON i.bed_type_id=b.id AND i.facility_id=p_facility_id
    ORDER BY b.name,b.id LIMIT 100
  ) x),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.update_facility_bed_inventory(
  p_facility_id uuid,p_bed_type_id uuid,p_total integer,p_occupied integer,
  p_maintenance integer,p_expected_version bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity(); current_row clinzo.facility_bed_inventory;
  request_id uuid := gen_random_uuid();
BEGIN
  IF p_facility_id IS NULL OR NOT clinzo.can_access_facility_inventory(actor,p_facility_id,true) THEN
    RAISE EXCEPTION 'Facility inventory management required' USING ERRCODE='42501';
  END IF;
  IF p_bed_type_id IS NULL OR NOT EXISTS (SELECT 1 FROM clinzo.bed_type WHERE id=p_bed_type_id)
    OR p_total IS NULL OR p_occupied IS NULL OR p_maintenance IS NULL
    OR p_total<0 OR p_occupied<0 OR p_maintenance<0
    OR p_occupied::bigint+p_maintenance::bigint>p_total
    OR p_expected_version IS NULL OR p_expected_version<0 THEN
    RAISE EXCEPTION 'Invalid inventory counts or expected version' USING ERRCODE='22023';
  END IF;

  SELECT * INTO current_row FROM clinzo.facility_bed_inventory
    WHERE facility_id=p_facility_id AND bed_type_id=p_bed_type_id FOR UPDATE;
  IF current_row.id IS NULL THEN
    IF p_expected_version<>0 THEN
      RAISE EXCEPTION 'Inventory changed; refresh and retry' USING ERRCODE='40001';
    END IF;
    INSERT INTO clinzo.facility_bed_inventory(facility_id,bed_type_id,total,occupied,maintenance,observed_at,updated_by)
      VALUES(p_facility_id,p_bed_type_id,p_total,p_occupied,p_maintenance,now(),actor)
      ON CONFLICT (facility_id,bed_type_id) DO NOTHING RETURNING * INTO current_row;
    IF current_row.id IS NULL THEN
      RAISE EXCEPTION 'Inventory changed; refresh and retry' USING ERRCODE='40001';
    END IF;
  ELSE
    IF current_row.row_version<>p_expected_version THEN
      RAISE EXCEPTION 'Inventory changed; refresh and retry' USING ERRCODE='40001';
    END IF;
    UPDATE clinzo.facility_bed_inventory SET total=p_total,occupied=p_occupied,
      maintenance=p_maintenance,observed_at=now(),updated_by=actor
      WHERE id=current_row.id RETURNING * INTO current_row;
  END IF;

  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,actor_id,request_id,payload)
    VALUES('facility_bed_inventory.updated','facility_bed_inventory',current_row.id,
      current_row.row_version,actor,request_id,
      jsonb_build_object('facility_id',p_facility_id,'bed_type_id',p_bed_type_id,
        'total',p_total,'occupied',p_occupied,'maintenance',p_maintenance,
        'observed_at',current_row.observed_at));
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,
    organization_id,facility_id,request_id,outcome,metadata)
    SELECT actor,'identity','inventory.updated','facility_bed_inventory',current_row.id,
      f.organization_id,f.id,request_id,'allowed',
      jsonb_build_object('previous_version',p_expected_version,'new_version',current_row.row_version)
      FROM clinzo.facility f WHERE f.id=p_facility_id;

  RETURN (SELECT to_jsonb(x) FROM (
    SELECT current_row.id AS inventory_id,current_row.facility_id,
      b.id AS bed_type_id,b.code AS bed_type_code,b.name AS bed_type_name,
      current_row.total,current_row.occupied,current_row.maintenance,
      current_row.total-current_row.occupied-current_row.maintenance AS available,
      current_row.observed_at,current_row.row_version::text AS row_version,
      true AS configured FROM clinzo.bed_type b WHERE b.id=p_bed_type_id
  ) x);
END $$;


REVOKE ALL ON FUNCTION public.list_my_inventory_facilities(),
  public.list_facility_bed_inventory(uuid),
  public.update_facility_bed_inventory(uuid,uuid,integer,integer,integer,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_inventory_facilities(),
  public.list_facility_bed_inventory(uuid),
  public.update_facility_bed_inventory(uuid,uuid,integer,integer,integer,bigint)
  TO authenticated;
