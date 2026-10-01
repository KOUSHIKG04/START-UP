-- Company review is independent of facility memberships. Provision reviewers only
-- through trusted SQL after creating and confirming their Supabase Auth user.
CREATE TABLE clinzo.company_reviewer (
  identity_id uuid PRIMARY KEY REFERENCES clinzo.identity(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clinzo.company_reviewer ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.company_reviewer FROM PUBLIC, anon, authenticated;

ALTER TABLE clinzo.facility ADD COLUMN verification_status text NOT NULL DEFAULT 'pending'
  CHECK (verification_status IN ('pending','verified','suspended'));
ALTER TABLE clinzo.facility ADD COLUMN registration_number text;

CREATE TABLE clinzo.verification_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid UNIQUE REFERENCES clinzo.doctor(id) ON DELETE RESTRICT,
  facility_id uuid UNIQUE REFERENCES clinzo.facility(id) ON DELETE RESTRICT,
  driver_application_id uuid UNIQUE REFERENCES clinzo.driver_registration_application(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','needs_resubmission','verified')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  CHECK (num_nonnulls(doctor_id,facility_id,driver_application_id)=1)
);
CREATE INDEX verification_case_queue_idx ON clinzo.verification_case(status,submitted_at DESC);
CREATE TRIGGER touch_verification_case BEFORE UPDATE ON clinzo.verification_case
  FOR EACH ROW EXECUTE FUNCTION clinzo.touch_row();
ALTER TABLE clinzo.verification_case ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.verification_case FROM PUBLIC,anon,authenticated;

CREATE TABLE clinzo.verification_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES clinzo.verification_case(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (length(kind) BETWEEN 2 AND 64),
  bucket_id text NOT NULL CHECK (bucket_id IN ('doctor-licenses','driver-evidence','facility-evidence')),
  storage_path text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','superseded')),
  rejection_reason text CHECK (rejection_reason IS NULL OR length(rejection_reason) BETWEEN 10 AND 1000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES clinzo.identity(id) ON DELETE RESTRICT,
  UNIQUE(case_id,kind,version), UNIQUE(bucket_id,storage_path)
);
CREATE INDEX verification_document_current_idx ON clinzo.verification_document(case_id,kind,version DESC);
ALTER TABLE clinzo.verification_document ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.verification_document FROM PUBLIC,anon,authenticated;

CREATE TABLE clinzo.verification_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES clinzo.verification_case(id) ON DELETE RESTRICT,
  document_id uuid REFERENCES clinzo.verification_document(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('submitted','resubmitted','under_review','approved','rejected','verified')),
  actor_id uuid REFERENCES clinzo.identity(id) ON DELETE RESTRICT,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_event_case_idx ON clinzo.verification_event(case_id,created_at DESC);
ALTER TABLE clinzo.verification_event ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.verification_event FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.company_reviewer_identity() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT i.id FROM clinzo.identity i JOIN clinzo.company_reviewer r ON r.identity_id=i.id
  WHERE i.issuer='supabase' AND i.subject=(SELECT auth.uid())::text
    AND i.disabled_at IS NULL AND r.active LIMIT 1;
$$;
REVOKE ALL ON FUNCTION clinzo.company_reviewer_identity() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.is_company_reviewer() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT clinzo.company_reviewer_identity() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.is_company_reviewer() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_reviewer() TO authenticated;

CREATE FUNCTION clinzo.add_verification_document(p_case uuid,p_kind text,p_bucket text,p_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE previous clinzo.verification_document; doc uuid; next_version integer;
BEGIN
  SELECT * INTO previous FROM clinzo.verification_document WHERE case_id=p_case AND kind=p_kind
    ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF previous.storage_path=p_path THEN RETURN previous.id; END IF;
  next_version:=coalesce(previous.version,0)+1;
  IF previous.id IS NOT NULL THEN
    UPDATE clinzo.verification_document SET status='superseded' WHERE id=previous.id;
  END IF;
  INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version)
    VALUES(p_case,p_kind,p_bucket,p_path,next_version) RETURNING id INTO doc;
  UPDATE clinzo.verification_case SET status='pending',submitted_at=now(),reviewed_at=NULL WHERE id=p_case;
  INSERT INTO clinzo.verification_event(case_id,document_id,action)
    VALUES(p_case,doc,CASE WHEN previous.id IS NULL THEN 'submitted' ELSE 'resubmitted' END);
  RETURN doc;
END $$;
REVOKE ALL ON FUNCTION clinzo.add_verification_document(uuid,text,text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.sync_doctor_verification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE case_id uuid;
BEGIN
  INSERT INTO clinzo.verification_case(doctor_id) VALUES(NEW.doctor_id)
    ON CONFLICT(doctor_id) DO UPDATE SET updated_at=now()
    RETURNING id INTO case_id;
  PERFORM clinzo.add_verification_document(case_id,'medical_registration','doctor-licenses',NEW.license_storage_path);
  IF TG_OP='UPDATE' AND NEW.license_storage_path IS DISTINCT FROM OLD.license_storage_path THEN
    UPDATE clinzo.doctor SET credential_status='pending' WHERE id=NEW.doctor_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_doctor_verification AFTER INSERT OR UPDATE OF license_storage_path
  ON clinzo.doctor_onboarding_claim FOR EACH ROW EXECUTE FUNCTION clinzo.sync_doctor_verification();

CREATE FUNCTION clinzo.sync_driver_verification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE case_id uuid; kind text;
BEGIN
  IF NEW.status<>'submitted' OR (TG_OP='UPDATE' AND OLD.status='submitted' AND NEW.documents=OLD.documents) THEN
    RETURN NEW;
  END IF;
  INSERT INTO clinzo.verification_case(driver_application_id) VALUES(NEW.id)
    ON CONFLICT(driver_application_id) DO UPDATE SET updated_at=now()
    RETURNING id INTO case_id;
  FOREACH kind IN ARRAY ARRAY['aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images'] LOOP
    PERFORM clinzo.add_verification_document(case_id,kind,'driver-evidence',NEW.documents->>kind);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_driver_verification AFTER INSERT OR UPDATE OF status,documents
  ON clinzo.driver_registration_application FOR EACH ROW EXECUTE FUNCTION clinzo.sync_driver_verification();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('facility-evidence','facility-evidence',false,10485760,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT(id) DO NOTHING;
CREATE POLICY facility_evidence_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK(bucket_id='facility-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY facility_evidence_read_own ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id='facility-evidence' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY company_reviewer_evidence_read ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id IN ('doctor-licenses','driver-evidence','facility-evidence')
    AND (SELECT public.is_company_reviewer())
    AND EXISTS(SELECT 1 FROM clinzo.verification_document d
      WHERE d.bucket_id=storage.objects.bucket_id AND d.storage_path=storage.objects.name));

CREATE FUNCTION public.submit_my_facility_verification(p_facility_id uuid,p_registration_number text,
  p_certificate_path text,p_operating_licence_path text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); case_id uuid;
BEGIN
  IF length(trim(coalesce(p_registration_number,''))) NOT BETWEEN 4 AND 120
    OR p_certificate_path IS NULL OR p_operating_licence_path IS NULL
    OR p_certificate_path=p_operating_licence_path THEN
    RAISE EXCEPTION 'Registration number and two distinct documents required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clinzo.facility f JOIN clinzo.organization_member m
      ON m.organization_id=f.organization_id AND (m.facility_id IS NULL OR m.facility_id=f.id)
      WHERE f.id=p_facility_id AND f.active AND m.identity_id=actor AND m.active
        AND m.role IN ('owner','facility_admin','organization_admin')) THEN
    RAISE EXCEPTION 'Facility owner or administrator required' USING ERRCODE='42501'; END IF;
  IF p_certificate_path NOT LIKE auth.uid()::text||'/%'
    OR p_operating_licence_path NOT LIKE auth.uid()::text||'/%'
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='facility-evidence' AND name=p_certificate_path)
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='facility-evidence' AND name=p_operating_licence_path) THEN
    RAISE EXCEPTION 'Upload both facility documents first' USING ERRCODE='22023'; END IF;
  UPDATE clinzo.facility SET registration_number=trim(p_registration_number),verification_status='pending'
    WHERE id=p_facility_id;
  INSERT INTO clinzo.verification_case(facility_id) VALUES(p_facility_id)
    ON CONFLICT(facility_id) DO UPDATE SET updated_at=now() RETURNING id INTO case_id;
  PERFORM clinzo.add_verification_document(case_id,'registration_certificate','facility-evidence',p_certificate_path);
  PERFORM clinzo.add_verification_document(case_id,'operating_licence','facility-evidence',p_operating_licence_path);
  RETURN case_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_my_facility_verification(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_facility_verification(uuid,text,text,text) TO authenticated;

-- Keep existing submitted evidence visible in the queue after deployment.
INSERT INTO clinzo.verification_case(doctor_id,submitted_at)
SELECT doctor_id,created_at FROM clinzo.doctor_onboarding_claim ON CONFLICT(doctor_id) DO NOTHING;
INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version)
SELECT c.id,'medical_registration','doctor-licenses',d.license_storage_path,1
FROM clinzo.doctor_onboarding_claim d JOIN clinzo.verification_case c ON c.doctor_id=d.doctor_id
ON CONFLICT(bucket_id,storage_path) DO NOTHING;

CREATE FUNCTION public.list_company_verification_cases() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF clinzo.company_reviewer_identity() IS NULL THEN
    RAISE EXCEPTION 'Company reviewer required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.submitted_at DESC) FROM (
    SELECT c.id,c.status,c.submitted_at,c.reviewed_at,c.row_version::text,
      CASE WHEN c.doctor_id IS NOT NULL THEN 'doctor'
        WHEN c.facility_id IS NOT NULL THEN 'facility' ELSE 'driver' END AS subject_type,
      coalesce(d.full_name,f.name,a.full_name) AS subject_name,
      (SELECT count(*)::integer FROM clinzo.verification_document x WHERE x.case_id=c.id
        AND x.status<>'superseded') AS document_count,
      (SELECT count(*)::integer FROM clinzo.verification_document x WHERE x.case_id=c.id
        AND x.status='rejected') AS rejected_count
    FROM clinzo.verification_case c
    LEFT JOIN clinzo.doctor d ON d.id=c.doctor_id
    LEFT JOIN clinzo.facility f ON f.id=c.facility_id
    LEFT JOIN clinzo.driver_registration_application a ON a.id=c.driver_application_id
    ORDER BY c.submitted_at DESC LIMIT 200
  ) q),'[]'::jsonb);
