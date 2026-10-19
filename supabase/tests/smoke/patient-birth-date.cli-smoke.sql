-- Disposable project only. Auth accounts and profile changes roll back.
BEGIN;
DO $$
DECLARE user_id uuid := gen_random_uuid(); detail jsonb; family_id uuid; denied boolean;
  dob date := date '2000-10-09'; suffix text := replace(gen_random_uuid()::text,'-','');
BEGIN
  UPDATE clinzo.patient_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at)
    VALUES(user_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',suffix||'@example.test',now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',user_id::text,true);
  PERFORM public.complete_patient_profile(jsonb_build_object('full_name','DOB Fixture',
    'birth_date',dob,'age_years',1,'gender','Other','blood_group','O+'));
  detail := public.get_my_patient_profile_detail();
  IF detail->>'birth_date' IS DISTINCT FROM dob::text
    OR (detail->>'age_years')::int IS DISTINCT FROM extract(year FROM age(current_date,dob))::int THEN
    RAISE EXCEPTION 'DOB was not persisted or authoritative age was incorrect';
  END IF;
  denied := false;
  BEGIN
    PERFORM public.complete_patient_profile(jsonb_build_object('full_name','DOB Fixture',
      'birth_date',current_date+1,'age_years',1,'gender','Other','blood_group','O+'));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Future DOB was accepted'; END IF;
  denied := false;
  BEGIN
    PERFORM public.complete_patient_profile(jsonb_build_object('full_name','DOB Fixture',
      'birth_date','2025-02-29','age_years',1,'gender','Other','blood_group','O+'));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied := true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid calendar DOB was accepted'; END IF;
  family_id := public.add_my_family_profile(jsonb_build_object('full_name','DOB Family',
    'birth_date',dob,'age_years',1,'gender','Female','blood_group','A+',
    'relation','Sibling','phone','+919000000001','notify',false));
  SELECT entry INTO detail FROM jsonb_array_elements(public.list_my_family_profiles()) entry
    WHERE entry->>'id'=family_id::text;
  IF detail->>'birth_date' IS DISTINCT FROM dob::text
    OR (detail->>'age_years')::int IS DISTINCT FROM extract(year FROM age(current_date,dob))::int THEN
    RAISE EXCEPTION 'Family DOB persistence or derived age is incorrect';
  END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS patient_birth_date_smoke_passed;
ROLLBACK;
