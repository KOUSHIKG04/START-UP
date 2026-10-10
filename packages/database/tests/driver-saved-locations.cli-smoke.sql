-- Authorized disposable project only. All records roll back.
BEGIN;
DO $$
DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); i uuid; d uuid; location uuid; other uuid; denied boolean; org uuid;
BEGIN
 INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
 (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','personal-address-'||a||'@example.test',now()),
 (b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','personal-address-'||b||'@example.test',now());
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',a::text,'Personal address owner') RETURNING id INTO i;
 INSERT INTO clinzo.organization(public_code,name,kind) VALUES('ORG-'||a,'Saved address fixture','ambulance_operator') RETURNING id INTO org;
 INSERT INTO clinzo.driver(identity_id,organization_id,public_code,full_name,license_number,license_expires_on,verification_status)
 VALUES(i,org,'DRV-'||a,'Personal address owner',a::text,'2030-01-01','verified') RETURNING id INTO d;
 INSERT INTO clinzo.identity(issuer,subject,display_name) VALUES('supabase',b::text,'Other address owner') RETURNING id INTO i;
 INSERT INTO clinzo.driver(identity_id,organization_id,public_code,full_name,license_number,license_expires_on,verification_status)
 VALUES(i,org,'DRV-'||b,'Other address owner',b::text,'2030-01-01','verified');
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 location:=public.save_my_driver_location(jsonb_build_object('label','Home','kind','house','building','Test building','locality','Test Area','city','Bengaluru','state','Karnataka','pincode','560001','latitude',12.9,'longitude',77.5));
 other:=public.save_my_driver_location(jsonb_build_object('label','Office','kind','office','building','Work building','latitude',13,'longitude',77.6));
 IF jsonb_array_length(public.list_my_driver_locations())<>2 THEN RAISE EXCEPTION 'Saved personal addresses missing'; END IF;
 PERFORM public.select_my_driver_location(other);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_my_driver_locations()) l WHERE l->>'id'=other::text AND (l->>'selected')::boolean) THEN RAISE EXCEPTION 'Selection not persisted'; END IF;
 EXECUTE 'RESET ROLE';
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 IF jsonb_array_length(public.list_my_driver_locations())<>0 THEN RAISE EXCEPTION 'Another driver sees personal addresses'; END IF;
 denied:=false;
 BEGIN PERFORM public.select_my_driver_location(location); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Another driver selected address'; END IF;
 denied:=false;
 BEGIN PERFORM public.save_my_driver_location(jsonb_build_object('label','Hijack','kind','house','building','Hijack'),location); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Another driver edited address'; END IF;
 denied:=false;
 BEGIN PERFORM public.delete_my_driver_location(location); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Another driver deleted address'; END IF;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 PERFORM public.delete_my_driver_location(other);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.list_my_driver_locations()) l WHERE l->>'id'=location::text AND (l->>'selected')::boolean) THEN RAISE EXCEPTION 'Deleting selection lost fallback'; END IF;
 EXECUTE 'RESET ROLE';
 IF EXISTS(SELECT 1 FROM clinzo.driver_shift WHERE driver_id=d) OR EXISTS(SELECT 1 FROM clinzo.driver_location_latest WHERE driver_id=d) THEN RAISE EXCEPTION 'Saved addresses changed live dispatch state'; END IF;
 IF (SELECT home_address FROM clinzo.driver WHERE id=d) IS NOT NULL THEN RAISE EXCEPTION 'Saved addresses changed residential profile'; END IF;
 IF has_function_privilege('anon','public.list_my_driver_locations()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous location access'; END IF;
END $$;
ROLLBACK;
SELECT true AS driver_saved_locations_smoke_passed;