END $$;

CREATE FUNCTION public.get_company_verification_case(p_case_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  IF clinzo.company_reviewer_identity() IS NULL THEN
    RAISE EXCEPTION 'Company reviewer required' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object('id',c.id,'status',c.status,'submitted_at',c.submitted_at,
      'subject_type',CASE WHEN c.doctor_id IS NOT NULL THEN 'doctor'
        WHEN c.facility_id IS NOT NULL THEN 'facility' ELSE 'driver' END,
      'subject_name',coalesce(d.full_name,f.name,a.full_name),
      'doctor',CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
        'registration_authority',d.registration_authority,'registration_number',d.registration_number,
        'claimed_specialty',dc.claimed_specialty,'claimed_facility_name',dc.claimed_facility_name,
        'contact_phone',dc.contact_phone) END,
      'facility',CASE WHEN f.id IS NULL THEN NULL ELSE jsonb_build_object(
        'kind',f.kind,'address',f.address,'registration_number',f.registration_number) END,
      'driver',CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
        'city',a.city,'contact_phone',a.contact_phone,'date_of_birth',a.date_of_birth,
        'registration_number',a.registration_number,'capability_code',a.capability_code) END,
      'documents',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'kind',x.kind,
        'bucket_id',x.bucket_id,'storage_path',x.storage_path,'version',x.version,
        'status',x.status,'rejection_reason',x.rejection_reason,
        'submitted_at',x.submitted_at,'reviewed_at',x.reviewed_at)
        ORDER BY x.kind,x.version DESC),'[]'::jsonb)
        FROM clinzo.verification_document x WHERE x.case_id=c.id),
      'history',(SELECT coalesce(jsonb_agg(jsonb_build_object('action',e.action,
        'document_id',e.document_id,'reason',e.reason,'created_at',e.created_at)
        ORDER BY e.created_at DESC),'[]'::jsonb)
        FROM clinzo.verification_event e WHERE e.case_id=c.id)) INTO result
  FROM clinzo.verification_case c
  LEFT JOIN clinzo.doctor d ON d.id=c.doctor_id
  LEFT JOIN clinzo.doctor_onboarding_claim dc ON dc.doctor_id=d.id
  LEFT JOIN clinzo.facility f ON f.id=c.facility_id
  LEFT JOIN clinzo.driver_registration_application a ON a.id=c.driver_application_id
  WHERE c.id=p_case_id;
  RETURN result;
