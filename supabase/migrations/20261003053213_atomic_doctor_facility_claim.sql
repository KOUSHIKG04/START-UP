-- An employed doctor's company evidence and hospital association must be
-- submitted together. A failed facility request rolls back the evidence claim.
CREATE FUNCTION public.submit_my_doctor_claim_for_facility(p_claim jsonb,p_facility_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE facility_name text; request_id uuid;
BEGIN
  IF p_facility_id IS NULL THEN RAISE EXCEPTION 'Select a registered facility' USING ERRCODE='22023'; END IF;
  SELECT f.name INTO facility_name FROM clinzo.facility f
    JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.id=p_facility_id AND f.active AND f.verification_status='verified'
      AND o.active AND o.kind='care_provider';
  IF facility_name IS NULL OR trim(coalesce(p_claim->>'facility_name',''))<>facility_name THEN
    RAISE EXCEPTION 'The selected facility does not match the credential claim' USING ERRCODE='22023'; END IF;
  PERFORM public.submit_my_doctor_claim(p_claim);
  request_id:=public.request_my_doctor_facility(p_facility_id);
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_my_doctor_claim_for_facility(jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_doctor_claim_for_facility(jsonb,uuid) TO authenticated;
