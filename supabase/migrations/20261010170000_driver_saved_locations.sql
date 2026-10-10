-- Personal Home-header addresses only; dispatch GPS, profile address and shifts remain unchanged.
CREATE TABLE clinzo.driver_saved_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES clinzo.driver(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 80),
  kind text NOT NULL CHECK (kind IN ('house','office','other','current')),
  building text,
  street text,
  locality text,
  city text,
  state text,
  pincode text,
  latitude double precision,
  longitude double precision,
  instructions text,
  use_account_details boolean NOT NULL DEFAULT true,
  receiver_name text,
  receiver_phone text,
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT driver_saved_location_coordinates_ck CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  ),
  CONSTRAINT driver_saved_location_pincode_ck CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$'),
  CONSTRAINT driver_saved_location_instructions_ck CHECK (instructions IS NULL OR length(instructions) <= 500),
  CONSTRAINT driver_saved_location_receiver_ck CHECK (
    use_account_details OR
    (length(trim(coalesce(receiver_name,''))) BETWEEN 2 AND 120 AND receiver_phone ~ '^\+[1-9][0-9]{7,14}$')
  )
);
CREATE INDEX driver_saved_location_driver_idx ON clinzo.driver_saved_location(driver_id, updated_at DESC);
CREATE UNIQUE INDEX driver_saved_location_selected_uq ON clinzo.driver_saved_location(driver_id) WHERE selected;
CREATE UNIQUE INDEX driver_saved_location_current_uq ON clinzo.driver_saved_location(driver_id) WHERE kind='current';
ALTER TABLE clinzo.driver_saved_location ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON clinzo.driver_saved_location FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.my_driver_for_locations() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT d.id FROM clinzo.driver d JOIN clinzo.identity i ON i.id=d.identity_id
 WHERE auth.uid() IS NOT NULL AND i.issuer='supabase' AND i.subject=auth.uid()::text
   AND i.disabled_at IS NULL AND d.active LIMIT 1
$$;
REVOKE ALL ON FUNCTION clinzo.my_driver_for_locations() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.list_my_driver_locations() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid := clinzo.my_driver_for_locations();
BEGIN
  IF pid IS NULL THEN RAISE EXCEPTION 'Driver access required' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(l) - 'driver_id' ORDER BY l.selected DESC,l.updated_at DESC)
    FROM clinzo.driver_saved_location l WHERE l.driver_id=pid),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.list_my_driver_locations() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_driver_locations() TO authenticated;

