-- A patient may review their own completed appointment exactly once. Public
-- discovery already aggregates published doctor_review rows by session doctor.
CREATE FUNCTION public.get_my_doctor_review(p_appointment_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT to_jsonb(review_row) FROM (
    SELECT r.rating, r.comment
    FROM clinzo.doctor_review r
    JOIN clinzo.appointment a ON a.id = r.appointment_id
    JOIN clinzo.patient_access pa ON pa.patient_id = a.patient_id
    JOIN clinzo.patient p ON p.id = a.patient_id
    JOIN clinzo.identity i ON i.id = pa.identity_id
    WHERE r.appointment_id = p_appointment_id
      AND i.issuer = 'supabase' AND i.subject = (SELECT auth.uid())::text
      AND i.disabled_at IS NULL AND pa.relationship = 'self'
      AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL
      AND p.archived_at IS NULL
  ) review_row;
$$;

CREATE FUNCTION public.submit_my_doctor_review(
  p_appointment_id uuid, p_rating integer, p_comment text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := clinzo.require_identity();
  appointment_row clinzo.appointment;
  review_id uuid;
  clean_comment text := NULLIF(trim(p_comment), '');
BEGIN
  IF p_appointment_id IS NULL OR p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5
    OR length(coalesce(clean_comment, '')) > 1000 THEN
    RAISE EXCEPTION 'Choose a rating from 1 to 5; feedback must be at most 1000 characters'
      USING ERRCODE = '22023';
  END IF;

  SELECT a.* INTO appointment_row
  FROM clinzo.appointment a
  JOIN clinzo.patient_access pa ON pa.patient_id = a.patient_id
  JOIN clinzo.patient p ON p.id = a.patient_id
  WHERE a.id = p_appointment_id AND a.status = 'completed'
    AND pa.identity_id = actor AND pa.relationship = 'self'
    AND pa.verified_at IS NOT NULL AND pa.revoked_at IS NULL
    AND p.archived_at IS NULL
  FOR UPDATE OF a;
  IF appointment_row.id IS NULL THEN
    RAISE EXCEPTION 'Only your completed appointment can be rated'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO clinzo.doctor_review(appointment_id, rating, comment, submitted_by, moderation_state)
    VALUES(appointment_row.id, p_rating, clean_comment, actor, 'published')
    RETURNING id INTO review_id;
  INSERT INTO clinzo.audit_log(actor_id, actor_kind, action, resource_type, resource_id, request_id, outcome, metadata)
    VALUES(actor, 'identity', 'doctor.review_submitted', 'doctor_review', review_id,
      gen_random_uuid(), 'allowed', '{}'::jsonb);
  RETURN review_id;
END $$;

REVOKE ALL ON FUNCTION public.get_my_doctor_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_my_doctor_review(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_doctor_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_doctor_review(uuid, integer, text) TO authenticated;
