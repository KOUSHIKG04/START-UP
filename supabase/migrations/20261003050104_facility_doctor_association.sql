-- A facility must be registered and company-verified before doctors may request
-- an association. A typed name is never authority to join a hospital roster.
CREATE FUNCTION public.register_my_care_facility(p_registration jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE auth_user uuid := auth.uid(); actor uuid; organization_id uuid; facility_id uuid;
  facility_name text := trim(coalesce(p_registration->>'name',''));
  facility_kind text := trim(coalesce(p_registration->>'kind',''));
  facility_address text := trim(coalesce(p_registration->>'address',''));
  latitude double precision; longitude double precision;
BEGIN
  IF auth_user IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth_user
    AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<now())) THEN
    RAISE EXCEPTION 'A confirmed facility email account is required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_registration) IS DISTINCT FROM 'object'
    OR length(facility_name) NOT BETWEEN 2 AND 160
    OR facility_kind NOT IN ('hospital','clinic')
    OR length(facility_address) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'Valid facility name, type and address required' USING ERRCODE='22023'; END IF;
  latitude := (p_registration->>'latitude')::double precision;
  longitude := (p_registration->>'longitude')::double precision;
  IF latitude IS NULL OR longitude IS NULL OR NOT(latitude BETWEEN -90 AND 90)
    OR NOT(longitude BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'Valid facility coordinates required' USING ERRCODE='22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth_user::text,0));
  SELECT i.id INTO actor FROM clinzo.identity i WHERE i.issuer='supabase'
    AND i.subject=auth_user::text AND i.disabled_at IS NULL;
  IF actor IS NULL THEN
    INSERT INTO clinzo.identity(issuer,subject,display_name)
      VALUES('supabase',auth_user::text,facility_name) RETURNING id INTO actor;
  END IF;
  IF EXISTS(SELECT 1 FROM clinzo.organization_member m WHERE m.identity_id=actor AND m.active
    AND m.role IN ('owner','organization_admin')) THEN
    RAISE EXCEPTION 'This account already owns an organization; ask Clinzo to add another facility' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.organization(public_code,name,kind)
    VALUES('ORG-'||gen_random_uuid()::text,facility_name,'care_provider') RETURNING id INTO organization_id;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location,verification_status)
    VALUES(organization_id,'FAC-'||gen_random_uuid()::text,facility_name,facility_kind,facility_address,
      extensions.ST_SetSRID(extensions.ST_MakePoint(longitude,latitude),4326)::extensions.geography,
      'pending') RETURNING id INTO facility_id;
  INSERT INTO clinzo.organization_member(identity_id,organization_id,role)
    VALUES(actor,organization_id,'owner');
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,
    organization_id,facility_id,request_id,outcome,metadata)
    VALUES(actor,'identity','facility.registered','facility',facility_id,
      organization_id,facility_id,gen_random_uuid(),'allowed','{}'::jsonb);
  RETURN facility_id;
END $$;
REVOKE ALL ON FUNCTION public.register_my_care_facility(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_my_care_facility(jsonb) TO authenticated;

CREATE FUNCTION public.list_registered_care_facilities() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'kind',f.kind,
    'address',f.address) ORDER BY f.name,f.id),'[]'::jsonb)
  FROM (SELECT f.id,f.name,f.kind,f.address FROM clinzo.facility f
    JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.active AND f.verification_status='verified' AND o.active
      AND o.kind='care_provider'
    ORDER BY f.name,f.id LIMIT 200) f;
$$;
REVOKE ALL ON FUNCTION public.list_registered_care_facilities() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_registered_care_facilities() TO authenticated;

CREATE TABLE clinzo.doctor_facility_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES clinzo.doctor(id) ON DELETE RESTRICT,
  facility_id uuid NOT NULL REFERENCES clinzo.facility(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES clinzo.identity(id),
  rejection_reason text,
  CONSTRAINT doctor_facility_request_unique UNIQUE(doctor_id,facility_id),
  CONSTRAINT doctor_facility_request_rejection_ck CHECK(status <> 'rejected' OR length(trim(coalesce(rejection_reason,''))) BETWEEN 5 AND 500)
);
CREATE INDEX doctor_facility_request_facility_pending_idx
  ON clinzo.doctor_facility_request(facility_id,created_at) WHERE status='pending';
