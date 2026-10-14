-- Optimistic inventory conflicts are HTTP 409 business errors, not retryable
-- serialization failures. PostgREST 14 retries custom 40001 errors indefinitely.
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
      RAISE EXCEPTION 'Inventory changed; refresh and retry' USING ERRCODE='PT409';
    END IF;
    INSERT INTO clinzo.facility_bed_inventory(facility_id,bed_type_id,total,occupied,maintenance,observed_at,updated_by)
      VALUES(p_facility_id,p_bed_type_id,p_total,p_occupied,p_maintenance,now(),actor)
      ON CONFLICT (facility_id,bed_type_id) DO NOTHING RETURNING * INTO current_row;
    IF current_row.id IS NULL THEN
      RAISE EXCEPTION 'Inventory changed; refresh and retry' USING ERRCODE='PT409';
    END IF;
  ELSE
    IF current_row.row_version<>p_expected_version THEN
      RAISE EXCEPTION 'Inventory changed; refresh and retry' USING ERRCODE='PT409';
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
