-- The timezone-name catalog is expensive to enumerate. An unchanged, already
-- validated value does not need another catalog lookup on every row update.
CREATE OR REPLACE FUNCTION clinzo.validate_timezone() RETURNS trigger
LANGUAGE plpgsql SET search_path='pg_catalog' AS $$
DECLARE zone_name text:=to_jsonb(NEW)->>TG_ARGV[0];
BEGIN
  IF TG_OP='UPDATE' AND zone_name IS NOT NULL AND zone_name=to_jsonb(OLD)->>TG_ARGV[0] THEN
    RETURN NEW;
  END IF;
  -- Generated sessions/days inherit a rule whose timezone has already passed
  -- this validator. Prove that relationship from private rows, never a caller-
  -- writable cache or a flag that could bypass validation.
  IF TG_TABLE_SCHEMA='clinzo' AND TG_TABLE_NAME='session' THEN
    IF EXISTS(SELECT 1 FROM clinzo.schedule_rule r
      WHERE r.id=(to_jsonb(NEW)->>'schedule_rule_id')::uuid AND r.timezone=zone_name) THEN RETURN NEW; END IF;
  ELSIF TG_TABLE_SCHEMA='clinzo' AND TG_TABLE_NAME='doctor_booking_day' THEN
    IF EXISTS(SELECT 1 FROM clinzo.schedule_rule r JOIN clinzo.doctor_facility p ON p.id=r.doctor_facility_id
      WHERE p.doctor_id=(to_jsonb(NEW)->>'doctor_id')::uuid AND r.timezone=zone_name) THEN RETURN NEW; END IF;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=zone_name) THEN
    RAISE EXCEPTION 'Invalid IANA timezone' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

-- Reuse the already-locked doctor's booking day instead of attempting a fresh
-- INSERT (and running its BEFORE INSERT timezone check) for every reused session.
DO $$
DECLARE definition text; marker text;
BEGIN
  definition:=replace(pg_get_functiondef('clinzo.insert_generated_schedule_session(uuid,timestamptz,timestamptz)'::regprocedure),E'\r\n',E'\n');
  marker:='INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone)
    VALUES(d.id,(p_start AT TIME ZONE r.timezone)::date,r.timezone)
    ON CONFLICT(doctor_id,local_date) DO UPDATE SET timezone=excluded.timezone RETURNING id INTO day_id;';
  IF position(marker in definition)=0 THEN RAISE EXCEPTION 'Unexpected generated-session booking-day owner'; END IF;
  definition:=replace(definition,marker,
    'SELECT id INTO day_id FROM clinzo.doctor_booking_day
      WHERE doctor_id=d.id AND local_date=(p_start AT TIME ZONE r.timezone)::date FOR UPDATE;
    IF day_id IS NULL THEN
      INSERT INTO clinzo.doctor_booking_day(doctor_id,local_date,timezone)
        VALUES(d.id,(p_start AT TIME ZONE r.timezone)::date,r.timezone)
        ON CONFLICT(doctor_id,local_date) DO UPDATE SET timezone=excluded.timezone RETURNING id INTO day_id;
    ELSE
      UPDATE clinzo.doctor_booking_day SET timezone=r.timezone
        WHERE id=day_id AND timezone IS DISTINCT FROM r.timezone;
    END IF;');
  EXECUTE definition;
END $$;

-- Match the entire published grid, including every time block. Quota/auto-accept
-- edits and repeated saves keep existing sessions, window IDs and booking state.
-- Genuine time/day/duration/fee/buffer changes still use the established rebuild.
DO $$
DECLARE definition text; marker text;
BEGIN
  definition:=replace(pg_get_functiondef('public.publish_doctor_schedule_from_date(uuid,text,jsonb,bigint,date)'::regprocedure),E'\r\n',E'\n');
  marker:='UPDATE clinzo.appointment_window w SET state=''blocked'' WHERE w.session_id IN (';
  IF position(marker in definition)=0 OR position('INSERT INTO clinzo.audit_log' in definition)=0 THEN
    RAISE EXCEPTION 'Unexpected multi-block publication owner'; END IF;
  definition:=replace(definition,marker,
    'IF daily_limit>0 AND jsonb_array_length(blocks)>0
      AND (SELECT count(*) FROM clinzo.schedule_rule r WHERE r.doctor_facility_id=p_practice_id
        AND r.service_mode=p_mode AND r.automatic AND r.state=''published'')=jsonb_array_length(blocks)
      AND NOT EXISTS(SELECT 1 FROM clinzo.schedule_rule r WHERE r.doctor_facility_id=p_practice_id
        AND r.service_mode=p_mode AND r.automatic AND r.state=''published'' AND (
          r.effective_from>local_day OR r.effective_until IS NOT NULL OR r.iso_weekdays<>days
          OR r.window_minutes<>duration OR r.fee_minor IS DISTINCT FROM fee OR r.timezone<>d.booking_timezone
          OR r.travel_buffer_minutes<>buffer OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(blocks) b
            WHERE r.local_start=(b->>''start'')::time AND r.local_end=(b->>''end'')::time))) THEN
      UPDATE clinzo.schedule_rule SET session_capacity=daily_limit,
        auto_confirm_limit=CASE WHEN prefs.auto_accept THEN prefs.auto_accept_limit ELSE 0 END
        WHERE doctor_facility_id=p_practice_id AND service_mode=p_mode AND automatic AND state=''published''
          AND (session_capacity,auto_confirm_limit) IS DISTINCT FROM
            (daily_limit,CASE WHEN prefs.auto_accept THEN prefs.auto_accept_limit ELSE 0 END);
      FOR rule_id IN SELECT id FROM clinzo.schedule_rule WHERE doctor_facility_id=p_practice_id
        AND service_mode=p_mode AND automatic AND state=''published'' LOOP
        slot_count:=slot_count+clinzo.materialize_schedule_rule(rule_id);
      END LOOP;
    ELSE
    '||marker);
  definition:=replace(definition,'INSERT INTO clinzo.audit_log','END IF;
  INSERT INTO clinzo.audit_log');
  EXECUTE definition;
END $$;
