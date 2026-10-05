-- Publish only the slots a doctor explicitly selected. Adjacent slots share a
-- session; gaps remain free for another consultation mode on the same day.
CREATE FUNCTION public.publish_selected_doctor_slots(
  p_practice_id uuid, p_mode text, p_slot_starts timestamptz[],
  p_slot_minutes integer, p_fee_minor bigint, p_currency text
) RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  ordered_starts timestamptz[];
  published_ids uuid[] := '{}'::uuid[];
  group_start timestamptz;
  previous_start timestamptz;
  slot_start timestamptz;
BEGIN
  IF p_slot_starts IS NULL OR cardinality(p_slot_starts) NOT BETWEEN 1 AND 100
    OR p_slot_minutes IS NULL OR p_slot_minutes NOT BETWEEN 5 AND 120
    OR array_position(p_slot_starts,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Choose between 1 and 100 valid slots' USING ERRCODE='22023';
  END IF;

  SELECT array_agg(candidate ORDER BY candidate) INTO ordered_starts
    FROM unnest(p_slot_starts) AS slots(candidate);
  group_start := ordered_starts[1];
  previous_start := group_start;

  FOR slot_index IN 2..cardinality(ordered_starts) LOOP
    slot_start := ordered_starts[slot_index];
    IF slot_start <= previous_start THEN
      RAISE EXCEPTION 'Selected slots must be unique' USING ERRCODE='22023';
    END IF;
    IF slot_start < previous_start + make_interval(mins => p_slot_minutes) THEN
      RAISE EXCEPTION 'Selected slots cannot overlap' USING ERRCODE='22023';
    END IF;
    IF slot_start > previous_start + make_interval(mins => p_slot_minutes) THEN
      published_ids := array_append(published_ids,
        public.publish_doctor_service_session(p_practice_id,p_mode,group_start,
          previous_start + make_interval(mins => p_slot_minutes),
          p_slot_minutes,p_fee_minor,p_currency));
      group_start := slot_start;
    END IF;
    previous_start := slot_start;
  END LOOP;

  published_ids := array_append(published_ids,
    public.publish_doctor_service_session(p_practice_id,p_mode,group_start,
      previous_start + make_interval(mins => p_slot_minutes),
      p_slot_minutes,p_fee_minor,p_currency));
  RETURN published_ids;
END $$;
REVOKE ALL ON FUNCTION public.publish_selected_doctor_slots(uuid,text,timestamptz[],integer,bigint,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_selected_doctor_slots(uuid,text,timestamptz[],integer,bigint,text)
  TO authenticated;
