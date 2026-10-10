-- A stable personal profile address reuses saved locations; it never identifies a practice.
ALTER TABLE clinzo.doctor_saved_location ADD COLUMN is_profile_address boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX doctor_saved_location_profile_uq ON clinzo.doctor_saved_location(doctor_id) WHERE is_profile_address;
ALTER TABLE clinzo.doctor_saved_location ADD CONSTRAINT doctor_saved_location_profile_ck CHECK (
 NOT is_profile_address OR (kind='house' AND length(trim(coalesce(building,'')))>=2
 AND length(trim(coalesce(locality,'')))>=2 AND length(trim(coalesce(city,'')))>=2
 AND length(trim(coalesce(state,'')))>=2 AND pincode IS NOT NULL)
);

CREATE FUNCTION public.get_my_doctor_personal_address() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE did uuid:=clinzo.my_doctor_for_locations();
BEGIN
 IF did IS NULL THEN RAISE EXCEPTION 'Doctor access required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT to_jsonb(l)-'doctor_id' FROM clinzo.doctor_saved_location l WHERE doctor_id=did AND is_profile_address);
END $$;
REVOKE ALL ON FUNCTION public.get_my_doctor_personal_address() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_doctor_personal_address() TO authenticated;

-- Keep profile + personal address edits in a single transaction and retain the existing profile logic.
CREATE FUNCTION public.save_my_doctor_profile_with_address(p_full_name text,p_bio text,p_languages text[],p_address jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE did uuid:=clinzo.my_doctor_for_locations(); location_id uuid; result jsonb;
BEGIN
 IF did IS NULL THEN RAISE EXCEPTION 'Doctor access required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_address) IS DISTINCT FROM 'object' OR p_address->>'kind' IS DISTINCT FROM 'house'
 OR length(trim(coalesce(p_address->>'building','')))<2
 OR length(trim(coalesce(p_address->>'locality','')))<2
 OR length(trim(coalesce(p_address->>'city','')))<2
 OR length(trim(coalesce(p_address->>'state','')))<2
 OR coalesce(p_address->>'pincode','') !~ '^[0-9]{6}$'
 THEN RAISE EXCEPTION 'Complete your personal address, locality, city, state and pincode' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM clinzo.doctor WHERE id=did FOR UPDATE;
 SELECT id INTO location_id FROM clinzo.doctor_saved_location WHERE doctor_id=did AND is_profile_address;
 result:=public.update_my_doctor_profile(p_full_name,p_bio,p_languages);
 location_id:=public.save_my_doctor_location(p_address || jsonb_build_object('label','Home','use_account_details',true),location_id);
 UPDATE clinzo.doctor_saved_location SET is_profile_address=true WHERE id=location_id AND doctor_id=did;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_my_doctor_profile_with_address(text,text,text[],jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_my_doctor_profile_with_address(text,text,text[],jsonb) TO authenticated;
