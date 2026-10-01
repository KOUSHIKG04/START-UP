-- One-time repair for the five Clinzo disposable-test drivers seeded before
-- driver_registration_application became the onboarding/review source of truth.
-- Run ONLY with --project-ref enjafragbcrrgaclwopd after a rollback trial.
BEGIN;
DO $$
DECLARE
  seed_identity_ids uuid[];
  seed_driver_ids uuid[];
  seed_org_ids uuid[];
  expected_emails text[] := ARRAY[
    'clinzo-driver-01@example.com', 'clinzo-driver-02@example.com',
    'clinzo-driver-03@example.com', 'clinzo-driver-04@example.com',
    'clinzo-driver-05@example.com'];
BEGIN
  SELECT array_agg(i.id ORDER BY u.email), array_agg(d.id ORDER BY u.email),
         array_agg(d.organization_id ORDER BY u.email)
    INTO seed_identity_ids,seed_driver_ids,seed_org_ids
  FROM auth.users u
  JOIN clinzo.identity i ON i.issuer='supabase' AND i.subject=u.id::text
  JOIN clinzo.driver d ON d.identity_id=i.id
  WHERE u.email=ANY(expected_emails)
    AND d.verification_status='pending' AND d.active
    AND d.license_number='TEST-DL-'||substring(u.email FROM '([0-9]{2})@');
  IF cardinality(seed_driver_ids) <> 5 OR
     (SELECT count(DISTINCT id) FROM unnest(seed_org_ids) AS id) <> 5 OR
     (SELECT count(*) FROM clinzo.driver_registration_application
       WHERE identity_id=ANY(seed_identity_ids)) <> 0 OR
     (SELECT count(*) FROM clinzo.organization_member
       WHERE organization_id=ANY(seed_org_ids)) <> 5 OR
     (SELECT count(*) FROM clinzo.organization_member
       WHERE organization_id=ANY(seed_org_ids) AND identity_id<>ALL(seed_identity_ids)) <> 0 OR
     (SELECT count(*) FROM clinzo.driver
       WHERE organization_id=ANY(seed_org_ids) AND id<>ALL(seed_driver_ids)) <> 0 OR
     (SELECT count(*) FROM clinzo.vehicle
       WHERE organization_id=ANY(seed_org_ids)) <> 0 OR
     (SELECT count(*) FROM clinzo.driver_shift
       WHERE driver_id=ANY(seed_driver_ids)) <> 0 OR
     (SELECT count(*) FROM clinzo.ambulance_assignment
       WHERE driver_id=ANY(seed_driver_ids)) <> 0 OR
     (SELECT count(*) FROM clinzo.driver_document
       WHERE driver_id=ANY(seed_driver_ids)) <> 0 THEN
    RAISE EXCEPTION 'Seeded driver state changed; refusing fixture repair';
  END IF;
  IF EXISTS (SELECT 1 FROM clinzo.driver WHERE id=ANY(seed_driver_ids)
      AND (date_of_birth IS NULL OR city IS NULL OR contact_phone IS NULL OR verification_consent_at IS NULL)) THEN
    RAISE EXCEPTION 'Seeded driver details incomplete; refusing fixture repair';
  END IF;

  INSERT INTO clinzo.driver_registration_application
    (identity_id,full_name,contact_phone,date_of_birth,city,profile_photo_path,consent_at)
  SELECT identity_id,full_name,contact_phone,date_of_birth,city,profile_photo_path,
         verification_consent_at
  FROM clinzo.driver WHERE id=ANY(seed_driver_ids);
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver applications were not inserted'; END IF;
  DELETE FROM clinzo.driver WHERE id=ANY(seed_driver_ids);
  UPDATE clinzo.organization_member SET active=false WHERE organization_id=ANY(seed_org_ids);
  UPDATE clinzo.organization SET active=false WHERE id=ANY(seed_org_ids);
END $$;
COMMIT;

SELECT u.email,a.status FROM auth.users u
JOIN clinzo.identity i ON i.issuer='supabase' AND i.subject=u.id::text
JOIN clinzo.driver_registration_application a ON a.identity_id=i.id
WHERE u.email LIKE 'clinzo-driver-0%@example.com'
ORDER BY u.email;
