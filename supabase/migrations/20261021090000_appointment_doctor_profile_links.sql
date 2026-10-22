-- Enrich only the appointments already authorized by the existing projection.
-- Keep the RPC arguments, booking behavior, ordering and access rules unchanged.
CREATE OR REPLACE FUNCTION public.list_care_appointments(p_practice_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(
    jsonb_agg(
      items.value || jsonb_build_object(
        'visit_mode', a.visit_mode,
        'practice_id', s.doctor_facility_id,
        'practice_service_id', a.practice_service_id
      ) ORDER BY items.ordinality
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(public.list_clinic_appointments(p_practice_id))
    WITH ORDINALITY items(value, ordinality)
  JOIN clinzo.appointment a ON a.id = (items.value->>'id')::uuid
  JOIN clinzo.session s ON s.id = a.session_id;
$$;

REVOKE ALL ON FUNCTION public.list_care_appointments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_care_appointments(uuid) TO authenticated;
