-- Reviewed qualification is nullable until the future company reviewer supplies it.
ALTER TABLE clinzo.doctor ADD COLUMN qualification text;
ALTER TABLE clinzo.doctor ADD CONSTRAINT doctor_qualification_length_ck CHECK (qualification IS NULL OR length(qualification) BETWEEN 2 AND 160);

CREATE OR REPLACE FUNCTION public.search_public_practices(
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
    SELECT df.id AS practice_id,d.id AS doctor_id,d.public_code AS doctor_code,d.full_name AS doctor_name,d.qualification,
      f.id AS facility_id,f.public_code AS facility_code,f.name AS facility_name,f.kind AS facility_kind,
      f.address,f.timezone,ps.id AS practice_service_id,ps.code AS service_code,ps.name AS service_name,
      ps.fee_minor::text,ps.currency,ps.duration_minutes,
      pref.online_fee_minor::text AS online_fee_minor,
      (SELECT round(avg(r.rating)::numeric,1)::text FROM clinzo.doctor_review r
       JOIN clinzo.appointment a ON a.id=r.appointment_id
       JOIN clinzo.session rs ON rs.id=a.session_id
       WHERE rs.doctor_id=d.id AND r.moderation_state='published') AS rating,
      (SELECT count(*)::integer FROM clinzo.doctor_review r
       JOIN clinzo.appointment a ON a.id=r.appointment_id
       JOIN clinzo.session rs ON rs.id=a.session_id
       WHERE rs.doctor_id=d.id AND r.moderation_state='published') AS review_count,
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
    LEFT JOIN clinzo.doctor_schedule_preferences pref ON pref.doctor_facility_id=df.id
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

