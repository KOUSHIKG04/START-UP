-- The original driver onboarding collects an application for company review.
-- It does not ask drivers to transcribe licence/inspection dates from evidence.
-- A submitted application is never an approved driver or available ambulance.
CREATE TABLE clinzo.driver_registration_application (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL UNIQUE REFERENCES clinzo.identity(id) ON DELETE RESTRICT,
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 120),
  contact_phone text NOT NULL CHECK (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  date_of_birth date NOT NULL,
  city text NOT NULL CHECK (length(city) BETWEEN 2 AND 120),
  profile_photo_path text,
  consent_at timestamptz NOT NULL,
  capability_code text CHECK (capability_code IN ('BLS','ALS','NICU')),
  registration_number text CHECK (registration_number IS NULL OR length(registration_number) BETWEEN 4 AND 32),
  documents jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(documents)='object'),
  status text NOT NULL DEFAULT 'details_saved' CHECK (status IN ('details_saved','submitted','approved','rejected')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (date_of_birth <= current_date - interval '18 years'),
  CHECK (status <> 'submitted' OR (capability_code IS NOT NULL AND registration_number IS NOT NULL AND submitted_at IS NOT NULL))
);
ALTER TABLE clinzo.driver_registration_application ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.driver_registration_application FROM PUBLIC,anon,authenticated;
CREATE TRIGGER touch_row BEFORE UPDATE ON clinzo.driver_registration_application FOR EACH ROW EXECUTE FUNCTION clinzo.touch_row();

CREATE FUNCTION public.get_my_driver_registration_application() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE auth_user uuid := clinzo.require_phone_user(); actor uuid;
BEGIN
  SELECT id INTO actor FROM clinzo.identity WHERE issuer='supabase' AND subject=auth_user::text AND disabled_at IS NULL;
  IF actor IS NULL THEN RETURN NULL; END IF;
  RETURN (SELECT jsonb_build_object('id',a.id,'full_name',a.full_name,'contact_phone',a.contact_phone,
    'date_of_birth',a.date_of_birth,'city',a.city,'profile_photo_path',a.profile_photo_path,
    'capability_code',a.capability_code,'registration_number',a.registration_number,
    'status',a.status,'submitted_at',a.submitted_at)
    FROM clinzo.driver_registration_application a WHERE a.identity_id=actor);
END $$;

CREATE FUNCTION public.save_my_driver_registration_details(p_details jsonb) RETURNS jsonb
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
  birth:=(p_details->>'date_of_birth')::date;
  IF birth>current_date-interval '18 years' OR birth<date '1900-01-01' THEN
    RAISE EXCEPTION 'Driver must be at least 18' USING ERRCODE='22023'; END IF;
  actor:=clinzo.require_identity(n);
  IF EXISTS(SELECT 1 FROM clinzo.driver WHERE identity_id=actor AND active) THEN
    RAISE EXCEPTION 'Driver account already exists' USING ERRCODE='22023'; END IF;
  IF photo IS NOT NULL AND (photo NOT LIKE auth.uid()::text||'/%' OR NOT EXISTS
    (SELECT 1 FROM storage.objects WHERE bucket_id='driver-evidence' AND name=photo)) THEN
    RAISE EXCEPTION 'Profile photo is not uploaded' USING ERRCODE='22023'; END IF;
  INSERT INTO clinzo.driver_registration_application(identity_id,full_name,contact_phone,date_of_birth,city,profile_photo_path,consent_at)
    VALUES(actor,n,phone,birth,city_value,photo,now())
    ON CONFLICT(identity_id) DO UPDATE SET full_name=excluded.full_name,contact_phone=excluded.contact_phone,
      date_of_birth=excluded.date_of_birth,city=excluded.city,profile_photo_path=excluded.profile_photo_path,
      consent_at=excluded.consent_at
    WHERE clinzo.driver_registration_application.status IN ('details_saved','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Application already submitted for review' USING ERRCODE='22023'; END IF;
  RETURN public.get_my_driver_registration_application();
END $$;

CREATE FUNCTION public.submit_my_driver_registration_application(p_vehicle jsonb,p_documents jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := clinzo.require_identity(); application clinzo.driver_registration_application;
  kind text; path text; code text; registration text;
BEGIN
  SELECT * INTO application FROM clinzo.driver_registration_application WHERE identity_id=actor FOR UPDATE;
  IF application.id IS NULL OR application.status NOT IN ('details_saved','rejected') THEN
    RAISE EXCEPTION 'Save personal details before submitting documents' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_vehicle) IS DISTINCT FROM 'object' OR jsonb_typeof(p_documents) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Vehicle and documents required' USING ERRCODE='22023'; END IF;
  code:=p_vehicle->>'capability_code'; registration:=upper(trim(coalesce(p_vehicle->>'registration_number','')));
  IF code NOT IN ('BLS','ALS','NICU') OR length(registration) NOT BETWEEN 4 AND 32 THEN
    RAISE EXCEPTION 'Valid ambulance classification and registration required' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_documents)) <> 8 THEN
    RAISE EXCEPTION 'All eight documents are required' USING ERRCODE='22023'; END IF;
  FOREACH kind IN ARRAY ARRAY['aadhaar','pan','driving_licence','vehicle_rc','insurance','fitness','ambulance_image','equipment_images'] LOOP
    path:=p_documents->>kind;
    IF path IS NULL OR path NOT LIKE auth.uid()::text||'/%' OR NOT EXISTS
      (SELECT 1 FROM storage.objects WHERE bucket_id='driver-evidence' AND name=path) THEN
      RAISE EXCEPTION 'Missing uploaded document: %',kind USING ERRCODE='22023'; END IF;
  END LOOP;
  UPDATE clinzo.driver_registration_application SET capability_code=code,registration_number=registration,
    documents=p_documents,status='submitted',submitted_at=now() WHERE id=application.id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','driver.application_submitted','driver_registration_application',application.id,
      gen_random_uuid(),'allowed',jsonb_build_object('capability_code',code));
  RETURN public.get_my_driver_registration_application();
END $$;

REVOKE ALL ON FUNCTION public.get_my_driver_registration_application(),
  public.save_my_driver_registration_details(jsonb),
  public.submit_my_driver_registration_application(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_driver_registration_application(),
  public.save_my_driver_registration_details(jsonb),
  public.submit_my_driver_registration_application(jsonb,jsonb) TO authenticated;
