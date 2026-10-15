CREATE OR REPLACE FUNCTION public.search_public_practices_for_mode(
  p_query text DEFAULT NULL,
  p_specialty_code text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_practice_id uuid DEFAULT NULL,
  p_service_mode text DEFAULT NULL,
  p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  query_text text := nullif(trim(p_query),'');
  specialty_text text := nullif(trim(p_specialty_code),'');
  patient_position extensions.geography;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50
    OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000
    OR (p_service_mode IS NOT NULL AND p_service_mode NOT IN ('clinic','online','home'))
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
    SELECT df.id AS practice_id,d.id AS doctor_id,d.public_code AS doctor_code,d.full_name AS doctor_name,d.qualification,d.bio,
      f.id AS facility_id,f.public_code AS facility_code,f.name AS facility_name,f.kind AS facility_kind,
      f.address,f.timezone,ps.id AS practice_service_id,coalesce(ps.code, modes.mode || '-unpublished') AS service_code,
      coalesce(ps.name, 'Clinic consultation') AS service_name,available.slot IS NOT NULL AS has_available_slots,
      ps.fee_minor::text,coalesce(ps.currency,'INR') AS currency,ps.duration_minutes,
      pref.online_fee_minor::text AS online_fee_minor,
      EXISTS(SELECT 1 FROM clinzo.practice_service enabled_service WHERE enabled_service.doctor_facility_id=df.id
        AND enabled_service.active AND enabled_service.code LIKE 'online-%') AS online_enabled,
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
    FROM clinzo.doctor_facility df
    JOIN clinzo.doctor d ON d.id=df.doctor_id
    JOIN clinzo.facility f ON f.id=df.facility_id
    JOIN clinzo.organization o ON o.id=f.organization_id
    LEFT JOIN clinzo.doctor_schedule_preferences pref ON pref.doctor_facility_id=df.id
    CROSS JOIN (VALUES ('clinic'),('online'),('home')) modes(mode)
    LEFT JOIN LATERAL (
      SELECT slot FROM jsonb_array_elements(public.list_practice_service_slots(df.id,modes.mode,NULL,now(),1)) slot LIMIT 1
    ) available ON true
    LEFT JOIN LATERAL (
      SELECT service.* FROM clinzo.practice_service service
      WHERE service.doctor_facility_id=df.id AND service.active AND service.code LIKE modes.mode || '-%'
      ORDER BY (service.id::text=available.slot->>'practice_service_id') DESC,service.created_at DESC,service.id LIMIT 1
    ) ps ON true
    WHERE (p_service_mode IS NULL OR modes.mode=p_service_mode)
      AND (modes.mode='clinic' OR (ps.id IS NOT NULL
        AND (modes.mode<>'home' OR coalesce(pref.home_visits,false))))
      AND df.active AND d.active AND d.credential_status='verified' AND f.active AND f.verification_status='verified' AND o.active
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
      d.full_name, f.name, df.id, modes.mode
    LIMIT p_limit OFFSET p_offset
  ) x),'[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.search_public_practices_for_mode(text,text,double precision,double precision,integer,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_practices_for_mode(text,text,double precision,double precision,integer,uuid,text,integer) TO anon,authenticated;


CREATE OR REPLACE FUNCTION public.search_public_practices(
 p_query text DEFAULT NULL,p_specialty_code text DEFAULT NULL,
 p_latitude double precision DEFAULT NULL,p_longitude double precision DEFAULT NULL,
 p_limit integer DEFAULT 20,p_practice_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.search_public_practices_for_mode(p_query,p_specialty_code,p_latitude,p_longitude,p_limit,p_practice_id,NULL,0);
$$;
REVOKE ALL ON FUNCTION public.search_public_practices(text,text,double precision,double precision,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_practices(text,text,double precision,double precision,integer,uuid) TO anon,authenticated;