END $$;

CREATE FUNCTION clinzo.emit_verification_notice(p_case_id uuid,p_action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c clinzo.verification_case; recipient uuid; event_id uuid;
BEGIN
  SELECT * INTO c FROM clinzo.verification_case WHERE id=p_case_id;
  recipient:=CASE WHEN c.doctor_id IS NOT NULL THEN
    (SELECT identity_id FROM clinzo.doctor WHERE id=c.doctor_id)
    WHEN c.driver_application_id IS NOT NULL THEN
    (SELECT identity_id FROM clinzo.driver_registration_application WHERE id=c.driver_application_id)
    ELSE (SELECT m.identity_id FROM clinzo.organization_member m
      JOIN clinzo.facility f ON f.organization_id=m.organization_id
      WHERE f.id=c.facility_id AND m.active AND m.role='owner' ORDER BY m.created_at LIMIT 1) END;
  IF recipient IS NULL THEN RETURN; END IF;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,request_id,payload)
    VALUES('verification.'||p_action,'verification_case',c.id,c.row_version,gen_random_uuid(),
      jsonb_build_object('status',c.status)) RETURNING id INTO event_id;
  INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
    VALUES(recipient,event_id,'verification.'||p_action,
      'verification:'||c.id||':'||c.row_version,
      jsonb_build_object('case_id',c.id,'status',c.status),now()+interval '30 days');
