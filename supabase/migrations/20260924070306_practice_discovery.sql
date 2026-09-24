-- Bounded, public, ID-based directory for verified practices. No identity or
-- clinical records are exposed. IDs allow patients to select the actual
-- practice rather than matching doctor/facility display names.
CREATE FUNCTION public.search_public_practices(
  p_query text DEFAULT NULL,
  p_specialty_code text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_practice_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  query_text text := nullif(trim(p_query),'');
  specialty_text text := nullif(trim(p_specialty_code),'');
  patient_position extensions.geography;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50
    OR length(coalesce(query_text,'')) > 100
    OR length(coalesce(specialty_text,'')) > 100
    OR ((p_latitude IS NULL) <> (p_longitude IS NULL))
    OR (p_latitude IS NOT NULL AND (p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180)) THEN
    RAISE EXCEPTION 'Invalid practice search' USING ERRCODE = '22023';
  END IF;
  IF p_latitude IS NOT NULL THEN
    patient_position := extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude,p_latitude),4326)::extensions.geography;
  END IF;
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT df.id AS practice_id,d.id AS doctor_id,d.public_code AS doctor_code,d.full_name AS doctor_name,
      f.id AS facility_id,f.public_code AS facility_code,f.name AS facility_name,f.kind AS facility_kind,
      f.address,f.timezone,ps.id AS practice_service_id,ps.code AS service_code,ps.name AS service_name,
      ps.fee_minor::text,ps.currency,ps.duration_minutes,
      greatest(0,extract(year FROM age(current_date,d.practice_started_on))::integer) AS experience_years,
      (SELECT coalesce(jsonb_agg(jsonb_build_object('code',sp.code,'name',sp.name) ORDER BY sp.name),'[]'::jsonb)
         FROM clinzo.doctor_specialty ds JOIN clinzo.specialty sp ON sp.id=ds.specialty_id
        WHERE ds.doctor_id=d.id AND sp.active) AS specialties,
      (SELECT coalesce(jsonb_agg(dl.language_code ORDER BY dl.language_code),'[]'::jsonb)
         FROM clinzo.doctor_language dl WHERE dl.doctor_id=d.id) AS languages,
      CASE WHEN patient_position IS NULL THEN NULL
        ELSE round(extensions.ST_Distance(f.location,patient_position))::integer END AS distance_meters
    FROM clinzo.practice_service ps
    JOIN clinzo.doctor_facility df ON df.id=ps.doctor_facility_id
    JOIN clinzo.doctor d ON d.id=df.doctor_id
    JOIN clinzo.facility f ON f.id=df.facility_id
    JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE ps.active AND df.active AND d.active AND d.credential_status='verified' AND f.active AND o.active
      AND (p_practice_id IS NULL OR df.id=p_practice_id)
      AND (specialty_text IS NULL OR EXISTS(
        SELECT 1 FROM clinzo.doctor_specialty ds JOIN clinzo.specialty sp ON sp.id=ds.specialty_id
        WHERE ds.doctor_id=d.id AND sp.active AND lower(sp.code)=lower(specialty_text)))
      AND (query_text IS NULL OR position(lower(query_text) IN lower(d.full_name))>0
        OR position(lower(query_text) IN lower(f.name))>0
        OR position(lower(query_text) IN lower(ps.name))>0
        OR EXISTS(SELECT 1 FROM clinzo.doctor_specialty ds JOIN clinzo.specialty sp ON sp.id=ds.specialty_id
          WHERE ds.doctor_id=d.id AND sp.active AND position(lower(query_text) IN lower(sp.name))>0)
        OR EXISTS(SELECT 1 FROM clinzo.symptom sy JOIN clinzo.symptom_specialty ss ON ss.symptom_id=sy.id
          JOIN clinzo.doctor_specialty ds ON ds.specialty_id=ss.specialty_id
          WHERE ds.doctor_id=d.id AND sy.active AND (position(lower(query_text) IN lower(sy.label))>0 OR lower(sy.code)=lower(query_text))))
    ORDER BY CASE WHEN patient_position IS NULL THEN NULL ELSE extensions.ST_Distance(f.location,patient_position) END NULLS LAST,
      d.full_name, f.name, ps.code, df.id
    LIMIT p_limit
  ) x),'[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.search_public_practices(text,text,double precision,double precision,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_practices(text,text,double precision,double precision,integer,uuid) TO anon,authenticated;

-- The global slot list is deliberately bounded. A selected practice needs a
-- server-side filter before LIMIT, otherwise its slots disappear in a busy city.
CREATE FUNCTION public.list_practice_clinic_slots(
  p_practice_id uuid,
  p_service_id uuid DEFAULT NULL,
  p_after timestamptz DEFAULT now(),
  p_limit integer DEFAULT 50
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_practice_id IS NULL OR p_after IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid practice slot search' USING ERRCODE='22023';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(x) FROM (
    SELECT w.id AS window_id,ps.id AS practice_service_id,p.id AS practice_id,d.full_name AS doctor_name,
      f.name AS facility_name,f.address,w.starts_at,w.ends_at,s.timezone,ps.fee_minor::text,ps.currency
    FROM clinzo.appointment_window w JOIN clinzo.session s ON s.id=w.session_id
    JOIN clinzo.session_service ss ON ss.session_id=s.id JOIN clinzo.practice_service ps ON ps.id=ss.practice_service_id
    JOIN clinzo.doctor_facility p ON p.id=s.doctor_facility_id JOIN clinzo.doctor d ON d.id=s.doctor_id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE p.id=p_practice_id AND (p_service_id IS NULL OR ps.id=p_service_id)
      AND w.state='open' AND s.state IN ('published','open') AND w.starts_at > greatest(now(),p_after)
      AND ps.active AND p.active AND d.active AND d.credential_status='verified' AND f.active AND o.active
      AND NOT EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=d.id AND e.state='active'
        AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p.id) AND e.starts_at<w.ends_at AND e.ends_at>w.starts_at)
      AND (SELECT count(*) FROM clinzo.appointment a WHERE a.window_id=w.id AND
        ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now()))) < w.hard_capacity
      AND (SELECT count(*) FROM clinzo.appointment a WHERE a.session_id=s.id AND
        ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR (a.status='pending' AND a.request_expires_at>now()))) < s.hard_capacity
    ORDER BY w.starts_at,w.id,ps.id LIMIT p_limit
  ) x),'[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.list_practice_clinic_slots(uuid,uuid,timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_practice_clinic_slots(uuid,uuid,timestamptz,integer) TO anon,authenticated;
