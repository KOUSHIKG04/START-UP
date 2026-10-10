-- A clinic owned by this doctor requires separate operating evidence.
CREATE FUNCTION clinzo.doctor_requires_clinic_licence(p_doctor_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM clinzo.doctor d
 JOIN clinzo.doctor_facility df ON df.doctor_id=d.id
 JOIN clinzo.facility f ON f.id=df.facility_id
 JOIN clinzo.organization_member m ON m.organization_id=f.organization_id
 WHERE d.id=p_doctor_id AND f.kind='clinic' AND f.active AND df.active
 AND m.identity_id=d.identity_id AND m.role='owner' AND m.active
 AND (m.facility_id IS NULL OR m.facility_id=f.id));
$$;
REVOKE ALL ON FUNCTION clinzo.doctor_requires_clinic_licence(uuid) FROM PUBLIC,anon,authenticated;

-- Contact email is required even when the account signs in using a phone number.
CREATE OR REPLACE FUNCTION public.submit_my_doctor_claim(p_claim jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE doctor_row clinzo.doctor; license_path text; degree_path text; clinic_path text; requires_clinic boolean; verification_id uuid;
  specialty_names text[]; dob date; calculated_age integer; qualification text := trim(coalesce(p_claim->>'qualification', ''));
BEGIN
  IF auth.uid() IS NULL OR jsonb_typeof(p_claim) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Authentication and claim are required' USING ERRCODE = '42501'; END IF;
  IF p_claim ? 'specialties' THEN
    IF jsonb_typeof(p_claim->'specialties') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Specialties must be a list' USING ERRCODE='22023';
    END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_claim->'specialties') item WHERE jsonb_typeof(item) <> 'string') THEN
      RAISE EXCEPTION 'Specialty names must be text' USING ERRCODE='22023';
    END IF;
    SELECT array_agg(trim(value)) INTO specialty_names FROM jsonb_array_elements_text(p_claim->'specialties');
    IF cardinality(specialty_names) IS NULL OR cardinality(specialty_names) NOT BETWEEN 1 AND 12
      OR EXISTS(SELECT 1 FROM unnest(specialty_names) n WHERE n IS NULL OR length(n) NOT BETWEEN 2 AND 120 OR lower(n)='other')
      OR (SELECT count(DISTINCT lower(n)) FROM unnest(specialty_names) n) <> cardinality(specialty_names) THEN
      RAISE EXCEPTION 'Select distinct specialties and provide a name for Other' USING ERRCODE='22023';
    END IF;
    p_claim := jsonb_set(p_claim,'{specialty}',to_jsonb(specialty_names[1]));
  ELSE
    specialty_names := ARRAY[trim(p_claim->>'specialty')];
  END IF;
  IF p_claim ? 'birth_date' THEN
    IF coalesce(p_claim->>'birth_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE = '22023';
    END IF;
    BEGIN
      dob := (p_claim->>'birth_date')::date;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      RAISE EXCEPTION 'Invalid date of birth' USING ERRCODE = '22023';
    END;
    calculated_age := extract(year FROM age(current_date, dob))::integer;
    IF dob > current_date OR calculated_age NOT BETWEEN 18 AND 100 THEN
      RAISE EXCEPTION 'Doctor age must be between 18 and 100' USING ERRCODE = '22023';
    END IF;
    p_claim := jsonb_set(p_claim, '{age_years}', to_jsonb(calculated_age));
  END IF;
  SELECT d.* INTO doctor_row FROM clinzo.doctor d JOIN clinzo.identity i ON i.id = d.identity_id
    WHERE i.issuer = 'supabase' AND i.subject = auth.uid()::text AND i.disabled_at IS NULL
      AND d.active AND d.credential_status = 'pending' FOR UPDATE OF d;
  IF doctor_row.id IS NULL THEN RAISE EXCEPTION 'Pending doctor account required' USING ERRCODE = '42501'; END IF;
  license_path := trim(coalesce(p_claim->>'license_path', ''));
  degree_path := trim(coalesce(p_claim->>'degree_path', ''));
  IF license_path = degree_path OR split_part(license_path, '/', 1) <> auth.uid()::text
    OR split_part(degree_path, '/', 1) <> auth.uid()::text
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'doctor-licenses' AND name = license_path)
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'doctor-licenses' AND name = degree_path)
    OR length(qualification) NOT BETWEEN 2 AND 160
    OR coalesce(p_claim->>'age_years', '') !~ '^[0-9]{2,3}$'
    OR (p_claim->>'age_years')::int NOT BETWEEN 18 AND 100
    OR coalesce(p_claim->>'gender', '') NOT IN ('Male', 'Female', 'Other', 'Prefer not to say')
    OR length(trim(coalesce(p_claim->>'specialty', ''))) NOT BETWEEN 2 AND 120
    OR length(trim(coalesce(p_claim->>'language', ''))) NOT BETWEEN 2 AND 80
    OR length(trim(coalesce(p_claim->>'facility_name', ''))) NOT BETWEEN 2 AND 160
    OR coalesce(p_claim->>'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    OR length(coalesce(p_claim->>'email', '')) > 254
    OR trim(coalesce(p_claim->>'email', '')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid credential claim' USING ERRCODE = '22023'; END IF;
  requires_clinic := clinzo.doctor_requires_clinic_licence(doctor_row.id);
  clinic_path := trim(coalesce(p_claim->>'clinic_license_path',''));
  IF requires_clinic AND (clinic_path='' OR clinic_path IN (license_path,degree_path)
    OR split_part(clinic_path,'/',1)<>auth.uid()::text
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='doctor-licenses' AND name=clinic_path)) THEN
    RAISE EXCEPTION 'Upload a distinct clinic operating licence first' USING ERRCODE='22023';
  END IF;
  IF NOT requires_clinic AND clinic_path<>'' THEN
    RAISE EXCEPTION 'Clinic ownership is required for operating evidence' USING ERRCODE='42501';
  END IF;
  INSERT INTO clinzo.doctor_onboarding_claim(doctor_id, birth_date, reported_age_years, reported_gender,
    claimed_specialty, claimed_specialties, claimed_language, claimed_facility_name, contact_email, contact_phone,
    license_storage_path, degree_storage_path, claimed_qualification)
    VALUES(doctor_row.id, dob, (p_claim->>'age_years')::int, p_claim->>'gender', trim(p_claim->>'specialty'),
      specialty_names, trim(p_claim->>'language'), trim(p_claim->>'facility_name'), nullif(trim(coalesce(p_claim->>'email', '')), ''),
      p_claim->>'phone', license_path, degree_path, qualification)
    ON CONFLICT(doctor_id) DO UPDATE SET birth_date = coalesce(excluded.birth_date, clinzo.doctor_onboarding_claim.birth_date), reported_age_years = excluded.reported_age_years,
      reported_gender = excluded.reported_gender, claimed_specialty = excluded.claimed_specialty, claimed_specialties = excluded.claimed_specialties,
      claimed_language = excluded.claimed_language, claimed_facility_name = excluded.claimed_facility_name,
      contact_email = excluded.contact_email, contact_phone = excluded.contact_phone,
      license_storage_path = excluded.license_storage_path,
      degree_storage_path = excluded.degree_storage_path,
      claimed_qualification = excluded.claimed_qualification,
      reviewed_qualification = CASE WHEN clinzo.doctor_onboarding_claim.claimed_qualification
        IS DISTINCT FROM excluded.claimed_qualification THEN NULL
        ELSE clinzo.doctor_onboarding_claim.reviewed_qualification END,
      updated_at = now();
  IF requires_clinic THEN
    SELECT id INTO verification_id FROM clinzo.verification_case WHERE doctor_id=doctor_row.id;
    PERFORM clinzo.add_verification_document(verification_id,'clinic_operating_licence','doctor-licenses',clinic_path);
  END IF;
  RETURN true;
END $$;
CREATE FUNCTION public.submit_my_clinic_operating_licence(p_storage_path text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE did uuid; cid uuid; path text:=trim(coalesce(p_storage_path,''));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT d.id INTO did FROM clinzo.doctor d JOIN clinzo.identity i ON i.id=d.identity_id
 WHERE i.issuer='supabase' AND i.subject=auth.uid()::text AND i.disabled_at IS NULL
 AND d.active AND d.credential_status='pending' FOR UPDATE OF d;
 IF did IS NULL OR NOT clinzo.doctor_requires_clinic_licence(did) THEN
  RAISE EXCEPTION 'Pending independent-clinic doctor required' USING ERRCODE='42501'; END IF;
 IF split_part(path,'/',1)<>auth.uid()::text
 OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='doctor-licenses' AND name=path)
 OR EXISTS(SELECT 1 FROM clinzo.verification_document v JOIN clinzo.verification_case c ON c.id=v.case_id
   WHERE c.doctor_id=did AND v.kind<>'clinic_operating_licence' AND v.storage_path=path) THEN
  RAISE EXCEPTION 'Upload a distinct clinic operating licence first' USING ERRCODE='22023'; END IF;
 SELECT id INTO cid FROM clinzo.verification_case WHERE doctor_id=did FOR UPDATE;
 IF cid IS NULL THEN RAISE EXCEPTION 'Submit doctor credentials first' USING ERRCODE='22023'; END IF;
 PERFORM clinzo.add_verification_document(cid,'clinic_operating_licence','doctor-licenses',path);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.submit_my_clinic_operating_licence(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_clinic_operating_licence(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.finalize_company_verification(p_case_id uuid,p_driver_details jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.company_reviewer_identity(); c clinzo.verification_case;
  required_kinds text[]; v_required_kind text; app clinzo.driver_registration_application;
  org_id uuid; driver_id uuid; vehicle_id uuid; capability_id uuid;
  license_expiry date; inspection_expiry date; approved_until timestamptz;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Company reviewer required' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM clinzo.verification_case WHERE id=p_case_id FOR UPDATE;
  IF c.id IS NULL OR c.status NOT IN ('pending','under_review') THEN
    RAISE EXCEPTION 'Case is not ready for verification' USING ERRCODE='22023'; END IF;
  required_kinds:=CASE WHEN c.doctor_id IS NOT NULL THEN CASE WHEN clinzo.doctor_requires_clinic_licence(c.doctor_id)
      THEN ARRAY['medical_registration','medical_degree','clinic_operating_licence']
      ELSE ARRAY['medical_registration','medical_degree'] END
    WHEN c.facility_id IS NOT NULL THEN ARRAY['registration_certificate','operating_licence']
    ELSE ARRAY['aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images'] END;
  FOREACH v_required_kind IN ARRAY required_kinds LOOP
    IF NOT EXISTS(SELECT 1 FROM clinzo.verification_document d WHERE d.case_id=c.id AND d.kind=v_required_kind
      AND d.status='approved' AND NOT EXISTS(SELECT 1 FROM clinzo.verification_document newer
        WHERE newer.case_id=c.id AND newer.kind=v_required_kind AND newer.version>d.version)) THEN
      RAISE EXCEPTION 'Required document not approved: %',v_required_kind USING ERRCODE='22023'; END IF;
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
      license_expires_on,verification_status,date_of_birth,city,contact_phone,profile_photo_path,verification_consent_at,home_address)
      VALUES(app.identity_id,org_id,'DRV-'||gen_random_uuid()::text,app.full_name,
        trim(p_driver_details->>'license_number'),license_expiry,'verified',app.date_of_birth,
        app.city,app.contact_phone,app.profile_photo_path,app.consent_at,app.home_address) RETURNING id INTO driver_id;
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
NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.get_my_verification_case(p_subject_type text,p_subject_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; c clinzo.verification_case;
BEGIN
  actor:=CASE WHEN p_subject_type='facility' THEN clinzo.require_portal_identity()
    ELSE clinzo.require_identity() END;
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
  RETURN jsonb_build_object('id',c.id,'status',c.status,'requires_clinic_licence',CASE WHEN c.doctor_id IS NOT NULL THEN clinzo.doctor_requires_clinic_licence(c.doctor_id) ELSE false END,'documents',
    (SELECT coalesce(jsonb_agg(jsonb_build_object('kind',d.kind,'status',d.status,
      'rejection_reason',d.rejection_reason,'version',d.version) ORDER BY d.kind),'[]'::jsonb)
      FROM clinzo.verification_document d WHERE d.case_id=c.id AND d.status<>'superseded'));
END $$;
REVOKE ALL ON FUNCTION public.get_my_verification_case(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_verification_case(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_company_verification_case(p_case_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF clinzo.company_reviewer_identity() IS NULL THEN
    RAISE EXCEPTION 'Company reviewer required' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object('id', c.id, 'status', c.status, 'submitted_at', c.submitted_at,
      'subject_type', CASE WHEN c.doctor_id IS NOT NULL THEN 'doctor'
        WHEN c.facility_id IS NOT NULL THEN 'facility' ELSE 'driver' END,
      'subject_name', coalesce(d.full_name, f.name, a.full_name),
      'doctor', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
        'requires_clinic_licence', clinzo.doctor_requires_clinic_licence(d.id),
        'registration_authority', d.registration_authority, 'registration_number', d.registration_number,
        'claimed_qualification', dc.claimed_qualification,
        'reviewed_qualification', dc.reviewed_qualification,
        'claimed_specialty', coalesce(array_to_string(dc.claimed_specialties, ', '), dc.claimed_specialty), 'claimed_facility_name', dc.claimed_facility_name,
        'contact_phone', dc.contact_phone) END,
      'facility', CASE WHEN f.id IS NULL THEN NULL ELSE jsonb_build_object(
        'kind', f.kind, 'address', f.address, 'registration_number', f.registration_number) END,
      'driver', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
        'city', a.city, 'contact_phone', a.contact_phone, 'date_of_birth', a.date_of_birth,
        'registration_number', a.registration_number, 'capability_code', a.capability_code) END,
      'documents', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind,
        'bucket_id', x.bucket_id, 'storage_path', x.storage_path, 'version', x.version,
        'status', x.status, 'rejection_reason', x.rejection_reason,
        'submitted_at', x.submitted_at, 'reviewed_at', x.reviewed_at)
        ORDER BY x.kind, x.version DESC), '[]'::jsonb)
        FROM clinzo.verification_document x WHERE x.case_id = c.id),
      'history', (SELECT coalesce(jsonb_agg(jsonb_build_object('action', e.action,
        'document_id', e.document_id, 'reason', e.reason, 'created_at', e.created_at)
        ORDER BY e.created_at DESC), '[]'::jsonb)
        FROM clinzo.verification_event e WHERE e.case_id = c.id)) INTO result
  FROM clinzo.verification_case c
  LEFT JOIN clinzo.doctor d ON d.id = c.doctor_id
  LEFT JOIN clinzo.doctor_onboarding_claim dc ON dc.doctor_id = d.id
  LEFT JOIN clinzo.facility f ON f.id = c.facility_id
  LEFT JOIN clinzo.driver_registration_application a ON a.id = c.driver_application_id
  WHERE c.id = p_case_id;
  RETURN result;
END $$;