END $$;
REVOKE ALL ON FUNCTION clinzo.emit_verification_notice(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.review_company_verification_document(p_document_id uuid,p_decision text,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.company_reviewer_identity(); doc clinzo.verification_document; c clinzo.verification_case;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Company reviewer required' USING ERRCODE='42501'; END IF;
  IF p_decision NOT IN ('approved','rejected') OR (p_decision='rejected' AND
    length(trim(coalesce(p_reason,''))) NOT BETWEEN 10 AND 1000) THEN
    RAISE EXCEPTION 'Decision or rejection reason invalid' USING ERRCODE='22023'; END IF;
  SELECT * INTO doc FROM clinzo.verification_document WHERE id=p_document_id FOR UPDATE;
  IF doc.id IS NULL OR doc.status<>'pending' THEN
    RAISE EXCEPTION 'Document is not awaiting review' USING ERRCODE='22023'; END IF;
  SELECT * INTO c FROM clinzo.verification_case WHERE id=doc.case_id FOR UPDATE;
  UPDATE clinzo.verification_document SET status=p_decision,
    rejection_reason=CASE WHEN p_decision='rejected' THEN trim(p_reason) ELSE NULL END,
    reviewed_at=now(),reviewer_id=actor WHERE id=doc.id;
  UPDATE clinzo.verification_case SET status=CASE WHEN p_decision='rejected'
    THEN 'needs_resubmission' ELSE 'under_review' END,reviewed_at=now() WHERE id=c.id;
  IF p_decision='rejected' THEN
    IF c.doctor_id IS NOT NULL THEN UPDATE clinzo.doctor SET credential_status='pending' WHERE id=c.doctor_id; END IF;
    IF c.facility_id IS NOT NULL THEN UPDATE clinzo.facility SET verification_status='pending' WHERE id=c.facility_id; END IF;
    IF c.driver_application_id IS NOT NULL THEN
      UPDATE clinzo.driver_registration_application SET status='rejected' WHERE id=c.driver_application_id;
    END IF;
  END IF;
  INSERT INTO clinzo.verification_event(case_id,document_id,action,actor_id,reason)
    VALUES(c.id,doc.id,CASE WHEN p_decision='approved' THEN 'approved' ELSE 'rejected' END,
      actor,CASE WHEN p_decision='rejected' THEN trim(p_reason) ELSE NULL END);
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','verification.document_'||p_decision,'verification_document',doc.id,
      gen_random_uuid(),'allowed',jsonb_build_object('case_id',c.id));
  PERFORM clinzo.emit_verification_notice(c.id,CASE WHEN p_decision='rejected'
    THEN 'rejected' ELSE 'approved' END);
  RETURN public.get_company_verification_case(c.id);
END $$;

CREATE FUNCTION public.finalize_company_verification(p_case_id uuid,p_driver_details jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.company_reviewer_identity(); c clinzo.verification_case;
  required_kinds text[]; kind text; app clinzo.driver_registration_application;
  org_id uuid; driver_id uuid; vehicle_id uuid; capability_id uuid;
  license_expiry date; inspection_expiry date; approved_until timestamptz;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Company reviewer required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM clinzo.verification_case WHERE id=p_case_id FOR UPDATE;
  IF c.id IS NULL OR c.status NOT IN ('pending','under_review') THEN
    RAISE EXCEPTION 'Case is not ready for verification' USING ERRCODE='22023'; END IF;
  required_kinds:=CASE WHEN c.doctor_id IS NOT NULL THEN ARRAY['medical_registration']
    WHEN c.facility_id IS NOT NULL THEN ARRAY['registration_certificate','operating_licence']
    ELSE ARRAY['aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images'] END;
  FOREACH kind IN ARRAY required_kinds LOOP
    IF NOT EXISTS(SELECT 1 FROM clinzo.verification_document d WHERE d.case_id=c.id AND d.kind=kind
      AND d.status='approved' AND NOT EXISTS(SELECT 1 FROM clinzo.verification_document newer
        WHERE newer.case_id=c.id AND newer.kind=kind AND newer.version>d.version)) THEN
      RAISE EXCEPTION 'Required document not approved: %',kind USING ERRCODE='22023'; END IF;
  END LOOP;
  IF c.doctor_id IS NOT NULL THEN
    UPDATE clinzo.doctor SET credential_status='verified' WHERE id=c.doctor_id AND active;
  ELSIF c.facility_id IS NOT NULL THEN
    UPDATE clinzo.facility SET verification_status='verified' WHERE id=c.facility_id AND active;
  ELSE
    SELECT * INTO app FROM clinzo.driver_registration_application WHERE id=c.driver_application_id FOR UPDATE;
    IF app.status<>'submitted' OR jsonb_typeof(p_driver_details) IS DISTINCT FROM 'object'
      OR length(trim(coalesce(p_driver_details->>'license_number',''))) NOT BETWEEN 4 AND 80
      OR length(trim(coalesce(p_driver_details->>'equipment_notes',''))) NOT BETWEEN 10 AND 1000
      OR length(trim(coalesce(p_driver_details->>'crew_notes',''))) NOT BETWEEN 10 AND 1000 THEN
      RAISE EXCEPTION 'Reviewed driver licence, equipment and crew details required' USING ERRCODE='22023'; END IF;
    license_expiry:=(p_driver_details->>'license_expires_on')::date;
    inspection_expiry:=(p_driver_details->>'inspection_expires_on')::date;
    approved_until:=(p_driver_details->>'capability_approved_until')::timestamptz;
    IF license_expiry<=current_date OR inspection_expiry<=current_date
      OR approved_until<=now() OR approved_until>now()+interval '1 year'
      OR approved_until>inspection_expiry::timestamptz THEN
      RAISE EXCEPTION 'Licence, inspection and capability approval must be current' USING ERRCODE='22023'; END IF;
    SELECT id INTO capability_id FROM clinzo.capability WHERE code=app.capability_code;
    IF capability_id IS NULL THEN RAISE EXCEPTION 'Ambulance capability missing' USING ERRCODE='22023'; END IF;
    INSERT INTO clinzo.organization(public_code,name,kind)
      VALUES('ORG-'||gen_random_uuid()::text,app.full_name||' Ambulance','ambulance_operator') RETURNING id INTO org_id;
    INSERT INTO clinzo.driver(identity_id,organization_id,public_code,full_name,license_number,
      license_expires_on,verification_status,date_of_birth,city,contact_phone,profile_photo_path,verification_consent_at)
      VALUES(app.identity_id,org_id,'DRV-'||gen_random_uuid()::text,app.full_name,
        trim(p_driver_details->>'license_number'),license_expiry,'verified',app.date_of_birth,
        app.city,app.contact_phone,app.profile_photo_path,app.consent_at) RETURNING id INTO driver_id;
    INSERT INTO clinzo.vehicle(organization_id,registration_number,display_label,inspection_expires_on)
      VALUES(org_id,app.registration_number,coalesce(nullif(trim(p_driver_details->>'vehicle_label'),''),app.registration_number),
        inspection_expiry) RETURNING id INTO vehicle_id;
    INSERT INTO clinzo.vehicle_review_request(driver_id,vehicle_id,capability_id,equipment_notes,crew_notes,
      status,reviewed_at,approved_until,reviewer_reference,evidence_reference,review_note)
      VALUES(driver_id,vehicle_id,capability_id,trim(p_driver_details->>'equipment_notes'),
        trim(p_driver_details->>'crew_notes'),'approved',now(),approved_until,actor::text,
        c.id::text,'Company document verification');
    INSERT INTO clinzo.vehicle_capability(vehicle_id,capability_id,verified_at,expires_at)
      VALUES(vehicle_id,capability_id,now(),approved_until);
    INSERT INTO clinzo.driver_document(driver_id,vehicle_id,kind,storage_path)
      SELECT driver_id,vehicle_id,d.kind,d.storage_path FROM clinzo.verification_document d
      WHERE d.case_id=c.id AND d.status='approved';
    UPDATE clinzo.driver_registration_application SET status='approved' WHERE id=app.id;
  END IF;
  UPDATE clinzo.verification_case SET status='verified',reviewed_at=now() WHERE id=c.id;
  INSERT INTO clinzo.verification_event(case_id,action,actor_id) VALUES(c.id,'verified',actor);
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','verification.case_verified','verification_case',c.id,gen_random_uuid(),
      'allowed',jsonb_build_object('subject_type',CASE WHEN c.doctor_id IS NOT NULL THEN 'doctor'
        WHEN c.facility_id IS NOT NULL THEN 'facility' ELSE 'driver' END));
  PERFORM clinzo.emit_verification_notice(c.id,'verified');
  RETURN public.get_company_verification_case(c.id);
END $$;

CREATE FUNCTION public.get_my_verification_case(p_subject_type text,p_subject_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); c clinzo.verification_case;
BEGIN
  IF p_subject_type='doctor' THEN
    SELECT vc.* INTO c FROM clinzo.verification_case vc JOIN clinzo.doctor d ON d.id=vc.doctor_id
      WHERE d.id=p_subject_id AND d.identity_id=actor;
  ELSIF p_subject_type='driver' THEN
    SELECT vc.* INTO c FROM clinzo.verification_case vc JOIN clinzo.driver_registration_application a
      ON a.id=vc.driver_application_id WHERE a.id=p_subject_id AND a.identity_id=actor;
  ELSIF p_subject_type='facility' THEN
    SELECT vc.* INTO c FROM clinzo.verification_case vc JOIN clinzo.facility f ON f.id=vc.facility_id
      JOIN clinzo.organization_member m ON m.organization_id=f.organization_id
      WHERE f.id=p_subject_id AND m.identity_id=actor AND m.active
        AND (m.facility_id IS NULL OR m.facility_id=f.id);
  ELSE RAISE EXCEPTION 'Unknown subject type' USING ERRCODE='22023'; END IF;
  IF c.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id',c.id,'status',c.status,'documents',
    (SELECT coalesce(jsonb_agg(jsonb_build_object('kind',d.kind,'status',d.status,
      'rejection_reason',d.rejection_reason,'version',d.version) ORDER BY d.kind),'[]'::jsonb)
      FROM clinzo.verification_document d WHERE d.case_id=c.id AND d.status<>'superseded'));
END $$;

REVOKE ALL ON FUNCTION public.list_company_verification_cases(),
  public.get_company_verification_case(uuid),
  public.review_company_verification_document(uuid,text,text),
  public.finalize_company_verification(uuid,jsonb),
  public.get_my_verification_case(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_company_verification_cases(),
  public.get_company_verification_case(uuid),
  public.review_company_verification_document(uuid,text,text),
  public.finalize_company_verification(uuid,jsonb),
  public.get_my_verification_case(text,uuid) TO authenticated;
INSERT INTO clinzo.verification_case(driver_application_id,submitted_at)
SELECT id,submitted_at FROM clinzo.driver_registration_application WHERE status='submitted'
ON CONFLICT(driver_application_id) DO NOTHING;
INSERT INTO clinzo.verification_document(case_id,kind,bucket_id,storage_path,version)
SELECT c.id,j.key,'driver-evidence',j.value,1
FROM clinzo.driver_registration_application a
JOIN clinzo.verification_case c ON c.driver_application_id=a.id
CROSS JOIN LATERAL jsonb_each_text(a.documents) j WHERE a.status='submitted'
ON CONFLICT(bucket_id,storage_path) DO NOTHING;
