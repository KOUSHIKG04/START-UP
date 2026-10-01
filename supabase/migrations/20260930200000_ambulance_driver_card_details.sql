-- Preserve the assigned driver snapshot after the assignment is released at completion.
-- A rating shown on the tracking card is derived from published trip reviews.
CREATE OR REPLACE FUNCTION public.list_my_ambulance_bookings() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(booking_row)) FROM (
    SELECT b.id,b.public_code,b.status,b.booking_type,b.created_at,b.pickup_address,b.destination_address,
      b.row_version::text AS row_version,c.code AS capability_code,
      assignment.driver_name_snapshot AS driver_name,assignment.vehicle_registration_snapshot AS vehicle_registration,
      assignment.operator_name_snapshot AS operator_name,t.status AS trip_status,
      review.service_rating AS review_rating,
      (SELECT round(avg(r.driver_rating)::numeric,1)::text
        FROM clinzo.ambulance_review r
        JOIN clinzo.trip rt ON rt.id=r.trip_id
        JOIN clinzo.ambulance_assignment ra ON ra.id=rt.assignment_id
        WHERE ra.driver_id=assignment.driver_id AND r.moderation_state='published') AS driver_rating,
      (SELECT count(*)::integer
        FROM clinzo.ambulance_review r
        JOIN clinzo.trip rt ON rt.id=r.trip_id
        JOIN clinzo.ambulance_assignment ra ON ra.id=rt.assignment_id
        WHERE ra.driver_id=assignment.driver_id AND r.moderation_state='published') AS driver_review_count
    FROM clinzo.ambulance_booking b JOIN clinzo.patient_access pa ON pa.patient_id=b.patient_id
    JOIN clinzo.patient p ON p.id=b.patient_id JOIN clinzo.booking_capability bc ON bc.booking_id=b.id
    JOIN clinzo.capability c ON c.id=bc.capability_id
    LEFT JOIN clinzo.trip t ON t.booking_id=b.id
    LEFT JOIN clinzo.ambulance_assignment assignment ON assignment.id=t.assignment_id
    LEFT JOIN clinzo.ambulance_review review ON review.trip_id=t.id
    WHERE pa.identity_id=actor AND pa.relationship='self' AND pa.verified_at IS NOT NULL
      AND pa.revoked_at IS NULL AND p.archived_at IS NULL
    ORDER BY b.created_at DESC,b.id DESC LIMIT 100
  ) booking_row),'[]'::jsonb);
END $$;