CREATE FUNCTION public.save_my_driver_location(p_location jsonb, p_location_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid := clinzo.my_driver_for_locations(); saved_id uuid;
  k text := p_location->>'kind'; n text := trim(coalesce(p_location->>'label',''));
  lat double precision; lng double precision;
BEGIN
  IF pid IS NULL THEN RAISE EXCEPTION 'Driver access required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM clinzo.driver WHERE id=pid FOR UPDATE;
  IF jsonb_typeof(p_location) IS DISTINCT FROM 'object' OR k IS NULL OR k NOT IN ('house','office','other','current')
    OR length(n) NOT BETWEEN 1 AND 80
    OR length(coalesce(p_location->>'building',''))>160
    OR length(coalesce(p_location->>'street',''))>200
    OR length(coalesce(p_location->>'locality',''))>160
    OR length(coalesce(p_location->>'city',''))>120
    OR length(coalesce(p_location->>'state',''))>120
    OR length(coalesce(p_location->>'instructions',''))>500
    OR (coalesce((p_location->>'use_account_details')::boolean,true)=false AND
      (length(trim(coalesce(p_location->>'receiver_name',''))) NOT BETWEEN 2 AND 120
       OR coalesce(p_location->>'receiver_phone','') !~ '^\+[1-9][0-9]{7,14}$'))
    OR (k<>'current' AND length(trim(coalesce(p_location->>'building','')))=0)
    OR (p_location->>'pincode' IS NOT NULL AND p_location->>'pincode' !~ '^[0-9]{6}$')
    OR (p_location->>'latitude' IS NULL) <> (p_location->>'longitude' IS NULL)
    OR (p_location->>'latitude' IS NOT NULL AND
       (p_location->>'latitude' !~ '^-?[0-9]+(\.[0-9]+)?$' OR p_location->>'longitude' !~ '^-?[0-9]+(\.[0-9]+)?$'))
  THEN RAISE EXCEPTION 'Invalid saved location' USING ERRCODE='22023'; END IF;
  lat := (p_location->>'latitude')::double precision;
  lng := (p_location->>'longitude')::double precision;
  IF lat IS NOT NULL AND (lat NOT BETWEEN -90 AND 90 OR lng NOT BETWEEN -180 AND 180)
  THEN RAISE EXCEPTION 'Invalid coordinates' USING ERRCODE='22023'; END IF;
  IF p_location_id IS NULL AND k='current' THEN
    SELECT id INTO saved_id FROM clinzo.driver_saved_location WHERE driver_id=pid AND kind='current';
  ELSE saved_id := p_location_id; END IF;
  IF saved_id IS NOT NULL THEN
    UPDATE clinzo.driver_saved_location SET label=n,kind=k,building=nullif(trim(p_location->>'building'),''),
      street=nullif(trim(p_location->>'street'),''),locality=nullif(trim(p_location->>'locality'),''),
      city=nullif(trim(p_location->>'city'),''),state=nullif(trim(p_location->>'state'),''),
      pincode=nullif(p_location->>'pincode',''),latitude=lat,longitude=lng,
      instructions=nullif(trim(p_location->>'instructions'),''),
      use_account_details=coalesce((p_location->>'use_account_details')::boolean,true),
      receiver_name=nullif(trim(p_location->>'receiver_name'),''),
      receiver_phone=nullif(trim(p_location->>'receiver_phone'),''),updated_at=now()
    WHERE id=saved_id AND driver_id=pid RETURNING id INTO saved_id;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Location not found' USING ERRCODE='42501'; END IF;
  ELSE
    INSERT INTO clinzo.driver_saved_location(driver_id,label,kind,building,street,locality,city,state,pincode,latitude,longitude,instructions,use_account_details,receiver_name,receiver_phone,selected)
    VALUES (pid,n,k,nullif(trim(p_location->>'building'),''),nullif(trim(p_location->>'street'),''),
      nullif(trim(p_location->>'locality'),''),nullif(trim(p_location->>'city'),''),
      nullif(trim(p_location->>'state'),''),nullif(p_location->>'pincode',''),lat,lng,
      nullif(trim(p_location->>'instructions'),''),coalesce((p_location->>'use_account_details')::boolean,true),
      nullif(trim(p_location->>'receiver_name'),''),nullif(trim(p_location->>'receiver_phone'),''),
      NOT EXISTS(SELECT 1 FROM clinzo.driver_saved_location WHERE driver_id=pid))
    RETURNING id INTO saved_id;
  END IF;
  RETURN saved_id;
END $$;
REVOKE ALL ON FUNCTION public.save_my_driver_location(jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_driver_location(jsonb,uuid) TO authenticated;

CREATE FUNCTION public.select_my_driver_location(p_location_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid := clinzo.my_driver_for_locations();
BEGIN
  IF pid IS NULL THEN RAISE EXCEPTION 'Driver access required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM clinzo.driver WHERE id=pid FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM clinzo.driver_saved_location WHERE id=p_location_id AND driver_id=pid)
  THEN RAISE EXCEPTION 'Location not found' USING ERRCODE='42501'; END IF;
  UPDATE clinzo.driver_saved_location SET selected=false WHERE driver_id=pid AND selected;
  UPDATE clinzo.driver_saved_location SET selected=true,updated_at=now()
    WHERE id=p_location_id AND driver_id=pid;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.select_my_driver_location(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.select_my_driver_location(uuid) TO authenticated;

CREATE FUNCTION public.delete_my_driver_location(p_location_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid := clinzo.my_driver_for_locations(); was_selected boolean;
BEGIN
  IF pid IS NULL THEN RAISE EXCEPTION 'Driver access required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM clinzo.driver WHERE id=pid FOR UPDATE;
  DELETE FROM clinzo.driver_saved_location WHERE id=p_location_id AND driver_id=pid
    RETURNING selected INTO was_selected;
  IF was_selected IS NULL THEN RAISE EXCEPTION 'Location not found' USING ERRCODE='42501'; END IF;
  IF was_selected THEN
    UPDATE clinzo.driver_saved_location SET selected=true,updated_at=now()
    WHERE id=(SELECT id FROM clinzo.driver_saved_location WHERE driver_id=pid ORDER BY updated_at DESC LIMIT 1);
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.delete_my_driver_location(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_driver_location(uuid) TO authenticated;
