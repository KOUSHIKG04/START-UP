-- Store the destination with the booking so editing/deleting a saved location
-- cannot silently redirect an already-paid home visit.
ALTER TABLE clinzo.appointment
  ADD COLUMN home_visit_location_id uuid,
  ADD COLUMN home_visit_details jsonb
    CHECK (home_visit_details IS NULL OR jsonb_typeof(home_visit_details)='object');

CREATE OR REPLACE FUNCTION clinzo.guard_home_visit_booking() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE destination clinzo.patient_saved_location; original clinzo.appointment;
  practice uuid; origin extensions.geography; radius_km numeric; enabled boolean;
  latitude double precision; longitude double precision;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM clinzo.practice_service ps WHERE ps.id=NEW.practice_service_id AND ps.code LIKE 'home-%') THEN
    IF NEW.home_visit_location_id IS NOT NULL OR NEW.home_visit_details IS NOT NULL OR NEW.visit_mode='home' THEN
      RAISE EXCEPTION 'A home destination requires a home-visit service' USING ERRCODE='22023';
    END IF;
    RETURN NEW;
  END IF;
  SELECT s.doctor_facility_id,f.location,p.home_radius_km,p.home_visits INTO practice,origin,radius_km,enabled
    FROM clinzo.session s JOIN clinzo.doctor_facility df ON df.id=s.doctor_facility_id
    JOIN clinzo.facility f ON f.id=df.facility_id
    JOIN clinzo.doctor_schedule_preferences p ON p.doctor_facility_id=df.id WHERE s.id=NEW.session_id;
  IF NEW.replaces_appointment_id IS NOT NULL THEN
    SELECT a.* INTO original FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id
      WHERE a.id=NEW.replaces_appointment_id AND a.patient_id=NEW.patient_id AND a.visit_mode='home'
        AND s.doctor_facility_id=practice;
    IF original.home_visit_details IS NULL THEN
      RAISE EXCEPTION 'The original home-visit destination is missing' USING ERRCODE='22023';
    END IF;
    NEW.home_visit_location_id:=original.home_visit_location_id;
    NEW.home_visit_details:=original.home_visit_details;
  ELSE
    SELECT l.* INTO destination FROM clinzo.patient_saved_location l
      WHERE l.id=NEW.home_visit_location_id AND EXISTS(SELECT 1 FROM clinzo.patient_access pa
        WHERE pa.patient_id=l.patient_id AND pa.identity_id=NEW.requested_by
          AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL) FOR SHARE OF l;
    IF destination.id IS NULL THEN
      RAISE EXCEPTION 'Choose one of your saved visit locations' USING ERRCODE='42501';
    END IF;
    IF destination.latitude IS NULL OR destination.longitude IS NULL
      OR nullif(btrim(destination.building),'') IS NULL
      OR nullif(btrim(destination.city),'') IS NULL THEN
      RAISE EXCEPTION 'Add a map pin, building and city to your saved visit address' USING ERRCODE='22023';
    END IF;
    NEW.home_visit_details:=jsonb_build_object('address',concat_ws(', ',nullif(destination.building,''),nullif(destination.street,''),
      nullif(destination.locality,''),nullif(destination.city,''),nullif(destination.state,''),nullif(destination.pincode,'')),
      'latitude',destination.latitude,'longitude',destination.longitude,'instructions',destination.instructions,
      'receiver_name',CASE WHEN NOT destination.use_account_details THEN destination.receiver_name END,
      'receiver_phone',CASE WHEN NOT destination.use_account_details THEN destination.receiver_phone END);
  END IF;
  latitude:=(NEW.home_visit_details->>'latitude')::double precision;
  longitude:=(NEW.home_visit_details->>'longitude')::double precision;
  IF NOT coalesce(enabled,false) OR radius_km IS NULL OR origin IS NULL OR latitude IS NULL OR longitude IS NULL
    OR NOT extensions.ST_DWithin(origin,extensions.ST_SetSRID(extensions.ST_MakePoint(longitude,latitude),4326)::extensions.geography,radius_km*1000) THEN
    RAISE EXCEPTION 'This address is outside the doctor''s home-visit coverage. Choose another address or doctor.' USING ERRCODE='22023';
  END IF;
  NEW.visit_mode:='home';
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.guard_home_visit_booking() FROM PUBLIC,anon,authenticated;

