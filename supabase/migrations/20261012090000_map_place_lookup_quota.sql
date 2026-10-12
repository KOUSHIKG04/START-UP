CREATE FUNCTION public.authorize_map_place_lookup() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor text := 'auth:'||auth.uid()::text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid()) OR EXISTS(SELECT 1 FROM clinzo.identity WHERE issuer='supabase' AND subject=auth.uid()::text AND disabled_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Signed-in account required' USING ERRCODE='42501'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor,88));
  IF (SELECT count(*) FROM clinzo.idempotency_record WHERE principal_scope=actor AND operation='maps.place_lookup' AND expires_at>now())>=20 THEN RETURN false; END IF;
  INSERT INTO clinzo.idempotency_record(principal_scope,operation,key,request_hash,resource_type,resource_id,result_code,expires_at)
    VALUES(actor,'maps.place_lookup',gen_random_uuid()::text,sha256(convert_to(actor,'UTF8')),'provider_lookup',auth.uid(),'authorized',now()+interval '1 minute');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.authorize_map_place_lookup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_map_place_lookup() TO authenticated;
