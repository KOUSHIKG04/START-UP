-- Personal contact address only. Dispatch continues to use live driver GPS.
CREATE FUNCTION clinzo.valid_driver_address(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE key text;
BEGIN
  IF value IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(value) k
    WHERE k NOT IN ('building','line1','line2','city','state','pincode','latitude','longitude')) THEN RETURN false; END IF;
  FOREACH key IN ARRAY ARRAY['building','line1','line2','city','state','pincode'] LOOP
    IF jsonb_typeof(value->key) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  END LOOP;
  IF length(trim(value->>'building')) NOT BETWEEN 1 AND 160
    OR length(trim(value->>'line1')) NOT BETWEEN 1 AND 200
    OR length(value->>'line2')>200
    OR length(trim(value->>'city')) NOT BETWEEN 2 AND 120
    OR length(trim(value->>'state')) NOT BETWEEN 2 AND 120
    OR value->>'pincode' !~ '^[0-9]{6}$' THEN RETURN false; END IF;
  IF (value ? 'latitude') IS DISTINCT FROM (value ? 'longitude') THEN RETURN false; END IF;
  IF value ? 'latitude' THEN
    IF jsonb_typeof(value->'latitude') IS DISTINCT FROM 'number'
      OR jsonb_typeof(value->'longitude') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
    IF (value->>'latitude')::numeric NOT BETWEEN -90 AND 90
      OR (value->>'longitude')::numeric NOT BETWEEN -180 AND 180 THEN RETURN false; END IF;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION clinzo.valid_driver_address(jsonb) FROM PUBLIC,anon,authenticated;
ALTER TABLE clinzo.driver ADD COLUMN home_address jsonb
  CHECK (clinzo.valid_driver_address(home_address));
ALTER TABLE clinzo.driver_registration_application ADD COLUMN home_address jsonb
  CHECK (clinzo.valid_driver_address(home_address));
CREATE OR REPLACE FUNCTION public.get_my_driver_registration_application() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE auth_user uuid := clinzo.require_phone_user(); actor uuid;
BEGIN
  SELECT id INTO actor FROM clinzo.identity WHERE issuer='supabase' AND subject=auth_user::text AND disabled_at IS NULL;
  IF actor IS NULL THEN RETURN NULL; END IF;
  RETURN (SELECT jsonb_build_object('id',a.id,'full_name',a.full_name,'contact_phone',a.contact_phone,
    'home_address',a.home_address,'date_of_birth',a.date_of_birth,'city',a.city,'profile_photo_path',a.profile_photo_path,
    'capability_code',a.capability_code,'registration_number',a.registration_number,
    'status',a.status,'submitted_at',a.submitted_at)
    FROM clinzo.driver_registration_application a WHERE a.identity_id=actor);
END $$;

CREATE OR REPLACE FUNCTION public.get_my_driver_profile() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN (SELECT jsonb_build_object('id',d.id,'full_name',d.full_name,
    'home_address',d.home_address,'date_of_birth',d.date_of_birth,'city',d.city,'contact_phone',d.contact_phone,
    'profile_photo_path',d.profile_photo_path,'verification_status',d.verification_status,
    'license_number',d.license_number,'license_expires_on',d.license_expires_on,
    'verification_consent_at',d.verification_consent_at)
    FROM clinzo.driver d WHERE d.identity_id=actor AND d.active);
END $$;

