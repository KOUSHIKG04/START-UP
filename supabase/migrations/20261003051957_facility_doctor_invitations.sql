ALTER TABLE clinzo.doctor_facility_request ADD COLUMN initiated_by text NOT NULL DEFAULT 'doctor'
  CHECK(initiated_by IN ('doctor','facility'));

CREATE FUNCTION public.invite_doctor_to_my_facility(p_facility_id uuid,p_doctor_code text,
  p_name text,p_specialization text DEFAULT NULL,p_phone text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity(); selected_doctor_id uuid;
  request_id uuid; existing_request clinzo.doctor_facility_request;
  doctor_code text := trim(coalesce(p_doctor_code,''));
  doctor_name text := trim(coalesce(p_name,''));
  phone text := trim(coalesce(p_phone,''));
BEGIN
  IF p_facility_id IS NULL OR length(doctor_name) NOT BETWEEN 2 AND 120
    OR (doctor_code='' AND phone='') OR length(doctor_code)>120
    OR length(phone)>20 OR length(coalesce(p_specialization,''))>120 THEN
    RAISE EXCEPTION 'Doctor name and Clinzo ID or phone required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility f JOIN clinzo.organization_member m
      ON m.organization_id=f.organization_id WHERE f.id=p_facility_id
      AND f.active AND f.verification_status='verified' AND m.identity_id=actor AND m.active
      AND (m.facility_id IS NULL OR m.facility_id=f.id)
      AND m.role IN ('owner','organization_admin','facility_admin')) THEN
    RAISE EXCEPTION 'Verified facility owner or administrator required' USING ERRCODE='42501'; END IF;
  IF doctor_code='' AND (SELECT count(*) FROM clinzo.doctor d
    JOIN clinzo.doctor_onboarding_claim c ON c.doctor_id=d.id
    WHERE d.active AND lower(d.full_name)=lower(doctor_name) AND c.contact_phone=phone)<>1 THEN
    RAISE EXCEPTION 'Use the doctor Clinzo ID when name and phone do not identify exactly one doctor' USING ERRCODE='22023'; END IF;
  SELECT d.id INTO selected_doctor_id FROM clinzo.doctor d
    JOIN clinzo.doctor_onboarding_claim c ON c.doctor_id=d.id
    WHERE d.active AND d.credential_status IN ('pending','verified')
      AND lower(d.full_name)=lower(doctor_name)
      AND (doctor_code='' OR d.public_code=doctor_code)
      AND (doctor_code<>'' OR c.contact_phone=phone)
      AND (phone='' OR c.contact_phone=phone)
      AND (trim(coalesce(p_specialization,''))='' OR lower(c.claimed_specialty)=lower(trim(p_specialization)))
    LIMIT 1;
  IF selected_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Doctor profile details do not match a registered Clinzo doctor' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.doctor_facility df
    WHERE df.doctor_id=selected_doctor_id AND df.facility_id=p_facility_id) THEN
    RAISE EXCEPTION 'Doctor is already associated with this facility' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing_request FROM clinzo.doctor_facility_request
    WHERE doctor_id=selected_doctor_id AND facility_id=p_facility_id FOR UPDATE;
  IF existing_request.status='pending' AND existing_request.initiated_by='doctor' THEN
    RAISE EXCEPTION 'Doctor already requested this facility; accept the request above' USING ERRCODE='22023'; END IF;
  IF existing_request.status='approved' THEN
    RAISE EXCEPTION 'Association was already approved' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.doctor_facility_request(doctor_id,facility_id,initiated_by)
    VALUES(selected_doctor_id,p_facility_id,'facility')
    ON CONFLICT(doctor_id,facility_id) DO UPDATE SET status='pending',initiated_by='facility',
      updated_at=now(),reviewed_at=NULL,reviewed_by=NULL,rejection_reason=NULL
    RETURNING id INTO request_id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,
    facility_id,request_id,outcome,metadata)
    VALUES(actor,'identity','doctor.facility.invited','doctor_facility_request',request_id,
      p_facility_id,gen_random_uuid(),'allowed',jsonb_build_object('doctor_id',selected_doctor_id));
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.invite_doctor_to_my_facility(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.invite_doctor_to_my_facility(uuid,text,text,text,text) TO authenticated;

CREATE FUNCTION public.respond_to_my_facility_invitation(p_request_id uuid,p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); request_row clinzo.doctor_facility_request;
BEGIN
  SELECT r.* INTO request_row FROM clinzo.doctor_facility_request r
    JOIN clinzo.doctor d ON d.id=r.doctor_id
    WHERE r.id=p_request_id AND d.identity_id=actor AND d.active FOR UPDATE OF r;
  IF request_row.id IS NULL OR request_row.status<>'pending' OR request_row.initiated_by<>'facility' THEN
    RAISE EXCEPTION 'Pending invitation required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility f JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.id=request_row.facility_id AND f.active AND f.verification_status='verified' AND o.active) THEN
    RAISE EXCEPTION 'Facility is no longer available' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.doctor_facility_request SET status=CASE WHEN p_accept THEN 'approved' ELSE 'rejected' END,
    reviewed_at=now(),reviewed_by=actor,
    rejection_reason=CASE WHEN p_accept THEN NULL ELSE 'Doctor declined invitation' END,
    updated_at=now() WHERE id=request_row.id;
  IF p_accept THEN
    PERFORM clinzo.activate_approved_doctor_facility_request(request_row.doctor_id,request_row.facility_id);
  END IF;
  RETURN jsonb_build_object('id',request_row.id,'status',CASE WHEN p_accept THEN 'approved' ELSE 'rejected' END);
END $$;
REVOKE ALL ON FUNCTION public.respond_to_my_facility_invitation(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_my_facility_invitation(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_my_facility_doctor_request(p_request_id uuid,p_approve boolean,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity(); request_row clinzo.doctor_facility_request;
BEGIN
  SELECT * INTO request_row FROM clinzo.doctor_facility_request WHERE id=p_request_id FOR UPDATE;
  IF request_row.id IS NULL OR request_row.status<>'pending' OR request_row.initiated_by<>'doctor' THEN
    RAISE EXCEPTION 'Pending doctor request required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility f JOIN clinzo.organization_member m
    ON m.organization_id=f.organization_id WHERE f.id=request_row.facility_id
      AND f.active AND f.verification_status='verified' AND m.identity_id=actor
      AND m.active AND (m.facility_id IS NULL OR m.facility_id=f.id)
      AND m.role IN ('owner','organization_admin','facility_admin')) THEN
    RAISE EXCEPTION 'Facility owner or administrator required' USING ERRCODE='42501'; END IF;
  IF NOT p_approve AND length(trim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.doctor_facility_request SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_at=now(),reviewed_by=actor,rejection_reason=CASE WHEN p_approve THEN NULL ELSE trim(p_reason) END,
    updated_at=now() WHERE id=request_row.id;
  IF p_approve THEN
    PERFORM clinzo.activate_approved_doctor_facility_request(request_row.doctor_id,request_row.facility_id);
  END IF;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,
    facility_id,request_id,outcome,metadata)
    VALUES(actor,'identity',CASE WHEN p_approve THEN 'doctor.facility.approved' ELSE 'doctor.facility.rejected' END,
      'doctor_facility_request',request_row.id,request_row.facility_id,gen_random_uuid(),
      'allowed',jsonb_build_object('doctor_id',request_row.doctor_id));
  RETURN jsonb_build_object('id',request_row.id,'status',CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
END $$;

CREATE OR REPLACE FUNCTION public.list_my_doctor_facility_requests() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'facility_id',f.id,
    'facility_name',f.name,'status',r.status,'initiated_by',r.initiated_by,
    'rejection_reason',r.rejection_reason,'created_at',r.created_at) ORDER BY r.created_at DESC)
    FROM clinzo.doctor_facility_request r JOIN clinzo.doctor d ON d.id=r.doctor_id
    JOIN clinzo.facility f ON f.id=r.facility_id WHERE d.identity_id=actor),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.list_my_facility_doctor_requests() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'facility_id',f.id,
    'facility_name',f.name,'doctor_id',d.id,'doctor_name',d.full_name,
    'doctor_code',d.public_code,'credential_status',d.credential_status,
    'status',r.status,'initiated_by',r.initiated_by,
    'rejection_reason',r.rejection_reason,'created_at',r.created_at)
    ORDER BY r.created_at DESC)
    FROM clinzo.doctor_facility_request r JOIN clinzo.doctor d ON d.id=r.doctor_id
    JOIN clinzo.facility f ON f.id=r.facility_id
    WHERE EXISTS(SELECT 1 FROM clinzo.organization_member m
      WHERE m.identity_id=actor AND m.organization_id=f.organization_id AND m.active
        AND (m.facility_id IS NULL OR m.facility_id=f.id)
        AND m.role IN ('owner','organization_admin','facility_admin'))),'[]'::jsonb);
END $$;
