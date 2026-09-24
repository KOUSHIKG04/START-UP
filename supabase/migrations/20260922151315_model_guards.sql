-- Custom PostgreSQL protections; keep alongside Drizzle model migrations.
SET LOCAL search_path = pg_catalog, clinzo, extensions, public;
REVOKE ALL ON SCHEMA clinzo FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA clinzo FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA clinzo FROM %I',r);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA clinzo FROM %I',r);
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION clinzo.touch_row() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$ BEGIN
  NEW.created_at := OLD.created_at;
  NEW.updated_at := clock_timestamp();
  NEW.row_version := OLD.row_version + 1;
  RETURN NEW;
END $$;

CREATE FUNCTION clinzo.reject_history_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$ BEGIN
  RAISE EXCEPTION 'History records cannot be updated, deleted or truncated; append a correction' USING ERRCODE='23514';
END $$;

CREATE FUNCTION clinzo.prevent_reparenting() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$ DECLARE c text; BEGIN
  FOREACH c IN ARRAY TG_ARGV LOOP
    IF to_jsonb(OLD)->c IS DISTINCT FROM to_jsonb(NEW)->c THEN
      RAISE EXCEPTION 'Relationship % on % is immutable',c,TG_TABLE_NAME USING ERRCODE='23514';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE FUNCTION clinzo.validate_timezone() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=to_jsonb(NEW)->>TG_ARGV[0]) THEN
    RAISE EXCEPTION 'Invalid IANA timezone' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
    WHERE table_schema='clinzo' AND column_name='row_version' LOOP
    EXECUTE format('CREATE TRIGGER touch_row BEFORE UPDATE ON clinzo.%I FOR EACH ROW EXECUTE FUNCTION clinzo.touch_row()',t.table_name);
  END LOOP;
  FOR t IN SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema='clinzo' AND column_name IN ('timezone','booking_timezone') LOOP
    EXECUTE format('CREATE TRIGGER check_timezone BEFORE INSERT OR UPDATE ON clinzo.%I FOR EACH ROW EXECUTE FUNCTION clinzo.validate_timezone(%L)',t.table_name,t.column_name);
  END LOOP;
  FOR t IN SELECT table_name FROM information_schema.tables x
    WHERE table_schema='clinzo' AND table_type='BASE TABLE'
      AND NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema=x.table_schema AND c.table_name=x.table_name AND c.column_name='row_version') LOOP
    EXECUTE format('CREATE TRIGGER protect_history BEFORE UPDATE OR DELETE ON clinzo.%I FOR EACH ROW EXECUTE FUNCTION clinzo.reject_history_change()',t.table_name);
    EXECUTE format('CREATE TRIGGER protect_history_truncate BEFORE TRUNCATE ON clinzo.%I FOR EACH STATEMENT EXECUTE FUNCTION clinzo.reject_history_change()',t.table_name);
  END LOOP;
END $$;

CREATE TRIGGER immutable_practice BEFORE UPDATE ON clinzo.doctor_facility FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('doctor_id','facility_id');
CREATE TRIGGER immutable_service BEFORE UPDATE ON clinzo.practice_service FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('doctor_facility_id');
CREATE TRIGGER immutable_window BEFORE UPDATE ON clinzo.appointment_window FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('session_id');
CREATE TRIGGER immutable_shift BEFORE UPDATE ON clinzo.driver_shift FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('driver_id','vehicle_id');
CREATE TRIGGER immutable_session BEFORE UPDATE ON clinzo.session FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('doctor_id','doctor_facility_id','booking_day_id');
CREATE TRIGGER immutable_queue BEFORE UPDATE ON clinzo.session_queue FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('session_id');
CREATE TRIGGER immutable_ticket BEFORE UPDATE ON clinzo.queue_entry FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('queue_id','appointment_id','ticket_number');
CREATE TRIGGER immutable_member BEFORE UPDATE ON clinzo.organization_member FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('identity_id','organization_id','facility_id');
CREATE TRIGGER immutable_facility_org BEFORE UPDATE ON clinzo.facility FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('organization_id');
CREATE TRIGGER immutable_driver_org BEFORE UPDATE ON clinzo.driver FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('organization_id');
CREATE TRIGGER immutable_vehicle_org BEFORE UPDATE ON clinzo.vehicle FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('organization_id');

ALTER TABLE clinzo.session ADD CONSTRAINT doctor_sessions_do_not_overlap
  EXCLUDE USING gist (doctor_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&)
  WHERE (state <> 'cancelled');
ALTER TABLE clinzo.appointment_window ADD CONSTRAINT session_windows_do_not_overlap
  EXCLUDE USING gist (session_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&);
ALTER TABLE clinzo.schedule_rule ADD CONSTRAINT recurrence_versions_do_not_overlap
  EXCLUDE USING gist (family_id WITH =, daterange(effective_from,effective_until,'[]') WITH &&)
  WHERE (state = 'published');

