-- A reviewer must have a current, confirmed Supabase Auth identity as well as
-- a company-only grant. A facility membership never implies this permission.
CREATE OR REPLACE FUNCTION clinzo.company_reviewer_identity() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT i.id FROM clinzo.identity i
  JOIN clinzo.company_reviewer r ON r.identity_id=i.id
  JOIN auth.users u ON u.id=i.subject::uuid
  WHERE i.issuer='supabase' AND i.subject=(SELECT auth.uid())::text
    AND i.disabled_at IS NULL AND r.active
    AND (u.banned_until IS NULL OR u.banned_until<now())
    AND ((u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL)
      OR (u.phone IS NOT NULL AND u.phone_confirmed_at IS NOT NULL))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION clinzo.company_reviewer_identity() FROM PUBLIC,anon,authenticated;

-- Existing trusted manual decisions remain authoritative when introducing the
-- new queue. They are history, not documents awaiting a second approval.
UPDATE clinzo.verification_document vd SET status='approved',reviewed_at=now()
FROM clinzo.verification_case vc JOIN clinzo.doctor d ON d.id=vc.doctor_id
WHERE vd.case_id=vc.id AND d.credential_status='verified' AND vd.status='pending';
UPDATE clinzo.verification_case vc SET status='verified',reviewed_at=now()
FROM clinzo.doctor d WHERE vc.doctor_id=d.id AND d.credential_status='verified';