-- Extend the existing canonical implementation; retain the six-argument API as
-- a forwarding wrapper for clinic/video callers and old app versions.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('clinzo.create_patient_booking(uuid,uuid,uuid,text,uuid,text)'::regprocedure);
  IF position('p_payment_method text)' in definition)=0 OR position('reason,visit_mode)' in definition)=0 THEN
    RAISE EXCEPTION 'Unexpected patient booking owner'; END IF;
  definition:=replace(definition,'p_payment_method text)','p_payment_method text, p_location_id uuid)');
  definition:=replace(definition,'fingerprint := sha256',
    'IF p_location_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM clinzo.practice_service WHERE id=p_practice_service_id AND code LIKE ''home-%'') THEN RAISE EXCEPTION ''A visit location is only valid for home visits'' USING ERRCODE=''22023''; END IF;
  fingerprint := sha256');
  definition:=replace(definition,'jsonb_build_array(p_patient_id,p_window_id,p_practice_service_id,trim(p_reason))::text',
    '(jsonb_build_array(p_patient_id,p_window_id,p_practice_service_id,trim(p_reason)) || CASE WHEN p_location_id IS NULL THEN ''[]''::jsonb ELSE jsonb_build_array(p_location_id) END)::text');
  definition:=replace(definition,'reason,visit_mode)','reason,visit_mode,home_visit_location_id)');
  definition:=replace(definition,'nullif(trim(p_reason),''''),''clinic'')','nullif(trim(p_reason),''''),''clinic'',p_location_id)');
  EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION clinzo.create_patient_booking(uuid,uuid,uuid,text,uuid,text,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION clinzo.create_patient_booking(p_patient_id uuid,p_window_id uuid,p_practice_service_id uuid,p_reason text,p_idempotency_key uuid,p_payment_method text) RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT clinzo.create_patient_booking(p_patient_id,p_window_id,p_practice_service_id,p_reason,p_idempotency_key,p_payment_method,NULL);
$$;

CREATE FUNCTION public.prepare_home_visit_booking(p_patient_id uuid,p_window_id uuid,p_practice_service_id uuid,p_reason text,p_idempotency_key uuid,p_location_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid; a clinzo.appointment;
BEGIN
  PERFORM clinzo.require_identity();
  IF p_location_id IS NULL OR NOT EXISTS(SELECT 1 FROM clinzo.practice_service WHERE id=p_practice_service_id AND code LIKE 'home-%') THEN
    RAISE EXCEPTION 'Choose a home-visit time and saved address' USING ERRCODE='22023'; END IF;
  result:=clinzo.create_patient_booking(p_patient_id,p_window_id,p_practice_service_id,p_reason,p_idempotency_key,'online',p_location_id);
  SELECT * INTO a FROM clinzo.appointment WHERE id=result;
  IF a.confirmation_payment_pending AND (a.status<>'pending' OR a.request_expires_at<=now()) THEN
    RAISE EXCEPTION 'Reservation expired. Refresh the available times.' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('appointment_id',a.id,'status',a.status,'requires_payment',a.confirmation_payment_pending AND a.status='pending',
    'reservation_expires_at',CASE WHEN a.confirmation_payment_pending THEN a.request_expires_at END);
END $$;
REVOKE ALL ON FUNCTION public.prepare_home_visit_booking(uuid,uuid,uuid,text,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_home_visit_booking(uuid,uuid,uuid,text,uuid,uuid) TO authenticated;

-- Authorization remains in list_clinic_appointments; enrich only its visible rows.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('public.list_care_appointments(uuid)'::regprocedure);
  IF position('items.value || jsonb_build_object(' in definition)=0 THEN RAISE EXCEPTION 'Unexpected appointment projection'; END IF;
  definition:=replace(definition,'items.value || jsonb_build_object(',
    'items.value || jsonb_build_object(''home_visit_details'',a.home_visit_details) || jsonb_build_object(');
  EXECUTE definition;
END $$;
