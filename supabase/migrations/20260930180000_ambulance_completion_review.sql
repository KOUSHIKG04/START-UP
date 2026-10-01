-- The original completion screen accepts one patient rating for a finished trip.
CREATE FUNCTION public.submit_my_ambulance_review(p_booking_id uuid, p_rating integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity(); trip_row clinzo.trip; review_id uuid;
BEGIN
  IF p_booking_id IS NULL OR p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Invalid trip rating' USING ERRCODE='22023';
  END IF;
  SELECT t.* INTO trip_row FROM clinzo.trip t
    JOIN clinzo.ambulance_booking b ON b.id=t.booking_id
    JOIN clinzo.patient_access pa ON pa.patient_id=b.patient_id
    JOIN clinzo.patient p ON p.id=b.patient_id
    WHERE b.id=p_booking_id AND b.status='fulfilled' AND t.status='completed'
      AND pa.identity_id=actor AND pa.relationship='self' AND pa.verified_at IS NOT NULL
      AND pa.revoked_at IS NULL AND p.archived_at IS NULL
    FOR UPDATE OF t;
  IF trip_row.id IS NULL THEN
    RAISE EXCEPTION 'Completed trip access required' USING ERRCODE='42501';
  END IF;
  IF EXISTS(SELECT 1 FROM clinzo.ambulance_review WHERE trip_id=trip_row.id) THEN
    RAISE EXCEPTION 'Trip already rated' USING ERRCODE='23505';
  END IF;
  INSERT INTO clinzo.ambulance_review(trip_id,submitted_by,driver_rating,service_rating,moderation_state)
    VALUES(trip_row.id,actor,p_rating,p_rating,'pending') RETURNING id INTO review_id;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,request_id,outcome,metadata)
    VALUES(actor,'identity','ambulance.review_submitted','ambulance_review',review_id,gen_random_uuid(),'allowed','{}');
  RETURN review_id;
END $$;

CREATE OR REPLACE FUNCTION public.list_my_ambulance_bookings() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(booking_row)) FROM (
    SELECT b.id,b.public_code,b.status,b.booking_type,b.created_at,b.pickup_address,b.destination_address,
      b.row_version::text AS row_version,c.code AS capability_code,
      assignment.driver_name_snapshot AS driver_name,assignment.vehicle_registration_snapshot AS vehicle_registration,
      assignment.operator_name_snapshot AS operator_name,t.status AS trip_status,
      review.service_rating AS review_rating
    FROM clinzo.ambulance_booking b JOIN clinzo.patient_access pa ON pa.patient_id=b.patient_id
    JOIN clinzo.patient p ON p.id=b.patient_id JOIN clinzo.booking_capability bc ON bc.booking_id=b.id
    JOIN clinzo.capability c ON c.id=bc.capability_id
    LEFT JOIN clinzo.ambulance_assignment assignment ON assignment.booking_id=b.id AND assignment.released_at IS NULL
    LEFT JOIN clinzo.trip t ON t.booking_id=b.id
    LEFT JOIN clinzo.ambulance_review review ON review.trip_id=t.id
    WHERE pa.identity_id=actor AND pa.relationship='self' AND pa.verified_at IS NOT NULL
      AND pa.revoked_at IS NULL AND p.archived_at IS NULL
    ORDER BY b.created_at DESC,b.id DESC LIMIT 100
  ) booking_row),'[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.submit_my_ambulance_review(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_my_ambulance_review(uuid,integer) TO authenticated;
