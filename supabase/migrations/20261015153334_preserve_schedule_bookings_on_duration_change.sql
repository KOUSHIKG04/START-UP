-- Keep actual bookings in their original windows. Refill only unused portions
-- of an automatic session, so a single booked window does not freeze its day.
CREATE FUNCTION clinzo.insert_generated_window_in_session(p_rule_id uuid,p_session_id uuid,p_start timestamptz,p_end timestamptz) RETURNS integer
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r clinzo.schedule_rule; s clinzo.session;
BEGIN
  SELECT * INTO STRICT r FROM clinzo.schedule_rule WHERE id=p_rule_id AND automatic;
  SELECT * INTO STRICT s FROM clinzo.session WHERE id=p_session_id FOR UPDATE;
  IF s.doctor_facility_id<>r.doctor_facility_id OR clinzo.service_mode_for_session(s.id)<>r.service_mode
    OR s.state NOT IN ('published','open') OR p_start<=now() OR p_start<s.starts_at OR p_end>s.ends_at
    OR p_end-p_start<>make_interval(mins=>r.window_minutes)
    OR NOT EXISTS(SELECT 1 FROM clinzo.schedule_rule old WHERE old.id=s.schedule_rule_id AND old.automatic) THEN
    RETURN 0;
  END IF;
  -- History and active requests both retain their original window IDs and times.
  IF EXISTS(SELECT 1 FROM clinzo.appointment_window w WHERE w.session_id=s.id AND w.starts_at<p_end AND w.ends_at>p_start
    AND (w.state<>'blocked' OR w.starts_at<=now() OR EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.window_id=w.id))) THEN RETURN 0; END IF;
  DELETE FROM clinzo.appointment_window w WHERE w.session_id=s.id AND w.state='blocked'
    AND w.starts_at>now() AND w.starts_at<p_end AND w.ends_at>p_start
    AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.window_id=w.id);
  INSERT INTO clinzo.appointment_window(session_id,starts_at,ends_at,hard_capacity,state) VALUES(s.id,p_start,p_end,1,'open');
  UPDATE clinzo.session SET hard_capacity=greatest(hard_capacity,(SELECT count(*) FROM clinzo.appointment_window WHERE session_id=s.id)),
    auto_confirm_limit=r.auto_confirm_limit WHERE id=s.id;
  -- Issued appointments use immutable fee/name snapshots; these values apply to new bookings.
  UPDATE clinzo.practice_service ps SET fee_minor=r.fee_minor,duration_minutes=r.window_minutes
    FROM clinzo.session_service ss WHERE ss.session_id=s.id AND ss.practice_service_id=ps.id;
  RETURN 1;
END $$;
REVOKE ALL ON FUNCTION clinzo.insert_generated_window_in_session(uuid,uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION clinzo.materialize_schedule_rule(p_rule_id uuid) RETURNS integer
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r clinzo.schedule_rule; d clinzo.doctor; local_day date; local_clock timestamp;
  candidate timestamptz; candidate_end timestamptz; group_start timestamptz; group_end timestamptz;
  created int:=0; available boolean; first_offset int; today date; containing_session uuid;
BEGIN
  SELECT * INTO r FROM clinzo.schedule_rule WHERE id=p_rule_id AND automatic
    AND (state='published' OR (state='retired' AND effective_until IS NOT NULL AND effective_until>=(now() AT TIME ZONE timezone)::date));
  IF r.id IS NULL THEN RETURN 0; END IF;
  today:=(now() AT TIME ZONE r.timezone)::date;
  first_offset:=greatest(0,coalesce(r.materialized_through-today+1,0));
  IF first_offset>29 THEN RETURN 0; END IF;
  SELECT d0.* INTO d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE p.id=r.doctor_facility_id AND p.active AND d0.active AND d0.credential_status='verified'
      AND f.active AND f.verification_status='verified' AND o.active FOR UPDATE OF d0;
  IF d.id IS NULL THEN RETURN 0; END IF;
  SELECT * INTO r FROM clinzo.schedule_rule WHERE id=p_rule_id AND automatic
    AND (state='published' OR (state='retired' AND effective_until IS NOT NULL AND effective_until>=today));
  IF r.id IS NULL THEN RETURN 0; END IF;
  first_offset:=greatest(0,coalesce(r.materialized_through-today+1,0));
  IF first_offset>29 THEN RETURN 0; END IF;
  FOR day_offset IN first_offset..29 LOOP
    local_day:=today+day_offset;
    IF local_day<r.effective_from OR (r.effective_until IS NOT NULL AND local_day>r.effective_until)
      OR extract(isodow FROM local_day)::int<>ALL(r.iso_weekdays) THEN CONTINUE; END IF;
    group_start:=NULL; group_end:=NULL;
    FOR local_clock IN SELECT generate_series(local_day+r.local_start,
      local_day+r.local_end-make_interval(mins=>r.window_minutes),make_interval(mins=>r.window_minutes)) LOOP
      candidate:=local_clock AT TIME ZONE r.timezone;
      candidate_end:=(local_clock+make_interval(mins=>r.window_minutes)) AT TIME ZONE r.timezone;
      available:=r.session_capacity>0 AND candidate>now() AND candidate AT TIME ZONE r.timezone=local_clock
        AND candidate_end-candidate=make_interval(mins=>r.window_minutes)
        AND NOT EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=d.id AND e.state='active'
          AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=r.doctor_facility_id)
          AND e.service_mode IN ('all',r.service_mode) AND e.starts_at<candidate_end AND e.ends_at>candidate);
      containing_session:=NULL;
      IF available THEN
        SELECT s.id INTO containing_session FROM clinzo.session s JOIN clinzo.schedule_rule old ON old.id=s.schedule_rule_id
          WHERE s.doctor_facility_id=r.doctor_facility_id AND old.automatic AND old.service_mode=r.service_mode
            AND s.state IN ('published','open') AND s.starts_at<=candidate AND s.ends_at>=candidate_end;
        IF containing_session IS NULL THEN
          available:=NOT EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_id=d.id AND s.state<>'cancelled'
            AND s.starts_at<candidate_end AND s.ends_at>candidate)
            AND NOT EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_facility_id=r.doctor_facility_id
              AND s.starts_at=candidate AND EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.session_id=s.id));
        END IF;
      END IF;
      IF group_start IS NOT NULL AND (NOT available OR containing_session IS NOT NULL OR candidate<>group_end OR candidate_end-group_start>interval '8 hours') THEN
        created:=created+clinzo.insert_generated_schedule_session(r.id,group_start,group_end);
        group_start:=NULL; group_end:=NULL;
      END IF;
      IF available AND containing_session IS NOT NULL THEN
        created:=created+clinzo.insert_generated_window_in_session(r.id,containing_session,candidate,candidate_end);
      ELSIF available THEN
        IF group_start IS NULL THEN group_start:=candidate; END IF;
        group_end:=candidate_end;
      END IF;
    END LOOP;
    IF group_start IS NOT NULL THEN created:=created+clinzo.insert_generated_schedule_session(r.id,group_start,group_end); END IF;
  END LOOP;
  UPDATE clinzo.schedule_rule SET materialized_through=today+29 WHERE id=r.id;
  RETURN created;
