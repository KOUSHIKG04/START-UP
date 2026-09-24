-- Disposable project only. Every fixture write rolls back.
BEGIN;
DO $$
DECLARE
  patient_auth uuid := gen_random_uuid(); driver_auth uuid := gen_random_uuid();
  suffix bigint := floor(random()*8000000000)::bigint+1000000000;
  patient_id uuid; fixture_driver_id uuid; fixture_vehicle_id uuid; review_id uuid;
  hospital_id uuid; hospital_org uuid; fixture_booking_id uuid; offer_id uuid; assignment_id uuid;
  fixture_trip_id uuid; trip_version bigint; completion_pin text;
  fixture_shift_id uuid; tracking jsonb; sos_booking_id uuid;
  driver_profile jsonb; patient_profile jsonb; denied boolean := false;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at)
    VALUES(patient_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||suffix,now()),
      (driver_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','+91'||(suffix+1),now());
  INSERT INTO clinzo.organization(public_code,name,kind)
    VALUES('ORG-'||gen_random_uuid()::text,'Fixture Hospital Operator','care_provider') RETURNING id INTO hospital_org;
  INSERT INTO clinzo.facility(organization_id,public_code,name,kind,address,location)
    VALUES(hospital_org,'HOS-'||gen_random_uuid()::text,'Fixture Hospital','hospital','Fixture Hospital Road',
      extensions.ST_SetSRID(extensions.ST_MakePoint(77.51,12.91),4326)::extensions.geography)
    RETURNING id INTO hospital_id;

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT public.complete_onboarding('patient','{"full_name":"Fixture Ambulance Patient"}'::jsonb) INTO patient_profile;
  patient_id:=(patient_profile->>'patient_id')::uuid;
  IF patient_id IS NULL THEN RAISE EXCEPTION 'Patient onboarding failed'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',driver_auth::text,true);
  SELECT public.complete_onboarding('driver_independent',jsonb_build_object('full_name','Fixture Driver',
    'license_number',driver_auth::text,'license_expires_on',(current_date+365)::text)) INTO driver_profile;
  fixture_driver_id:=(driver_profile->'driver'->>'id')::uuid;
  IF fixture_driver_id IS NULL THEN RAISE EXCEPTION 'Driver onboarding failed'; END IF;
  SELECT public.register_my_ambulance_vehicle('FIX-'||substr(fixture_driver_id::text,1,12),'Fixture BLS Vehicle',
    current_date+365,'BLS','Basic life support equipment inspected by company',
    'Driver and required clinical crew documents submitted') INTO fixture_vehicle_id;
  IF fixture_vehicle_id IS NULL THEN RAISE EXCEPTION 'Vehicle submission failed'; END IF;
  BEGIN
    PERFORM public.set_my_driver_availability(fixture_vehicle_id,true,12.9,77.5);
  EXCEPTION WHEN insufficient_privilege THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Pending fleet could go Available'; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM clinzo.record_manual_credential_review('driver',fixture_driver_id,'verified','fixture-company','fixture-license');
  SELECT r.id INTO review_id FROM clinzo.vehicle_review_request r
    WHERE r.driver_id=fixture_driver_id AND r.vehicle_id=fixture_vehicle_id;
  PERFORM clinzo.record_manual_fleet_review(review_id,'approved',now()+interval '300 days',
    'fixture-company','fixture-equipment-and-crew','Vehicle and required crew checked');

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',driver_auth::text,true);
  IF public.set_my_driver_availability(fixture_vehicle_id,true,12.9,77.5) IS NULL THEN
    RAISE EXCEPTION 'Approved fleet could not go Available'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT public.request_ambulance_booking(patient_id,12.901,77.501,'Fixture pickup near hospital',
    hospital_id,'BLS',gen_random_uuid()) INTO fixture_booking_id;
  IF fixture_booking_id IS NULL THEN RAISE EXCEPTION 'Ambulance booking failed'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',driver_auth::text,true);
  SELECT (o->>'id')::uuid INTO offer_id FROM jsonb_array_elements(public.list_my_driver_offers()) o
    WHERE (o->>'booking_id')::uuid=fixture_booking_id LIMIT 1;
  IF offer_id IS NULL THEN RAISE EXCEPTION 'Reviewed nearby driver received no offer'; END IF;
  SELECT public.respond_my_driver_offer(offer_id,true) INTO assignment_id;
  IF assignment_id IS NULL THEN RAISE EXCEPTION 'Offer acceptance failed'; END IF;
  SELECT (x->>'active_shift_id')::uuid INTO fixture_shift_id
    FROM jsonb_array_elements(public.list_my_ambulance_fleet()) x
    WHERE (x->>'vehicle_id')::uuid=fixture_vehicle_id LIMIT 1;
  IF public.update_my_driver_location(fixture_shift_id,12.902,77.502,20,now(),gen_random_uuid(),1)
    IS DISTINCT FROM true THEN RAISE EXCEPTION 'Driver tracking update failed'; END IF;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT public.get_my_active_ambulance_tracking(fixture_booking_id) INTO tracking;
  IF (tracking->>'latitude')::double precision IS DISTINCT FROM 12.902 THEN
    RAISE EXCEPTION 'Patient cannot read active driver location'; END IF;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.ambulance_booking b JOIN clinzo.ambulance_assignment a ON a.booking_id=b.id
    JOIN clinzo.trip t ON t.assignment_id=a.id WHERE b.id=fixture_booking_id AND b.status='assigned'
      AND t.status='heading_to_pickup') THEN RAISE EXCEPTION 'Assignment and trip not created'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',driver_auth::text,true);
  SELECT (x->>'id')::uuid,(x->>'row_version')::bigint INTO fixture_trip_id,trip_version
    FROM jsonb_array_elements(public.list_my_driver_trips()) x
    WHERE (x->>'booking_id')::uuid=fixture_booking_id LIMIT 1;
  IF fixture_trip_id IS NULL THEN RAISE EXCEPTION 'Driver trip missing'; END IF;
  PERFORM public.transition_my_driver_trip(fixture_trip_id,trip_version,'arrive_pickup');
  SELECT (x->>'row_version')::bigint INTO trip_version FROM jsonb_array_elements(public.list_my_driver_trips()) x
    WHERE (x->>'id')::uuid=fixture_trip_id;
  PERFORM public.transition_my_driver_trip(fixture_trip_id,trip_version,'start');
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT public.get_my_patient_verification_pin(patient_id) INTO completion_pin;
  IF completion_pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Patient completion PIN missing'; END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',driver_auth::text,true);
  SELECT (x->>'row_version')::bigint INTO trip_version FROM jsonb_array_elements(public.list_my_driver_trips()) x
    WHERE (x->>'id')::uuid=fixture_trip_id;
  PERFORM public.transition_my_driver_trip(fixture_trip_id,trip_version,'arrive_destination');
  IF public.complete_my_driver_trip(fixture_trip_id,
    CASE WHEN completion_pin='0000' THEN '0001' ELSE '0000' END) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Wrong patient PIN completed trip'; END IF;
  IF public.complete_my_driver_trip(fixture_trip_id,completion_pin) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Correct patient PIN did not complete trip'; END IF;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.trip t JOIN clinzo.ambulance_booking b ON b.id=t.booking_id
    JOIN clinzo.ambulance_assignment a ON a.id=t.assignment_id
    WHERE t.id=fixture_trip_id AND t.status='completed' AND t.pin_credential_version=1
      AND b.status='fulfilled' AND a.released_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Trip completion state is inconsistent'; END IF;
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',patient_auth::text,true);
  SELECT public.request_my_sos(patient_id,12.901,77.501,'Fixture emergency pickup',
    'Emergency assistance required',gen_random_uuid()) INTO sos_booking_id;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.ambulance_booking b JOIN clinzo.emergency_case e ON e.booking_id=b.id
    JOIN clinzo.booking_capability bc ON bc.booking_id=b.id JOIN clinzo.capability c ON c.id=bc.capability_id
    WHERE b.id=sos_booking_id AND b.booking_type='sos' AND b.priority=100 AND c.code='ALS'
      AND b.destination_position IS NULL) THEN RAISE EXCEPTION 'SOS did not reuse ALS dispatch infrastructure'; END IF;
END $$;
ROLLBACK;
SELECT true AS ambulance_smoke_passed;
