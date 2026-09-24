-- A verified email/password portal session may resolve an existing identity.
-- Mobile onboarding still calls require_phone_user before creating profiles.
-- Auth alone never grants a facility membership.
CREATE OR REPLACE FUNCTION clinzo.require_identity(p_name text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  u uuid := auth.uid();
  i clinzo.identity;
  verified_number text;
  has_verified_email boolean;
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'A verified account is required' USING ERRCODE='42501';
  END IF;

  SELECT CASE WHEN phone_confirmed_at IS NOT NULL THEN phone ELSE NULL END,
         email IS NOT NULL AND email_confirmed_at IS NOT NULL
    INTO verified_number, has_verified_email
    FROM auth.users
    WHERE id=u AND (banned_until IS NULL OR banned_until < now());
  IF verified_number IS NULL AND coalesce(has_verified_email,false)=false THEN
    RAISE EXCEPTION 'A verified account is required' USING ERRCODE='42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
  SELECT * INTO i FROM clinzo.identity WHERE issuer='supabase' AND subject=u::text;
  IF i.disabled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Account disabled' USING ERRCODE='42501';
  END IF;
  IF i.id IS NULL THEN
    IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
      RAISE EXCEPTION 'Complete your profile first' USING ERRCODE='22023';
    END IF;
    INSERT INTO clinzo.identity(issuer,subject,display_name,verified_phone)
      VALUES('supabase',u::text,trim(p_name),verified_number) RETURNING * INTO i;
  ELSIF i.verified_phone IS DISTINCT FROM verified_number THEN
    UPDATE clinzo.identity SET verified_phone=verified_number WHERE id=i.id RETURNING * INTO i;
  END IF;
  RETURN i.id;
END $$;

REVOKE ALL ON FUNCTION clinzo.require_identity(text) FROM PUBLIC, anon, authenticated;
