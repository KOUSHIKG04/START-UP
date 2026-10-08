BEGIN;
DO $$
DECLARE user_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid();
  photo text; other_photo text; family_id uuid; detail jsonb; denied boolean;
BEGIN
  UPDATE clinzo.patient_email_dev_auth SET enabled=true WHERE singleton;
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (user_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',user_id::text||'@example.test',now());
  photo := user_id::text||'/'||gen_random_uuid()::text||'.jpg';
  other_photo := other_id::text||'/'||gen_random_uuid()::text||'.jpg';
  INSERT INTO storage.objects(bucket_id,name) VALUES ('patient-profile-photos',photo),('patient-profile-photos',other_photo);
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',user_id::text,true);
  PERFORM public.complete_patient_profile(jsonb_build_object('full_name','Contact Fixture','birth_date','2000-01-01','gender','Other','blood_group','O+','contact_phone','+919000000011'));
  IF public.get_my_patient_profile_detail()->>'contact_phone' IS DISTINCT FROM '+919000000011' THEN
    RAISE EXCEPTION 'Patient contact phone was not persisted'; END IF;
  denied := false;
  BEGIN
    PERFORM public.complete_patient_profile(jsonb_build_object('full_name','Contact Fixture','birth_date','2000-01-01','gender','Other','blood_group','O+','contact_phone','91'));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid phone accepted'; END IF;
  family_id := public.add_my_family_profile(jsonb_build_object('full_name','Photo Family','birth_date','2010-01-01','gender','Other','blood_group','O+','relation','Sibling','phone','+919000000012','notify',true,'profile_photo_path',photo));
  SELECT entry INTO detail FROM jsonb_array_elements(public.list_my_family_profiles()) entry WHERE entry->>'id'=family_id::text;
  IF detail->>'profile_photo_path' IS DISTINCT FROM photo OR (detail->>'verified')::boolean THEN
    RAISE EXCEPTION 'Family photo missing or access incorrectly verified'; END IF;
  denied := false;
  BEGIN
    PERFORM public.add_my_family_profile(jsonb_build_object('full_name','Wrong Photo','birth_date','2010-01-01','gender','Other','blood_group','O+','relation','Sibling','phone','+919000000013','notify',false,'profile_photo_path',other_photo));
  EXCEPTION WHEN SQLSTATE '22023' THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Another user photo accepted'; END IF;
  EXECUTE 'RESET ROLE';
  IF (SELECT phone FROM auth.users WHERE id=user_id) IS NOT NULL THEN
    RAISE EXCEPTION 'Contact phone changed Auth identity'; END IF;
END $$;
SELECT true AS patient_contact_photo_smoke_passed;
ROLLBACK;
