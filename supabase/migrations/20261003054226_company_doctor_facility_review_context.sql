-- Reviewers can see the real facility selected by a doctor and the facility
-- decision, while their own approval remains limited to clinical credentials.
CREATE FUNCTION public.list_company_doctor_facility_requests(p_case_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE reviewed_doctor_id uuid;
BEGIN
  IF clinzo.company_reviewer_identity() IS NULL THEN
    RAISE EXCEPTION 'Company reviewer required' USING ERRCODE='42501'; END IF;
  SELECT doctor_id INTO reviewed_doctor_id FROM clinzo.verification_case WHERE id=p_case_id;
  IF reviewed_doctor_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
    'facility_name',f.name,'facility_kind',f.kind,'facility_address',f.address,
    'initiated_by',r.initiated_by,'status',r.status,
    'practice_active',EXISTS(SELECT 1 FROM clinzo.doctor_facility df
      WHERE df.doctor_id=r.doctor_id AND df.facility_id=r.facility_id AND df.active))
    ORDER BY r.created_at DESC)
    FROM clinzo.doctor_facility_request r JOIN clinzo.facility f ON f.id=r.facility_id
    WHERE r.doctor_id=reviewed_doctor_id),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_company_doctor_facility_requests(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_company_doctor_facility_requests(uuid) TO authenticated;