END $$;

-- Preserve window IDs for limit-only edits, and replace future unused windows
-- even when their enclosing session has already started today.
DO $$
DECLARE definition text;
BEGIN
  definition:=pg_get_functiondef('public.publish_doctor_schedule_from_date(uuid,text,jsonb,bigint,date)'::regprocedure);
  IF position('family:=coalesce(old_rule.family_id,gen_random_uuid())' in definition)=0 THEN RAISE EXCEPTION 'Unexpected publication definition'; END IF;
  definition:=replace(definition,'family:=coalesce(old_rule.family_id,gen_random_uuid())',
    'IF old_rule.id IS NOT NULL AND daily_limit>0 AND old_rule.effective_from<=local_day
      AND old_rule.iso_weekdays=days AND old_rule.local_start=start_time AND old_rule.local_end=end_time
      AND old_rule.window_minutes=duration AND old_rule.fee_minor=fee AND old_rule.timezone=d.booking_timezone THEN
      UPDATE clinzo.schedule_rule SET session_capacity=daily_limit,auto_confirm_limit=CASE WHEN prefs.auto_accept THEN prefs.auto_accept_limit ELSE 0 END WHERE id=old_rule.id;
      RETURN jsonb_build_object(''settings'',public.get_my_schedule_preferences(p_practice_id),''slot_count'',0,''horizon_days'',30);
    END IF;
    family:=coalesce(old_rule.family_id,gen_random_uuid())');
  definition:=replace(definition,
    's.starts_at>=greatest(local_day::timestamp AT TIME ZONE d.booking_timezone,now()) AND s.starts_at>now()',
    's.ends_at>greatest(local_day::timestamp AT TIME ZONE d.booking_timezone,now())');
  definition:=replace(definition,'AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.window_id=w.id',
    'AND w.starts_at>now() AND w.starts_at>=local_day::timestamp AT TIME ZONE d.booking_timezone
    AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.window_id=w.id');
  -- Elapsed/in-progress sessions are kept so the remaining windows can be refilled.
  definition:=replace(definition,'AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.session_id=s.id);',
    'AND s.starts_at>now() AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.session_id=s.id);');
  EXECUTE definition;
  definition:=pg_get_functiondef('clinzo.has_daily_booking_capacity(uuid,uuid)'::regprocedure);
  IF position('s.booking_day_id=target.booking_day_id AND' in definition)=0 THEN RAISE EXCEPTION 'Unexpected daily capacity definition'; END IF;
  EXECUTE replace(definition,'s.booking_day_id=target.booking_day_id AND',
    's.booking_day_id=target.booking_day_id AND s.doctor_facility_id=target.doctor_facility_id AND');
END $$;
