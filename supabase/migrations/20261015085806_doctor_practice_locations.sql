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
  RETURN (WITH candidates AS (
    SELECT df.id AS practice_id,d.id AS doctor_id,d.public_code AS doctor_code,d.full_name AS doctor_name,d.qualification,d.bio,
      f.id AS facility_id,f.public_code AS facility_code,f.name AS facility_name,f.kind AS facility_kind,
      f.address,f.timezone,ps.id AS practice_service_id,coalesce(ps.code, modes.mode || '-unpublished') AS service_code,
      coalesce(ps.name, 'Clinic consultation') AS service_name,available.slot IS NOT NULL AS has_available_slots,
      available.slot->>'starts_at' AS next_available_at,
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
  ), ranked AS (
    SELECT candidates.*,row_number() OVER (
      PARTITION BY doctor_id,CASE WHEN p_practice_id IS NOT NULL THEN split_part(service_code,'-',1) ELSE '' END
      ORDER BY has_available_slots DESC,next_available_at ASC NULLS LAST,
        (NOT has_available_slots AND fee_minor IS NOT NULL) DESC,distance_meters ASC NULLS LAST,
        (fee_minor IS NOT NULL) DESC,
        (service_code LIKE 'clinic-%') DESC,practice_id,service_code
    ) AS listing_rank FROM candidates
  )
  SELECT coalesce(jsonb_agg(to_jsonb(x)-'listing_rank'),'[]'::jsonb) FROM (
    SELECT * FROM ranked WHERE listing_rank=1
    ORDER BY distance_meters ASC NULLS LAST,doctor_name,doctor_id,practice_id,service_code
    LIMIT p_limit OFFSET p_offset
  ) x);
END $$;

REVOKE ALL ON FUNCTION public.search_public_practices_for_mode(text,text,double precision,double precision,integer,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_practices_for_mode(text,text,double precision,double precision,integer,uuid,text,integer) TO anon,authenticated;




-- Resolve the same doctor's other locations from a verified public practice.
CREATE FUNCTION public.list_public_doctor_practices(
 p_practice_id uuid,p_service_mode text DEFAULT 'clinic',
 p_latitude double precision DEFAULT NULL,p_longitude double precision DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE doctor uuid;
BEGIN
 IF p_practice_id IS NULL OR p_service_mode IS NULL OR p_service_mode NOT IN ('clinic','online','home')
 OR ((p_latitude IS NULL)<>(p_longitude IS NULL))
 OR (p_latitude IS NOT NULL AND (p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180)) THEN
   RAISE EXCEPTION 'Invalid doctor location search' USING ERRCODE='22023'; END IF;
 SELECT d.id INTO doctor FROM clinzo.doctor_facility p
 JOIN clinzo.doctor d ON d.id=p.doctor_id JOIN clinzo.facility f ON f.id=p.facility_id
 JOIN clinzo.organization o ON o.id=f.organization_id
 WHERE p.id=p_practice_id AND p.active AND d.active AND d.credential_status='verified'
 AND f.active AND f.verification_status='verified' AND o.active;
 IF doctor IS NULL THEN RETURN '[]'::jsonb; END IF;
 RETURN (SELECT coalesce(jsonb_agg(entry ORDER BY (entry->>'has_available_slots')::boolean DESC,
   entry->>'next_available_at' ASC NULLS LAST,(entry->>'distance_meters')::int ASC NULLS LAST,entry->>'practice_id'),'[]'::jsonb)
 FROM clinzo.doctor_facility p
 CROSS JOIN LATERAL jsonb_array_elements(public.search_public_practices_for_mode(
   p_practice_id=>p.id,p_service_mode=>p_service_mode,p_latitude=>p_latitude,p_longitude=>p_longitude)) entry
 WHERE p.doctor_id=doctor AND p.active);
END $$;
REVOKE ALL ON FUNCTION public.list_public_doctor_practices(uuid,text,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_doctor_practices(uuid,text,double precision,double precision) TO anon,authenticated;

