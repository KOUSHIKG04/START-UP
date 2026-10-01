-- Read-only, scoped facility roster. An active "Leave" exception blocks appointments;
-- clinic presence must not be interpreted as an online consultation.
CREATE FUNCTION public.list_my_facility_doctors() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := clinzo.require_portal_identity();
BEGIN
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(roster_row) ORDER BY roster_row.name) FROM (
    SELECT d.id, p.id AS practice_id, d.full_name AS name, d.public_code AS clinzo_id,
      coalesce((SELECT string_agg(s.name, ', ' ORDER BY s.name)
        FROM clinzo.doctor_specialty ds JOIN clinzo.specialty s ON s.id=ds.specialty_id
        WHERE ds.doctor_id=d.id AND s.active), '') AS specialization,
      coalesce(i.verified_phone, '') AS phone,
      d.credential_status='verified' AS verified,
      EXISTS (SELECT 1 FROM clinzo.schedule_exception e
        WHERE e.doctor_id=d.id AND e.state='active'
          AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=p.id)
          AND lower(trim(e.reason))='leave'
          AND e.starts_at<=now() AND e.ends_at>now()) AS on_leave
    FROM clinzo.doctor_facility p
    JOIN clinzo.doctor d ON d.id=p.doctor_id
    JOIN clinzo.facility f ON f.id=p.facility_id
    JOIN clinzo.organization o ON o.id=f.organization_id
    LEFT JOIN clinzo.identity i ON i.id=d.identity_id
    WHERE p.active AND d.active AND f.active AND o.active
      AND clinzo.can_manage_practice(actor,p.id)
    ORDER BY d.full_name LIMIT 500
  ) roster_row), '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.list_my_facility_doctors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_facility_doctors() TO authenticated;
