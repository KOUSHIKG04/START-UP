BEGIN;
DO $$
DECLARE account uuid:=gen_random_uuid(); other_account uuid:=gen_random_uuid(); blocked boolean;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) VALUES
    (account,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',account::text||'@example.test',now()),
    (other_account,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',other_account::text||'@example.test',now());
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',account::text,true);
  FOR attempt IN 1..20 LOOP
    IF public.authorize_map_place_lookup() IS DISTINCT FROM true THEN RAISE EXCEPTION 'New user cannot search before onboarding'; END IF;
  END LOOP;
  IF public.authorize_map_place_lookup() IS DISTINCT FROM false THEN RAISE EXCEPTION 'Map search quota not enforced'; END IF;
  PERFORM set_config('request.jwt.claim.sub',other_account::text,true);
  IF public.authorize_map_place_lookup() IS DISTINCT FROM true THEN RAISE EXCEPTION 'Quota leaked across accounts'; END IF;
  PERFORM set_config('request.jwt.claim.sub','',true);
  blocked:=false;
  BEGIN PERFORM public.authorize_map_place_lookup(); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Unauthenticated map search authorized'; END IF;
  EXECUTE 'RESET ROLE';
END $$;
SELECT true AS map_place_lookup_smoke_passed;
ROLLBACK;