CREATE FUNCTION clinzo.validate_links() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog,clinzo AS $$
DECLARE valid boolean; BEGIN
  CASE TG_TABLE_NAME
  WHEN 'organization_member' THEN
    valid := NEW.facility_id IS NULL OR EXISTS (SELECT 1 FROM clinzo.facility WHERE id=NEW.facility_id AND organization_id=NEW.organization_id);
  WHEN 'member_doctor_scope' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.organization_member m JOIN clinzo.doctor_facility p ON p.id=NEW.doctor_facility_id JOIN clinzo.facility f ON f.id=p.facility_id
      WHERE m.id=NEW.member_id AND m.organization_id=f.organization_id AND (m.facility_id IS NULL OR m.facility_id=f.id));
  WHEN 'session_service' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.session s JOIN clinzo.practice_service p ON p.id=NEW.practice_service_id WHERE s.id=NEW.session_id AND s.doctor_facility_id=p.doctor_facility_id);
  WHEN 'appointment_window' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.session WHERE id=NEW.session_id AND starts_at<=NEW.starts_at AND ends_at>=NEW.ends_at);
  WHEN 'queue_entry' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.session_queue q JOIN clinzo.appointment a ON a.id=NEW.appointment_id WHERE q.id=NEW.queue_id AND q.session_id=a.session_id);
  WHEN 'consultation' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.appointment a JOIN clinzo.session s ON s.id=a.session_id WHERE a.id=NEW.appointment_id AND a.patient_id=NEW.patient_id AND s.doctor_id=NEW.doctor_id);
  WHEN 'schedule_exception' THEN
    valid := NEW.doctor_facility_id IS NULL OR EXISTS (SELECT 1 FROM clinzo.doctor_facility WHERE id=NEW.doctor_facility_id AND doctor_id=NEW.doctor_id);
  WHEN 'driver_shift' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.driver d JOIN clinzo.vehicle v ON v.id=NEW.vehicle_id WHERE d.id=NEW.driver_id AND d.organization_id=v.organization_id);
  WHEN 'ambulance_assignment' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.dispatch_offer o JOIN clinzo.dispatch_round r ON r.id=o.round_id WHERE o.id=NEW.offer_id AND o.shift_id=NEW.shift_id AND r.booking_id=NEW.booking_id);
  WHEN 'trip' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.ambulance_assignment WHERE id=NEW.assignment_id AND booking_id=NEW.booking_id);
  WHEN 'emergency_case' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.ambulance_booking WHERE id=NEW.booking_id AND booking_type='sos');
  WHEN 'payment' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.fare_quote WHERE id=NEW.fare_quote_id AND booking_id=NEW.booking_id AND currency=NEW.currency);
  WHEN 'notification_delivery' THEN
    valid := EXISTS (SELECT 1 FROM clinzo.notification_intent i JOIN clinzo.notification_endpoint e ON e.id=NEW.endpoint_id WHERE i.id=NEW.intent_id AND i.recipient_id=e.identity_id);
  ELSE RAISE EXCEPTION 'Unconfigured relationship validator';
  END CASE;
  IF NOT COALESCE(valid,false) THEN RAISE EXCEPTION 'Cross-record relationship mismatch on %',TG_TABLE_NAME USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE n text; BEGIN
  FOREACH n IN ARRAY ARRAY['organization_member','member_doctor_scope','session_service','appointment_window','queue_entry','consultation','schedule_exception','driver_shift','ambulance_assignment','trip','emergency_case','payment','notification_delivery'] LOOP
    EXECUTE format('CREATE TRIGGER validate_links BEFORE INSERT OR UPDATE ON clinzo.%I FOR EACH ROW EXECUTE FUNCTION clinzo.validate_links()',n);
  END LOOP;
END $$;

-- Operational permission, not permission to read all clinical records.
-- actor must be resolved from a verified Supabase Auth token by the backend.
CREATE FUNCTION clinzo.can_manage_practice(actor uuid, practice uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path=pg_catalog,clinzo AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinzo.doctor_facility p
    JOIN clinzo.doctor d ON d.id=p.doctor_id
    JOIN clinzo.facility f ON f.id=p.facility_id
    JOIN clinzo.organization o ON o.id=f.organization_id
    JOIN clinzo.identity i ON i.id=actor AND i.disabled_at IS NULL
    WHERE p.id=practice AND p.active AND f.active AND o.active AND (
      (d.identity_id=actor AND d.active AND d.credential_status='verified') OR EXISTS (
        SELECT 1 FROM clinzo.organization_member m WHERE m.identity_id=actor AND m.organization_id=f.organization_id AND m.active
        AND (m.facility_id IS NULL OR m.facility_id=f.id)
        AND (m.role IN ('owner','organization_admin','facility_admin') OR
          (m.role='receptionist' AND EXISTS (SELECT 1 FROM clinzo.member_doctor_scope s WHERE s.member_id=m.id AND s.doctor_facility_id=p.id AND s.active)))
      )
    )
  );
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA clinzo FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA clinzo REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE INDEX appointment_admitted_idx ON clinzo.appointment(session_id,window_id) WHERE confirmed_at IS NOT NULL AND capacity_released_at IS NULL;
CREATE INDEX appointment_pending_expiry_idx ON clinzo.appointment(request_expires_at) WHERE status='pending';
CREATE INDEX appointment_patient_history_idx ON clinzo.appointment(patient_id,created_at DESC,id);
CREATE INDEX queue_waiting_order_idx ON clinzo.queue_entry(queue_id,priority DESC,order_key,ticket_number) WHERE state='waiting';
CREATE INDEX dispatch_pending_expiry_idx ON clinzo.dispatch_offer(expires_at) WHERE status='pending';
CREATE INDEX reminder_due_idx ON clinzo.reminder_occurrence(due_at) WHERE status='pending';
CREATE INDEX outbox_due_idx ON clinzo.event_delivery(available_at,id) WHERE status IN ('pending','leased');
CREATE INDEX delivery_due_idx ON clinzo.notification_delivery(next_attempt_at,id) WHERE status IN ('pending','leased');
CREATE INDEX gps_history_idx ON clinzo.trip_location(trip_id,received_at,sequence);
CREATE INDEX audit_subject_idx ON clinzo.audit_log(resource_type,resource_id,created_at);
