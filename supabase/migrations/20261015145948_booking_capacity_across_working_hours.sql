-- Offer every future time within working hours. Admission limits actual bookings.
CREATE OR REPLACE FUNCTION clinzo.materialize_schedule_rule(p_rule_id uuid) RETURNS integer
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r clinzo.schedule_rule; d clinzo.doctor; local_day date; local_clock timestamp;
  candidate timestamptz; candidate_end timestamptz; group_start timestamptz; group_end timestamptz;
  created int:=0; available boolean; first_offset int; today date;
BEGIN
  SELECT * INTO r FROM clinzo.schedule_rule WHERE id=p_rule_id AND (state='published' OR (state='retired' AND effective_until IS NOT NULL AND effective_until>=(now() AT TIME ZONE timezone)::date)) AND automatic;
  IF r.id IS NULL THEN RETURN 0; END IF;
  today:=(now() AT TIME ZONE r.timezone)::date;
  first_offset:=greatest(0,coalesce(r.materialized_through-today+1,0));
  IF first_offset>29 THEN RETURN 0; END IF;
  SELECT d0.* INTO d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE p.id=r.doctor_facility_id AND p.active AND d0.active AND d0.credential_status='verified'
      AND f.active AND f.verification_status='verified' AND o.active FOR UPDATE OF d0;
  IF d.id IS NULL THEN RETURN 0; END IF;
  -- Re-read after taking the doctor lock: publication may have retired this
  -- version or another worker may already have extended its horizon.
  SELECT * INTO r FROM clinzo.schedule_rule WHERE id=p_rule_id AND (state='published' OR (state='retired' AND effective_until IS NOT NULL AND effective_until>=(now() AT TIME ZONE timezone)::date)) AND automatic;
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
      available:=r.session_capacity>0 AND candidate>now()
        AND candidate AT TIME ZONE r.timezone=local_clock
        AND candidate_end-candidate=make_interval(mins=>r.window_minutes)
        AND NOT EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_id=d.id AND s.state<>'cancelled'
          AND s.starts_at<candidate_end AND s.ends_at>candidate)
        AND NOT EXISTS(SELECT 1 FROM clinzo.session s WHERE s.doctor_facility_id=r.doctor_facility_id
          AND s.starts_at=candidate AND EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.session_id=s.id))
        AND NOT EXISTS(SELECT 1 FROM clinzo.schedule_exception e WHERE e.doctor_id=d.id AND e.state='active'
          AND (e.doctor_facility_id IS NULL OR e.doctor_facility_id=r.doctor_facility_id)
          AND e.service_mode IN ('all',r.service_mode) AND e.starts_at<candidate_end AND e.ends_at>candidate);
      IF group_start IS NOT NULL AND (NOT available OR candidate<>group_end OR candidate_end-group_start>interval '8 hours') THEN
        created:=created+clinzo.insert_generated_schedule_session(r.id,group_start,group_end);
        group_start:=NULL; group_end:=NULL;
      END IF;
      IF available THEN
        IF group_start IS NULL THEN group_start:=candidate; END IF;
        group_end:=candidate_end;
      END IF;
    END LOOP;
    IF group_start IS NOT NULL THEN created:=created+clinzo.insert_generated_schedule_session(r.id,group_start,group_end); END IF;
  END LOOP;
  UPDATE clinzo.schedule_rule SET materialized_through=today+29 WHERE id=r.id;
  RETURN created;
END $$;