CREATE OR REPLACE FUNCTION public.save_my_driver_registration_details(p_details jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; n text; phone text; city_value text; birth date; photo text;
BEGIN
  IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid driver details' USING ERRCODE='22023'; END IF;
  n:=trim(coalesce(p_details->>'full_name',''));
  phone:=regexp_replace(coalesce(p_details->>'contact_phone',''),'[\s()-]','','g');
  city_value:=trim(coalesce(p_details->>'city',''));
  photo:=nullif(trim(coalesce(p_details->>'profile_photo_path','')),'');
  IF length(n) NOT BETWEEN 2 AND 120 OR phone !~ '^\+[1-9][0-9]{7,14}$'
    OR length(city_value) NOT BETWEEN 2 AND 120
    OR coalesce(p_details->>'date_of_birth','') !~ '^\d{4}-\d{2}-\d{2}$'
    OR p_details->>'consent' <> 'true' THEN
    RAISE EXCEPTION 'Name, phone, birth date, city and consent are required' USING ERRCODE='22023'; END IF;
  IF p_details ? 'home_address' AND (NOT clinzo.valid_driver_address(p_details->'home_address')
    OR trim(p_details->'home_address'->>'city') IS DISTINCT FROM city_value) THEN
    RAISE EXCEPTION 'Invalid driver address or city mismatch' USING ERRCODE='22023'; END IF;
  birth:=(p_details->>'date_of_birth')::date;
  IF birth>current_date-interval '18 years' OR birth<date '1900-01-01' THEN
    RAISE EXCEPTION 'Driver must be at least 18' USING ERRCODE='22023'; END IF;
  actor:=clinzo.require_identity(n);
  IF EXISTS(SELECT 1 FROM clinzo.driver WHERE identity_id=actor AND active) THEN
    RAISE EXCEPTION 'Driver account already exists' USING ERRCODE='22023'; END IF;
  IF photo IS NOT NULL AND (photo NOT LIKE auth.uid()::text||'/%' OR NOT EXISTS
    (SELECT 1 FROM storage.objects WHERE bucket_id='driver-evidence' AND name=photo)) THEN
    RAISE EXCEPTION 'Profile photo is not uploaded' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.driver_registration_application(identity_id,full_name,contact_phone,date_of_birth,city,profile_photo_path,consent_at,home_address)
    VALUES(actor,n,phone,birth,city_value,photo,now(),p_details->'home_address')
    ON CONFLICT(identity_id) DO UPDATE SET full_name=excluded.full_name,contact_phone=excluded.contact_phone,
      date_of_birth=excluded.date_of_birth,city=excluded.city,profile_photo_path=excluded.profile_photo_path,
      consent_at=excluded.consent_at,
      home_address=CASE WHEN p_details ? 'home_address' THEN excluded.home_address ELSE clinzo.driver_registration_application.home_address END
    WHERE clinzo.driver_registration_application.status IN ('details_saved','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Application already submitted for review' USING ERRCODE='22023'; END IF;
  RETURN public.get_my_driver_registration_application();
END $$;

CREATE OR REPLACE FUNCTION public.update_my_driver_profile(p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); d clinzo.driver; n text; birth date; city_value text; phone_value text; photo text;
BEGIN
  IF jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid profile' USING ERRCODE='22023'; END IF;
  n:=trim(coalesce(p_profile->>'full_name',''));
  city_value:=trim(coalesce(p_profile->>'city',''));
  phone_value:=nullif(trim(coalesce(p_profile->>'contact_phone','')),'');
  photo:=nullif(trim(coalesce(p_profile->>'profile_photo_path','')),'');
  IF length(n) NOT BETWEEN 2 AND 120 OR length(city_value) NOT BETWEEN 2 AND 120
    OR (phone_value IS NOT NULL AND phone_value !~ '^\+[1-9][0-9]{7,14}$')
    OR coalesce(p_profile->>'date_of_birth','') !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid driver details' USING ERRCODE='22023'; END IF;
  IF p_profile ? 'home_address' AND (NOT clinzo.valid_driver_address(p_profile->'home_address')
    OR trim(p_profile->'home_address'->>'city') IS DISTINCT FROM city_value) THEN
    RAISE EXCEPTION 'Invalid driver address or city mismatch' USING ERRCODE='22023'; END IF;
  birth:=(p_profile->>'date_of_birth')::date;
  IF birth>current_date-interval '18 years' OR birth<date '1900-01-01' THEN
    RAISE EXCEPTION 'Driver must be at least 18' USING ERRCODE='22023'; END IF;
  IF photo IS NOT NULL AND (photo NOT LIKE auth.uid()::text||'/%' OR NOT EXISTS
    (SELECT 1 FROM storage.objects WHERE bucket_id='driver-evidence' AND name=photo)) THEN
    RAISE EXCEPTION 'Profile photo upload is required' USING ERRCODE='22023'; END IF;
  SELECT * INTO d FROM clinzo.driver WHERE identity_id=actor AND active FOR UPDATE;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Driver profile required' USING ERRCODE='42501'; END IF;
  IF d.verification_status='suspended' THEN RAISE EXCEPTION 'Driver account suspended' USING ERRCODE='42501'; END IF;
  UPDATE clinzo.driver SET full_name=n,date_of_birth=birth,city=city_value,contact_phone=phone_value,
    profile_photo_path=photo,home_address=CASE WHEN p_profile ? 'home_address' THEN p_profile->'home_address' ELSE home_address END,verification_consent_at=CASE WHEN p_profile->>'consent'='true' THEN coalesce(verification_consent_at,now()) ELSE verification_consent_at END,
    verification_status=CASE WHEN d.verification_status='verified' AND (d.full_name IS DISTINCT FROM n OR d.date_of_birth IS DISTINCT FROM birth)
      THEN 'pending' ELSE d.verification_status END WHERE id=d.id;
  UPDATE clinzo.identity SET display_name=n WHERE id=actor;
  RETURN public.get_my_driver_profile();
END $$;

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
  required_kinds:=CASE WHEN c.doctor_id IS NOT NULL THEN ARRAY['medical_registration','medical_degree']
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