ALTER TABLE clinzo.doctor_facility_request ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.doctor_facility_request FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.request_my_doctor_facility(p_facility_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); my_doctor_id uuid; request_id uuid;
BEGIN
  SELECT id INTO my_doctor_id FROM clinzo.doctor WHERE identity_id=actor AND active
    AND credential_status IN ('pending','verified');
  IF my_doctor_id IS NULL THEN RAISE EXCEPTION 'Doctor profile required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility f JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE f.id=p_facility_id AND f.active AND f.verification_status='verified'
      AND o.active AND o.kind='care_provider') THEN
    RAISE EXCEPTION 'Select a verified, registered hospital or clinic' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM clinzo.doctor_facility df WHERE df.doctor_id=my_doctor_id AND df.facility_id=p_facility_id) THEN
    RAISE EXCEPTION 'Already associated with this facility' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.doctor_facility_request(doctor_id,facility_id)
    VALUES(my_doctor_id,p_facility_id)
    ON CONFLICT(doctor_id,facility_id) DO UPDATE SET status='pending',updated_at=now(),
      reviewed_at=NULL,reviewed_by=NULL,rejection_reason=NULL
    WHERE clinzo.doctor_facility_request.status='rejected'
    RETURNING id INTO request_id;
  IF request_id IS NULL THEN
    SELECT id INTO request_id FROM clinzo.doctor_facility_request
      WHERE doctor_facility_request.doctor_id=my_doctor_id AND facility_id=p_facility_id;
  END IF;
  RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.request_my_doctor_facility(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_my_doctor_facility(uuid) TO authenticated;

CREATE FUNCTION public.list_my_doctor_facility_requests() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'facility_id',f.id,
    'facility_name',f.name,'status',r.status,'rejection_reason',r.rejection_reason,
    'created_at',r.created_at) ORDER BY r.created_at DESC)
    FROM clinzo.doctor_facility_request r JOIN clinzo.doctor d ON d.id=r.doctor_id
    JOIN clinzo.facility f ON f.id=r.facility_id WHERE d.identity_id=actor),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_my_doctor_facility_requests() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_doctor_facility_requests() TO authenticated;

CREATE FUNCTION public.list_my_facility_doctor_requests() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'facility_id',f.id,
    'facility_name',f.name,'doctor_id',d.id,'doctor_name',d.full_name,
    'doctor_code',d.public_code,'credential_status',d.credential_status,
    'status',r.status,'rejection_reason',r.rejection_reason,'created_at',r.created_at)
    ORDER BY r.created_at DESC)
    FROM clinzo.doctor_facility_request r JOIN clinzo.doctor d ON d.id=r.doctor_id
    JOIN clinzo.facility f ON f.id=r.facility_id
    WHERE EXISTS(SELECT 1 FROM clinzo.organization_member m
      WHERE m.identity_id=actor AND m.organization_id=f.organization_id AND m.active
        AND (m.facility_id IS NULL OR m.facility_id=f.id)
        AND m.role IN ('owner','organization_admin','facility_admin'))),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_my_facility_doctor_requests() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_facility_doctor_requests() TO authenticated;

CREATE FUNCTION clinzo.activate_approved_doctor_facility_request(p_doctor_id uuid,p_facility_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM clinzo.doctor_facility_request r
    JOIN clinzo.doctor d ON d.id=r.doctor_id
    JOIN clinzo.facility f ON f.id=r.facility_id
    JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE r.doctor_id=p_doctor_id AND r.facility_id=p_facility_id AND r.status='approved'
      AND d.active AND d.credential_status='verified' AND f.active
      AND f.verification_status='verified' AND o.active) THEN
    INSERT INTO clinzo.doctor_facility(doctor_id,facility_id)
      VALUES(p_doctor_id,p_facility_id) ON CONFLICT(doctor_id,facility_id) DO NOTHING;
  END IF;
END $$;
REVOKE ALL ON FUNCTION clinzo.activate_approved_doctor_facility_request(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.decide_my_facility_doctor_request(p_request_id uuid,p_approve boolean,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity(); request_row clinzo.doctor_facility_request;
BEGIN
  SELECT * INTO request_row FROM clinzo.doctor_facility_request WHERE id=p_request_id FOR UPDATE;
  IF request_row.id IS NULL OR request_row.status<>'pending' THEN
    RAISE EXCEPTION 'Pending request required' USING ERRCODE='22023'; END IF;
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
REVOKE ALL ON FUNCTION public.decide_my_facility_doctor_request(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.decide_my_facility_doctor_request(uuid,boolean,text) TO authenticated;

CREATE FUNCTION clinzo.activate_facility_requests_after_doctor_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE request_row record;
BEGIN
  IF NEW.credential_status='verified' AND OLD.credential_status IS DISTINCT FROM NEW.credential_status THEN
    FOR request_row IN SELECT facility_id FROM clinzo.doctor_facility_request
      WHERE doctor_id=NEW.id AND status='approved' LOOP
      PERFORM clinzo.activate_approved_doctor_facility_request(NEW.id,request_row.facility_id);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER activate_facility_requests_after_doctor_review
  AFTER UPDATE OF credential_status ON clinzo.doctor FOR EACH ROW
  EXECUTE FUNCTION clinzo.activate_facility_requests_after_doctor_review();
