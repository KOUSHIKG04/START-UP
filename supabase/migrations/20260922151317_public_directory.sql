-- Deliberately narrow public projection. Clinical and identity tables stay private.
CREATE FUNCTION public.list_public_practices(p_limit integer DEFAULT 20)
RETURNS TABLE (
  doctor_code text, doctor_name text, facility_code text, facility_name text,
  service_code text, service_name text, fee_minor text, currency text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 50' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT d.public_code, d.full_name, f.public_code, f.name,
         s.code, s.name, s.fee_minor::text, s.currency::text
  FROM clinzo.practice_service AS s
  JOIN clinzo.doctor_facility AS df ON df.id = s.doctor_facility_id
  JOIN clinzo.doctor AS d ON d.id = df.doctor_id
  JOIN clinzo.facility AS f ON f.id = df.facility_id
  JOIN clinzo.organization AS o ON o.id = f.organization_id
  WHERE s.active AND df.active AND d.active AND f.active AND o.active
    AND d.credential_status = 'verified'
  ORDER BY d.public_code, f.public_code, s.code
  LIMIT p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.list_public_practices(integer) FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_practices(integer) TO anon, authenticated;
COMMENT ON FUNCTION public.list_public_practices(integer) IS
  'Public verified practice directory; excludes identity, contact and clinical data. Does not guarantee availability.';
