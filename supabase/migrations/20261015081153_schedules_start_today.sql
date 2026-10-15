-- Start new schedules today in the doctor timezone. Preserve elapsed and in-progress sessions.
CREATE OR REPLACE FUNCTION public.publish_doctor_schedule_from_date(p_practice_id uuid,p_mode text,p_settings jsonb,p_expected_version bigint,p_effective_from date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=clinzo.require_care_actor(); d clinzo.doctor; prefs clinzo.doctor_schedule_preferences;
  days smallint[]; start_time time; end_time time; duration int; daily_limit int; fee int;
  old_rule clinzo.schedule_rule; rule_id uuid; family uuid; next_version int; slot_count int:=0; local_day date;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('clinic','online','home') THEN RAISE EXCEPTION 'Choose a service' USING ERRCODE='22023'; END IF;
  IF NOT coalesce(clinzo.can_edit_practice_schedule(actor,p_practice_id),false)
    OR NOT coalesce(clinzo.can_manage_practice(actor,p_practice_id),false) THEN RAISE EXCEPTION 'Verified practice access required' USING ERRCODE='42501'; END IF;
  SELECT d0.* INTO d FROM clinzo.doctor d0 JOIN clinzo.doctor_facility p ON p.doctor_id=d0.id
    JOIN clinzo.facility f ON f.id=p.facility_id JOIN clinzo.organization o ON o.id=f.organization_id
    WHERE p.id=p_practice_id AND p.active AND d0.active AND d0.credential_status='verified'
      AND f.active AND f.verification_status='verified' AND o.active FOR UPDATE OF d0;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Verified practice access required' USING ERRCODE='42501'; END IF;
  local_day:=coalesce(p_effective_from,(now() AT TIME ZONE d.booking_timezone)::date);
  IF local_day<(now() AT TIME ZONE d.booking_timezone)::date OR local_day>(now() AT TIME ZONE d.booking_timezone)::date+365 THEN
    RAISE EXCEPTION 'Schedule changes must start today or a later date within one year' USING ERRCODE='22023'; END IF;
  PERFORM public.save_my_schedule_preferences(p_practice_id,p_settings,p_expected_version);
  SELECT * INTO STRICT prefs FROM clinzo.doctor_schedule_preferences WHERE doctor_facility_id=p_practice_id;
  days:=CASE p_mode WHEN 'online' THEN prefs.online_working_days WHEN 'home' THEN prefs.home_working_days ELSE prefs.working_days END;
  start_time:=CASE p_mode WHEN 'online' THEN prefs.online_start WHEN 'home' THEN prefs.home_start ELSE prefs.clinic_start END;
  end_time:=CASE p_mode WHEN 'online' THEN prefs.online_end WHEN 'home' THEN prefs.home_end ELSE prefs.clinic_end END;
  duration:=CASE p_mode WHEN 'online' THEN prefs.online_slot_minutes WHEN 'home' THEN prefs.home_slot_minutes ELSE prefs.slot_minutes END;
  daily_limit:=CASE p_mode WHEN 'online' THEN prefs.online_daily_limit WHEN 'home' THEN CASE WHEN prefs.home_visits THEN 100 ELSE 0 END ELSE prefs.walkin_daily_limit END;
  fee:=CASE p_mode WHEN 'online' THEN prefs.online_fee_minor WHEN 'home' THEN prefs.home_fee_minor ELSE prefs.clinic_fee_minor END;
  IF daily_limit>0 AND (fee IS NULL OR extract(epoch FROM end_time-start_time)<duration*60) THEN
    RAISE EXCEPTION 'Set a fee and hours that fit at least one slot' USING ERRCODE='22023'; END IF;
  IF daily_limit>0 AND EXISTS(SELECT 1 FROM clinzo.schedule_rule r JOIN clinzo.doctor_facility p ON p.id=r.doctor_facility_id
    WHERE p.doctor_id=d.id AND (r.state='published' OR (r.state='retired' AND r.automatic AND r.effective_until IS NOT NULL)) AND (r.effective_until IS NULL OR r.effective_until>=local_day) AND NOT (r.doctor_facility_id=p_practice_id AND r.service_mode=p_mode)
      AND r.iso_weekdays && days AND r.local_start<end_time AND r.local_end>start_time) THEN
    RAISE EXCEPTION 'These hours overlap another published service or practice. Choose separate hours.' USING ERRCODE='22023'; END IF;
  SELECT * INTO old_rule FROM clinzo.schedule_rule WHERE doctor_facility_id=p_practice_id AND service_mode=p_mode AND state='published' AND automatic FOR UPDATE;
  family:=coalesce(old_rule.family_id,gen_random_uuid()); next_version:=coalesce(old_rule.version,0)+1;
  -- A booking locks its session before checking availability. Match that order
  -- before deciding which empty future blocks can be replaced.
  PERFORM s.id FROM clinzo.session s JOIN clinzo.schedule_rule r ON r.id=s.schedule_rule_id
    WHERE s.doctor_facility_id=p_practice_id AND r.service_mode=p_mode AND r.automatic AND s.starts_at>=greatest(local_day::timestamp AT TIME ZONE d.booking_timezone,now()) AND s.starts_at>now()
    ORDER BY s.id FOR UPDATE OF s;
  UPDATE clinzo.appointment_window w SET state='blocked' WHERE w.session_id IN (
    SELECT s.id FROM clinzo.session s JOIN clinzo.schedule_rule r ON r.id=s.schedule_rule_id
    WHERE s.doctor_facility_id=p_practice_id AND r.service_mode=p_mode AND r.automatic AND s.starts_at>=greatest(local_day::timestamp AT TIME ZONE d.booking_timezone,now()) AND s.starts_at>now())
    AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.window_id=w.id
      AND ((a.confirmed_at IS NOT NULL AND a.capacity_released_at IS NULL) OR a.status='pending'));
  UPDATE clinzo.session s SET state='cancelled' FROM clinzo.schedule_rule r
    WHERE r.id=s.schedule_rule_id AND s.doctor_facility_id=p_practice_id AND r.service_mode=p_mode AND r.automatic AND s.starts_at>=greatest(local_day::timestamp AT TIME ZONE d.booking_timezone,now()) AND s.starts_at>now()
      AND NOT EXISTS(SELECT 1 FROM clinzo.appointment a WHERE a.session_id=s.id);
  -- Finite retired rules continue generating the unchanged earlier dates.
  -- Fully superseded future rules have no effective_until and stay retired.
  UPDATE clinzo.schedule_rule SET state='retired',
    effective_until=CASE WHEN effective_from<local_day THEN least(coalesce(effective_until,local_day-1),local_day-1) ELSE NULL END
    WHERE doctor_facility_id=p_practice_id AND service_mode=p_mode AND automatic
      AND (state='published' OR (state='retired' AND effective_until IS NOT NULL AND effective_until>=local_day));
  IF daily_limit>0 THEN
    INSERT INTO clinzo.schedule_rule(doctor_facility_id,version,family_id,effective_from,iso_weekdays,local_start,local_end,
      window_minutes,window_capacity,session_capacity,auto_confirm_limit,timezone,state,service_mode,fee_minor,automatic)
      VALUES(p_practice_id,next_version,family,local_day,days,start_time,end_time,duration,1,daily_limit,
        CASE WHEN prefs.auto_accept THEN prefs.auto_accept_limit ELSE 0 END,d.booking_timezone,'published',p_mode,fee,true) RETURNING id INTO rule_id;
    slot_count:=clinzo.materialize_schedule_rule(rule_id);
  END IF;
  INSERT INTO clinzo.audit_log(actor_id,actor_kind,action,resource_type,resource_id,facility_id,request_id,outcome,metadata)
    SELECT actor,'identity','schedule.recurring_published','doctor_facility',p.id,p.facility_id,gen_random_uuid(),'allowed',
      jsonb_build_object('service_mode',p_mode,'slot_count',slot_count,'horizon_days',30,'effective_from',local_day) FROM clinzo.doctor_facility p WHERE p.id=p_practice_id;
  RETURN jsonb_build_object('settings',public.get_my_schedule_preferences(p_practice_id),'slot_count',slot_count,'horizon_days',30);
END $$;


