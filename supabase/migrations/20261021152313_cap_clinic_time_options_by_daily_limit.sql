-- Clinic discovery advertises only the remaining daily booking allowance.
-- Keep the stored windows, existing appointments, RPC signatures and grants.
-- Apply the cap before p_limit so later dates are still included in the result.
DO $$
DECLARE
  fn regprocedure;
  definition text;
  changed integer := 0;
  ranked_select text := $ranked$
SELECT row_number() OVER (
        PARTITION BY p.id,s.booking_day_id,clinzo.service_mode_for_session(s.id)
        ORDER BY w.starts_at,w.id,ps.id
      ) AS _daily_rank,
      CASE WHEN clinzo.service_mode_for_session(s.id)='clinic' THEN (
        SELECT greatest(settings.walkin_daily_limit-(
          SELECT count(*)::integer
          FROM clinzo.appointment reserved
          JOIN clinzo.session reserved_session ON reserved_session.id=reserved.session_id
          WHERE reserved_session.booking_day_id=s.booking_day_id
            AND reserved_session.doctor_facility_id=p.id
            AND clinzo.service_mode_for_session(reserved_session.id)='clinic'
            AND ((reserved.confirmed_at IS NOT NULL AND reserved.capacity_released_at IS NULL)
              OR (reserved.status='pending' AND reserved.request_expires_at>now()))
        ),0)
        FROM clinzo.doctor_schedule_preferences settings
        WHERE settings.doctor_facility_id=p.id
      ) ELSE NULL END AS _daily_remaining,
      w.id AS window_id$ranked$;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('list_clinic_slots','list_practice_clinic_slots','list_practice_service_slots')
  LOOP
    definition:=pg_get_functiondef(fn);
    IF position('RETURN coalesce((SELECT jsonb_agg(x) FROM (' in definition)=0
      OR position('SELECT w.id AS window_id' in definition)=0
      OR position('ORDER BY w.starts_at,w.id,ps.id LIMIT p_limit' in definition)=0 THEN
      RAISE EXCEPTION 'Unexpected slot listing definition: %',fn;
    END IF;
    definition:=replace(definition,
      'RETURN coalesce((SELECT jsonb_agg(x) FROM (',
      'RETURN coalesce((SELECT jsonb_agg(to_jsonb(x)-''_daily_rank''-''_daily_remaining''
        ORDER BY x.starts_at,x.window_id,x.practice_service_id) FROM (
        SELECT ranked.* FROM (');
    definition:=replace(definition,'SELECT w.id AS window_id',ranked_select);
    definition:=replace(definition,'ORDER BY w.starts_at,w.id,ps.id LIMIT p_limit',
      ') ranked
      WHERE ranked._daily_remaining IS NULL OR ranked._daily_rank<=ranked._daily_remaining
      ORDER BY ranked.starts_at,ranked.window_id,ranked.practice_service_id LIMIT p_limit');
    EXECUTE definition;
    changed:=changed+1;
  END LOOP;
  IF changed<>3 THEN
    RAISE EXCEPTION 'Expected three slot listing functions; updated %',changed;
  END IF;
END $$;
