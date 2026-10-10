-- Authorized disposable project only. All records roll back.
BEGIN;
DO $$
DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); i uuid; d uuid; location uuid; other uuid; denied boolean; before_count int;
BEGIN
 INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
 (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','personal-address-'||a||'@example.test',now()),
 (b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','personal-address-'||b||'@example.test',now());
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',a::text,'Personal address owner') RETURNING id INTO i;
 INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status)
 VALUES(i,'DOC-'||a,'Personal address owner','Fixture',a::text,'2020-01-01','verified') RETURNING id INTO d;
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',b::text,'Other address owner') RETURNING id INTO i;
 INSERT INTO clinzo.doctor(identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status)
 VALUES(i,'DOC-'||b,'Other address owner','Fixture',b::text,'2020-01-01','verified');
 SELECT count(*) INTO before_count FROM clinzo.doctor_facility WHERE doctor_id=d;
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 location:=public.save_my_doctor_location(jsonb_build_object('label','Home','kind','house','building','Test building','locality','Test Area','city','Bengaluru','state','Karnataka','pincode','560001','latitude',12.9,'longitude',77.5));
 other:=public.save_my_doctor_location(jsonb_build_object('label','Office','kind','office','building','Work building','latitude',13,'longitude',77.6));
 IF jsonb_array_length(public.list_my_doctor_locations())<>2 THEN RAISE EXCEPTION 'Saved personal addresses missing'; END IF;
 PERFORM public.select_my_doctor_location(other);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_my_doctor_locations()) l WHERE l->>'id'=other::text AND (l->>'selected')::boolean) THEN RAISE EXCEPTION 'Selection not persisted'; END IF;
 EXECUTE 'RESET ROLE';
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 IF jsonb_array_length(public.list_my_doctor_locations())<>0 THEN RAISE EXCEPTION 'Another doctor sees personal addresses'; END IF;
 denied:=false;
 BEGIN PERFORM public.select_my_doctor_location(location); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Another doctor selected address'; END IF;
 denied:=false;
 BEGIN PERFORM public.save_my_doctor_location(jsonb_build_object('label','Hijack','kind','house','building','Hijack'),location); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Another doctor edited address'; END IF;
 denied:=false;
 BEGIN PERFORM public.delete_my_doctor_location(location); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Another doctor deleted address'; END IF;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 PERFORM public.delete_my_doctor_location(other);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_my_doctor_locations()) l WHERE l->>'id'=location::text AND (l->>'selected')::boolean) THEN RAISE EXCEPTION 'Deleting selection lost fallback'; END IF;
 -- Personal profile address must remain stable while the Home-header selection changes.
 PERFORM public.save_my_doctor_profile_with_address('Personal address owner','Fixture bio',ARRAY[]::text[],
  jsonb_build_object('label','Home','kind','house','building','Residential building','locality','Residential Area','city','Shivamogga','state','Karnataka','pincode','577201','latitude',13.93,'longitude',75.56));
 other:=(public.get_my_doctor_personal_address()->>'id')::uuid;
 IF public.get_my_doctor_personal_address()->>'city'<>'Shivamogga' THEN RAISE EXCEPTION 'Personal address not persisted'; END IF;
 PERFORM public.select_my_doctor_location(location);
 IF (public.get_my_doctor_personal_address()->>'id')::uuid<>other THEN RAISE EXCEPTION 'Header selection changed profile address'; END IF;
 PERFORM public.save_my_doctor_profile_with_address('Personal address owner','Updated bio',ARRAY[]::text[],
  jsonb_build_object('label','Home','kind','house','building','New residential building','locality','Residential Area','city','Shivamogga','state','Karnataka','pincode','577201','latitude',13.93,'longitude',75.56));
 IF (public.get_my_doctor_personal_address()->>'id')::uuid<>other OR jsonb_array_length(public.list_my_doctor_locations())<>2 THEN RAISE EXCEPTION 'Profile retry duplicated address'; END IF;
 IF public.get_my_doctor_profile() ? 'personal_address' THEN RAISE EXCEPTION 'Contact address added to shared doctor projection'; END IF;
 denied:=false;
 BEGIN PERFORM public.save_my_doctor_profile_with_address('Wrong partial edit','Wrong bio',ARRAY[]::text[],
  jsonb_build_object('label','Home','kind','house','building','Incomplete'));
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied OR public.get_my_doctor_profile()->>'full_name'<>'Personal address owner' THEN RAISE EXCEPTION 'Invalid address partially changed profile'; END IF;
 -- Failure inside the address write must roll back the preceding profile update.
 denied:=false;
 BEGIN PERFORM public.save_my_doctor_profile_with_address('Wrong partial edit','Wrong bio',ARRAY[]::text[],
  jsonb_build_object('label','Home','kind','house','building','Residential building','locality','Residential Area','city','Shivamogga','state','Karnataka','pincode','577201','latitude',100,'longitude',75.56));
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied OR public.get_my_doctor_profile()->>'full_name'<>'Personal address owner' OR public.get_my_doctor_profile()->>'bio'<>'Updated bio' THEN RAISE EXCEPTION 'Address-write failure left a partial profile edit'; END IF;
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 IF public.get_my_doctor_personal_address() IS NOT NULL THEN RAISE EXCEPTION 'Personal profile address exposed to other doctor'; END IF;
 EXECUTE 'RESET ROLE';
 IF (SELECT count(*) FROM clinzo.doctor_facility WHERE doctor_id=d)<>before_count THEN RAISE EXCEPTION 'Personal addresses changed clinic associations'; END IF;
END $$;
ROLLBACK;
SELECT true AS doctor_personal_locations_smoke_passed;
