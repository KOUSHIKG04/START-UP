-- Share the existing admission calculation with discovery, without limiting the
-- choice of online times or changing appointment admission/locking semantics.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('clinzo.has_daily_booking_capacity(uuid,uuid)'::regprocedure);
  IF position('RETURN reserved<daily_limit;' in definition)=0 THEN
    RAISE EXCEPTION 'Unexpected daily capacity calculation';
  END IF;
  definition:=replace(definition,'clinzo.has_daily_booking_capacity(', 'clinzo.remaining_daily_booking_capacity(');
  definition:=replace(definition,'RETURNS boolean','RETURNS integer');
  definition:=replace(definition,'RETURN false;','RETURN 0;');
  definition:=replace(definition,'RETURN true;','RETURN NULL;');
  definition:=replace(definition,'RETURN reserved<daily_limit;','RETURN greatest(daily_limit-reserved,0);');
  EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION clinzo.remaining_daily_booking_capacity(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION clinzo.has_daily_booking_capacity(p_session_id uuid,p_exclude_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT coalesce(clinzo.remaining_daily_booking_capacity(p_session_id,p_exclude_id)>0,true);
$$;
REVOKE ALL ON FUNCTION clinzo.has_daily_booking_capacity(uuid,uuid) FROM PUBLIC,anon,authenticated;

DO $$
DECLARE fn regprocedure; definition text; changed int:=0;
BEGIN
  FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('list_clinic_slots','list_practice_clinic_slots','list_practice_service_slots') LOOP
    definition:=pg_get_functiondef(fn);
    IF position('w.id AS window_id' in definition)=0 OR position('daily_bookings_remaining' in definition)>0 THEN
      RAISE EXCEPTION 'Unexpected availability projection: %',fn;
    END IF;
    definition:=replace(definition,'w.id AS window_id',
      'CASE WHEN clinzo.service_mode_for_session(s.id)=''clinic'' THEN clinzo.remaining_clinic_channel_capacity(s.id,''patient_online'')
        ELSE clinzo.remaining_daily_booking_capacity(s.id) END AS daily_bookings_remaining,
      w.id AS window_id');
    EXECUTE definition;changed:=changed+1;
  END LOOP;
  IF changed<>3 THEN RAISE EXCEPTION 'Expected three availability owners'; END IF;
END $$;

-- The same treating doctor may read a signed record. Clinical write endpoints
-- still require an active consultation; no patient/staff access is broadened.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('public.get_doctor_consultation_draft(uuid)'::regprocedure);
  IF position('c0.status=''active'' AND d.identity_id=actor' in definition)=0
    OR position('RETURN jsonb_build_object(' in definition)=0 THEN
    RAISE EXCEPTION 'Unexpected consultation read owner';
  END IF;
  definition:=replace(definition,'c0.status=''active'' AND d.identity_id=actor',
    'c0.status IN (''active'',''signed'',''amended'') AND d.identity_id=actor');
  definition:=replace(definition,'Active consultation access required','Treating doctor consultation access required');
  definition:=replace(definition,'RETURN jsonb_build_object(', $projection$RETURN jsonb_build_object(
    'status',c.status,'signed_at',c.signed_at,
    'assessment',(SELECT n.body FROM clinzo.clinical_note n WHERE n.consultation_id=c.id AND n.kind='assessment'
      ORDER BY n.signed_at DESC,n.id DESC LIMIT 1),
    'medicines',coalesce((SELECT jsonb_agg(jsonb_build_object('medicine_name',item.medicine_name,'strength',item.strength,
      'form',item.form,'route',item.route,'instructions',item.instructions,
      'schedule',(SELECT jsonb_build_object('dose_quantity',phase.dose_quantity::text,'dose_unit',phase.dose_unit,
        'starts_on',phase.starts_on,'ends_on',phase.ends_on,
        'timings',coalesce((SELECT jsonb_agg(jsonb_build_object('meal_anchor',mt.meal_anchor,'meal_relation',mt.meal_relation)
          ORDER BY mt.sequence) FROM clinzo.medication_timing mt WHERE mt.phase_id=phase.id),'[]'::jsonb))
        FROM clinzo.medication_phase phase WHERE phase.prescription_item_id=item.id ORDER BY phase.phase_number LIMIT 1))
      ORDER BY item.line_number)
      FROM clinzo.prescription p JOIN LATERAL (SELECT r.id,r.action FROM clinzo.prescription_revision r
        WHERE r.prescription_id=p.id ORDER BY r.revision_number DESC LIMIT 1) latest ON latest.action<>'discontinue'
      JOIN clinzo.prescription_item item ON item.revision_id=latest.id WHERE p.consultation_id=c.id),'[]'::jsonb),$projection$);
  EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION public.get_doctor_consultation_draft(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_doctor_consultation_draft(uuid) TO authenticated;