CREATE FUNCTION clinzo.has_daily_booking_capacity(p_session_id uuid,p_exclude_id uuid DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE target clinzo.session; settings clinzo.doctor_schedule_preferences; mode text; daily_limit int; reserved int;
BEGIN
 SELECT * INTO target FROM clinzo.session WHERE id=p_session_id;
 IF target.id IS NULL THEN RETURN false; END IF;
 mode:=clinzo.service_mode_for_session(target.id);
 SELECT * INTO settings FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=target.doctor_facility_id;
 -- Sessions explicitly published without recurring preferences retain their own capacity.
 IF settings.doctor_facility_id IS NULL THEN RETURN true; END IF;
 daily_limit:=CASE mode WHEN 'online' THEN settings.online_daily_limit
   WHEN 'home' THEN CASE WHEN settings.home_visits THEN 100 ELSE 0 END ELSE settings.walkin_daily_limit END;
 IF coalesce(daily_limit,0)<1 THEN RETURN false; END IF;
 SELECT count(*)::int INTO reserved FROM clinzo.appointment a
 JOIN clinzo.session s ON s.id=a.session_id
 WHERE s.booking_day_id=target.booking_day_id AND clinzo.service_mode_for_session(s.id)=mode
   AND (p_exclude_id IS NULL OR a.id<>p_exclude_id)
   AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL)
     OR (a.status='pending' AND a.request_expires_at>now()));
 RETURN reserved<daily_limit;
END $$;
REVOKE ALL ON FUNCTION clinzo.has_daily_booking_capacity(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION clinzo.enforce_daily_booking_capacity() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE reserving boolean; already_reserved boolean:=false;
BEGIN
 reserving:=(NEW.confirmed_at IS NOT NULL AND NEW.capacity_released_at IS NULL)
   OR (NEW.status='pending' AND NEW.request_expires_at>now());
 IF NOT reserving THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
   already_reserved:=NEW.session_id=OLD.session_id AND (
     (OLD.confirmed_at IS NOT NULL AND OLD.capacity_released_at IS NULL)
     OR (OLD.status='pending' AND OLD.request_expires_at>now()));
 END IF;
 IF already_reserved THEN RETURN NEW; END IF;
 -- Serialize admission across all this doctor's sessions and practice locations.
 PERFORM day.id FROM clinzo.doctor_booking_day day JOIN clinzo.session s ON s.booking_day_id=day.id
 WHERE s.id=NEW.session_id FOR UPDATE OF day;
 IF NOT clinzo.has_daily_booking_capacity(NEW.session_id,NEW.id) THEN
   RAISE EXCEPTION 'Daily booking limit reached. Choose another day.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION clinzo.enforce_daily_booking_capacity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_daily_booking_capacity
BEFORE INSERT OR UPDATE OF status,confirmed_at,capacity_released_at ON clinzo.appointment
FOR EACH ROW EXECUTE FUNCTION clinzo.enforce_daily_booking_capacity();

-- Discovery uses the same active-booking count as admission.
DO $$
DECLARE fn regprocedure; definition text; updated text;
BEGIN
 FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('list_clinic_slots','list_practice_clinic_slots','list_practice_service_slots') LOOP
   definition:=pg_get_functiondef(fn);
   updated:=replace(definition,'w.state=''open''','w.state=''open'' AND clinzo.has_daily_booking_capacity(s.id)');
   IF updated=definition THEN RAISE EXCEPTION 'Slot availability predicate missing in %',fn; END IF;
   IF position('list_practice_service_slots' in updated)>0 THEN
     updated:=replace(updated,'p_limit NOT BETWEEN 1 AND 3000','p_limit NOT BETWEEN 1 AND 10000');
   END IF;
   EXECUTE updated;
 END LOOP;
END $$;

-- Fill ungenerated gaps in existing schedules; materialization skips past,
-- overlapping, booked, and unavailable times and leaves existing windows intact.
DO $$
DECLARE rule_id uuid;
BEGIN
 FOR rule_id IN SELECT r.id FROM clinzo.schedule_rule r
 WHERE r.automatic AND (r.state='published' OR (r.state='retired' AND r.effective_until>=(now() AT TIME ZONE r.timezone)::date))
 ORDER BY r.doctor_facility_id,r.id LOOP
   UPDATE clinzo.schedule_rule SET materialized_through=NULL WHERE id=rule_id;
   PERFORM clinzo.materialize_schedule_rule(rule_id);
 END LOOP;
END $$;


