-- Reviewed bootstrap; do not relocate an existing extension automatically.
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
    WHERE e.extname IN ('postgis','btree_gist') AND n.nspname <> 'extensions') THEN
    RAISE EXCEPTION 'Clinzo expects postgis and btree_gist in extensions; review existing extension placement first';
  END IF;
END $$;
CREATE SCHEMA "clinzo";
--> statement-breakpoint
CREATE TABLE "clinzo"."ambulance_booking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"public_code" text NOT NULL,
	"patient_id" uuid,
	"requested_by" uuid,
	"guest_session_id" uuid,
	"booking_type" text NOT NULL,
	"status" text NOT NULL,
	"priority" smallint NOT NULL,
	"pickup_position" extensions.geography(Point,4326),
	"pickup_address" text,
	"destination_facility_id" uuid,
	"destination_position" extensions.geography(Point,4326),
	"destination_address" text,
	"patient_name_snapshot" text,
	"contact_phone_snapshot" text,
	"cancel_reason" text,
	CONSTRAINT "ambulance_booking_ck_1" CHECK ((requested_by IS NULL) <> (guest_session_id IS NULL)),
	CONSTRAINT "ambulance_booking_ck_2" CHECK (booking_type='sos' OR (patient_id IS NOT NULL AND requested_by IS NOT NULL AND pickup_position IS NOT NULL AND destination_position IS NOT NULL)),
	CONSTRAINT "ambulance_booking_ck_3" CHECK (status='awaiting_location' OR pickup_position IS NOT NULL),
	CONSTRAINT "ambulance_booking_ck_4" CHECK ((destination_position IS NULL) = (destination_address IS NULL)),
	CONSTRAINT "ambulance_booking_ck_5" CHECK (status <> 'awaiting_location' OR booking_type='sos'),
	CONSTRAINT "ambulance_booking_ck_6" CHECK (row_version > 0),
	CONSTRAINT "ambulance_booking_ck_7" CHECK ("booking_type" IN ('normal', 'sos')),
	CONSTRAINT "ambulance_booking_ck_8" CHECK ("status" IN ('awaiting_location', 'searching', 'assigned', 'fulfilled', 'cancelled', 'unfulfilled'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_booking" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."booking_capability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"booking_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	CONSTRAINT "booking_capability_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."booking_capability" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."booking_destination_change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"booking_id" uuid NOT NULL,
	"facility_id" uuid,
	"position" extensions.geography(Point,4326) NOT NULL,
	"address" text NOT NULL,
	"changed_by" uuid NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinzo"."booking_destination_change" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."patient_ambulance_pin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"patient_id" uuid NOT NULL,
	"verifier" text NOT NULL,
	"pepper_key_id" text NOT NULL,
	"credential_version" integer NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_changed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "patient_ambulance_pin_ck_1" CHECK (credential_version > 0 AND failed_attempts >= 0),
	CONSTRAINT "patient_ambulance_pin_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_ambulance_pin" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."pin_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trip_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"credential_version" integer,
	"outcome" text NOT NULL,
	"request_id" uuid NOT NULL,
	CONSTRAINT "pin_attempt_ck_1" CHECK ("outcome" IN ('success', 'invalid', 'throttled', 'stale', 'forbidden'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."pin_attempt" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."capability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "capability_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."capability" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."driver" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"identity_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_code" text NOT NULL,
	"full_name" text NOT NULL,
	"license_number" text NOT NULL,
	"license_expires_on" date NOT NULL,
	"verification_status" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "driver_ck_1" CHECK (row_version > 0),
	CONSTRAINT "driver_ck_2" CHECK ("verification_status" IN ('pending', 'verified', 'suspended'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."driver" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."driver_shift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"driver_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"desired_availability" text NOT NULL,
	"service_area" extensions.geography(MultiPolygon,4326) NOT NULL,
	"crew_attestation" text NOT NULL,
	"crew_verified_until" timestamp with time zone NOT NULL,
	CONSTRAINT "driver_shift_ck_1" CHECK (ended_at IS NULL OR ended_at >= started_at),
	CONSTRAINT "driver_shift_ck_2" CHECK (crew_verified_until > started_at),
	CONSTRAINT "driver_shift_ck_3" CHECK (row_version > 0),
	CONSTRAINT "driver_shift_ck_4" CHECK ("desired_availability" IN ('online', 'offline'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."driver_shift" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."vehicle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"organization_id" uuid NOT NULL,
	"registration_number" text NOT NULL,
	"display_label" text NOT NULL,
	"inspection_expires_on" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "vehicle_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."vehicle" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."vehicle_capability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "vehicle_capability_ck_1" CHECK (expires_at > verified_at),
	CONSTRAINT "vehicle_capability_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."vehicle_capability" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"public_code" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"window_id" uuid NOT NULL,
	"practice_service_id" uuid NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"requested_by" uuid,
	"confirmed_at" timestamp with time zone,
	"capacity_released_at" timestamp with time zone,
	"request_expires_at" timestamp with time zone,
	"decision_by" uuid,
	"decision_reason" text,
	"replaces_appointment_id" uuid,
	"fee_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"doctor_name_snapshot" text NOT NULL,
	"facility_name_snapshot" text NOT NULL,
	"facility_address_snapshot" text NOT NULL,
	"service_name_snapshot" text NOT NULL,
	"doctor_registration_snapshot" text NOT NULL,
	CONSTRAINT "appointment_ck_1" CHECK (fee_minor >= 0),
	CONSTRAINT "appointment_ck_2" CHECK (status NOT IN ('confirmed','in_consultation','completed','no_show') OR confirmed_at IS NOT NULL),
	CONSTRAINT "appointment_ck_3" CHECK (capacity_released_at IS NULL OR (status='cancelled' AND confirmed_at IS NOT NULL)),
	CONSTRAINT "appointment_ck_4" CHECK (status <> 'pending' OR (confirmed_at IS NULL AND request_expires_at IS NOT NULL)),
	CONSTRAINT "appointment_ck_5" CHECK (row_version > 0),
	CONSTRAINT "appointment_ck_6" CHECK ("source" IN ('patient_online', 'reception_walk_in', 'staff_booking', 'offline_sync')),
	CONSTRAINT "appointment_ck_7" CHECK ("status" IN ('pending', 'confirmed', 'in_consultation', 'completed', 'rejected', 'cancelled', 'no_show')),
	CONSTRAINT "appointment_ck_8" CHECK (currency ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."appointment_checkin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"token_id" uuid,
	"checked_in_by" uuid NOT NULL,
	"method" text NOT NULL,
	"reason" text,
	CONSTRAINT "appointment_checkin_ck_1" CHECK ((method='qr' AND token_id IS NOT NULL) OR (method='manual' AND token_id IS NULL AND length(trim(reason)) > 0 AND reason IS NOT NULL)),
	CONSTRAINT "appointment_checkin_ck_2" CHECK ("method" IN ('qr', 'manual'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment_checkin" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."checkin_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"appointment_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "checkin_token_ck_1" CHECK (expires_at > created_at),
	CONSTRAINT "checkin_token_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."checkin_token" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."clinical_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"consultation_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" "bytea" NOT NULL,
	"scan_status" text NOT NULL,
	CONSTRAINT "clinical_attachment_ck_1" CHECK (size_bytes > 0),
	CONSTRAINT "clinical_attachment_ck_2" CHECK (row_version > 0),
	CONSTRAINT "clinical_attachment_ck_3" CHECK ("scan_status" IN ('pending', 'clean', 'quarantined'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_attachment" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."clinical_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"supersedes_id" uuid,
	CONSTRAINT "clinical_note_ck_1" CHECK ("kind" IN ('assessment', 'advice', 'addendum', 'correction'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_note" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."consultation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	CONSTRAINT "consultation_ck_1" CHECK (ended_at IS NULL OR ended_at >= started_at),
	CONSTRAINT "consultation_ck_2" CHECK (status NOT IN ('signed','amended') OR (ended_at IS NOT NULL AND signed_at IS NOT NULL)),
	CONSTRAINT "consultation_ck_3" CHECK (row_version > 0),
	CONSTRAINT "consultation_ck_4" CHECK ("status" IN ('active', 'signed', 'amended', 'void'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."consultation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."consultation_diagnosis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"coding_system" text,
	"code" text,
	"description" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"recorded_by" uuid NOT NULL,
	"supersedes_id" uuid,
	CONSTRAINT "consultation_diagnosis_ck_1" CHECK ((code IS NULL) = (coding_system IS NULL))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."consultation_diagnosis" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."followup_recommendation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"consultation_id" uuid NOT NULL,
	"recommended_by" uuid NOT NULL,
	"recommended_date" date NOT NULL,
	"timezone" text NOT NULL,
	"reason" text NOT NULL,
	"status" text NOT NULL,
	"booked_appointment_id" uuid,
	CONSTRAINT "followup_recommendation_ck_1" CHECK (row_version > 0),
	CONSTRAINT "followup_recommendation_ck_2" CHECK ("status" IN ('active', 'withdrawn', 'fulfilled'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."followup_recommendation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."vital_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"code" text NOT NULL,
	"value_numeric" numeric(12, 3) NOT NULL,
	"unit_code" text NOT NULL,
	"group_id" uuid,
	"measured_at" timestamp with time zone NOT NULL,
	"recorded_by" uuid NOT NULL,
	"supersedes_id" uuid,
	"void_reason" text
);
--> statement-breakpoint
ALTER TABLE "clinzo"."vital_observation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."doctor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"identity_id" uuid,
	"public_code" text NOT NULL,
	"full_name" text NOT NULL,
	"registration_authority" text NOT NULL,
	"registration_number" text NOT NULL,
	"practice_started_on" date NOT NULL,
	"credential_status" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"booking_timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	CONSTRAINT "doctor_ck_1" CHECK (row_version > 0),
	CONSTRAINT "doctor_ck_2" CHECK ("credential_status" IN ('pending', 'verified', 'suspended'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."doctor_facility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"doctor_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"room_label" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "doctor_facility_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_facility" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."doctor_language" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"doctor_id" uuid NOT NULL,
	"language_code" text NOT NULL,
	CONSTRAINT "doctor_language_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_language" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."doctor_specialty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"doctor_id" uuid NOT NULL,
	"specialty_id" uuid NOT NULL,
	CONSTRAINT "doctor_specialty_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_specialty" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."practice_service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"doctor_facility_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"fee_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"duration_minutes" smallint NOT NULL,
	"room_label" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "practice_service_ck_1" CHECK (fee_minor >= 0 AND duration_minutes > 0),
	CONSTRAINT "practice_service_ck_2" CHECK (row_version > 0),
	CONSTRAINT "practice_service_ck_3" CHECK (currency ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "clinzo"."practice_service" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."specialty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "specialty_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."specialty" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."symptom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "symptom_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."symptom" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."symptom_specialty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"symptom_id" uuid NOT NULL,
	"specialty_id" uuid NOT NULL,
	"rank" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "symptom_specialty_ck_1" CHECK (rank >= 0),
	CONSTRAINT "symptom_specialty_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."symptom_specialty" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."ambulance_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"booking_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"shift_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"accepted_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"driver_name_snapshot" text NOT NULL,
	"vehicle_registration_snapshot" text NOT NULL,
	"operator_name_snapshot" text NOT NULL,
	CONSTRAINT "ambulance_assignment_ck_1" CHECK (released_at IS NULL OR (released_at >= accepted_at AND release_reason IS NOT NULL)),
	CONSTRAINT "ambulance_assignment_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_assignment" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."dispatch_offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"round_id" uuid NOT NULL,
	"shift_id" uuid NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"reason" text,
	"distance_meters" integer NOT NULL,
	CONSTRAINT "dispatch_offer_ck_1" CHECK (distance_meters >= 0),
	CONSTRAINT "dispatch_offer_ck_2" CHECK (expires_at > created_at),
	CONSTRAINT "dispatch_offer_ck_3" CHECK (row_version > 0),
	CONSTRAINT "dispatch_offer_ck_4" CHECK ("status" IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."dispatch_offer" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."dispatch_round" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"booking_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"radius_meters" integer NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "dispatch_round_ck_1" CHECK (round_number > 0 AND radius_meters > 0),
	CONSTRAINT "dispatch_round_ck_2" CHECK (expires_at > created_at),
	CONSTRAINT "dispatch_round_ck_3" CHECK (row_version > 0),
	CONSTRAINT "dispatch_round_ck_4" CHECK ("status" IN ('open', 'exhausted', 'matched', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."dispatch_round" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."emergency_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"booking_id" uuid NOT NULL,
	"reported_summary" text NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "emergency_case_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."emergency_case" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."emergency_start_override" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"trip_id" uuid NOT NULL,
	"approved_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "emergency_start_override_ck_1" CHECK (expires_at > created_at),
	CONSTRAINT "emergency_start_override_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."emergency_start_override" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."guest_emergency_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_contact" text,
	"claimed_identity_id" uuid,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "guest_emergency_session_ck_1" CHECK (expires_at > created_at),
	CONSTRAINT "guest_emergency_session_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."guest_emergency_session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."triage_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"emergency_case_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"severity" text NOT NULL,
	"assessment" text NOT NULL,
	"suggested_facility_id" uuid
);
--> statement-breakpoint
ALTER TABLE "clinzo"."triage_observation" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."ambulance_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"trip_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"driver_rating" smallint NOT NULL,
	"service_rating" smallint NOT NULL,
	"comment" text,
	"moderation_state" text NOT NULL,
	CONSTRAINT "ambulance_review_ck_1" CHECK (driver_rating BETWEEN 1 AND 5 AND service_rating BETWEEN 1 AND 5),
	CONSTRAINT "ambulance_review_ck_2" CHECK (row_version > 0),
	CONSTRAINT "ambulance_review_ck_3" CHECK ("moderation_state" IN ('pending', 'published', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_review" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."doctor_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"appointment_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"submitted_by" uuid NOT NULL,
	"moderation_state" text NOT NULL,
	CONSTRAINT "doctor_review_ck_1" CHECK (rating BETWEEN 1 AND 5),
	CONSTRAINT "doctor_review_ck_2" CHECK (row_version > 0),
	CONSTRAINT "doctor_review_ck_3" CHECK ("moderation_state" IN ('pending', 'published', 'hidden'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_review" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."platform_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"identity_id" uuid,
	"app" text NOT NULL,
	"category" text NOT NULL,
	"body" text NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "platform_feedback_ck_1" CHECK (row_version > 0),
	CONSTRAINT "platform_feedback_ck_2" CHECK ("app" IN ('patient', 'doctor', 'admin', 'driver')),
	CONSTRAINT "platform_feedback_ck_3" CHECK ("status" IN ('new', 'triaged', 'closed'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."platform_feedback" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."identity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"display_name" text NOT NULL,
	"verified_phone" text,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "identity_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."identity" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."patient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"public_code" text NOT NULL,
	"full_name" text NOT NULL,
	"birth_date" date,
	"sex_at_birth" text,
	"contact_phone" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "patient_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."patient" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."patient_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"patient_id" uuid NOT NULL,
	"identity_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"verified_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "patient_access_ck_1" CHECK (row_version > 0),
	CONSTRAINT "patient_access_ck_2" CHECK ("relationship" IN ('self', 'guardian', 'delegate'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_access" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."patient_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"patient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"relationship" text NOT NULL,
	"sharing_consent_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "patient_contact_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_contact" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."domain_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"aggregate_version" bigint NOT NULL,
	"actor_id" uuid,
	"guest_session_id" uuid,
	"request_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "domain_event_ck_1" CHECK (aggregate_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."domain_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."event_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"event_id" uuid NOT NULL,
	"consumer" text NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"last_error_code" text,
	CONSTRAINT "event_delivery_ck_1" CHECK (attempts >= 0),
	CONSTRAINT "event_delivery_ck_2" CHECK (row_version > 0),
	CONSTRAINT "event_delivery_ck_3" CHECK ("status" IN ('pending', 'leased', 'done', 'dead'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."event_delivery" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."idempotency_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"principal_scope" text NOT NULL,
	"operation" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" "bytea" NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"result_code" text,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_record_ck_1" CHECK (expires_at > created_at),
	CONSTRAINT "idempotency_record_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."idempotency_record" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."notification_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"intent_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"provider_message_id" text,
	"last_error_code" text,
	CONSTRAINT "notification_delivery_ck_1" CHECK (attempts >= 0),
	CONSTRAINT "notification_delivery_ck_2" CHECK (row_version > 0),
	CONSTRAINT "notification_delivery_ck_3" CHECK ("status" IN ('pending', 'leased', 'sent', 'delivered', 'failed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_delivery" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."notification_endpoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"identity_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"address_ciphertext" "bytea" NOT NULL,
	"address_digest" "bytea" NOT NULL,
	"verified_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "notification_endpoint_ck_1" CHECK (row_version > 0),
	CONSTRAINT "notification_endpoint_ck_2" CHECK ("channel" IN ('push', 'sms', 'email', 'in_app'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_endpoint" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."notification_intent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"event_id" uuid,
	"occurrence_id" uuid,
	"template_key" text NOT NULL,
	"dedup_key" text NOT NULL,
	"safe_parameters" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_intent_ck_1" CHECK ((event_id IS NULL) <> (occurrence_id IS NULL))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_intent" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."notification_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"identity_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"category" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"quiet_start" time,
	"quiet_end" time,
	"timezone" text NOT NULL,
	CONSTRAINT "notification_preference_ck_1" CHECK ((quiet_start IS NULL) = (quiet_end IS NULL)),
	CONSTRAINT "notification_preference_ck_2" CHECK (row_version > 0),
	CONSTRAINT "notification_preference_ck_3" CHECK ("channel" IN ('push', 'sms', 'email', 'in_app')),
	CONSTRAINT "notification_preference_ck_4" CHECK ("category" IN ('appointments', 'medication', 'followup', 'trips', 'marketing'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_preference" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."reminder_occurrence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"schedule_id" uuid NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"local_occurrence_key" text NOT NULL,
	"status" text NOT NULL,
	"emitted_at" timestamp with time zone,
	CONSTRAINT "reminder_occurrence_ck_1" CHECK (row_version > 0),
	CONSTRAINT "reminder_occurrence_ck_2" CHECK ("status" IN ('pending', 'emitted', 'cancelled', 'expired'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."reminder_occurrence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."reminder_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"patient_id" uuid NOT NULL,
	"phase_id" uuid,
	"timing_id" uuid,
	"followup_id" uuid,
	"generation" integer NOT NULL,
	"timezone" text NOT NULL,
	"resolved_local_time" time,
	"next_due_at" timestamp with time zone,
	"status" text NOT NULL,
	CONSTRAINT "reminder_schedule_uq_1" UNIQUE NULLS NOT DISTINCT("phase_id","timing_id","followup_id","generation"),
	CONSTRAINT "reminder_schedule_ck_1" CHECK (generation > 0),
	CONSTRAINT "reminder_schedule_ck_2" CHECK ((phase_id IS NULL) <> (followup_id IS NULL)),
	CONSTRAINT "reminder_schedule_ck_3" CHECK (timing_id IS NULL OR phase_id IS NOT NULL),
	CONSTRAINT "reminder_schedule_ck_4" CHECK (row_version > 0),
	CONSTRAINT "reminder_schedule_ck_5" CHECK ("status" IN ('active', 'paused', 'superseded', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."reminder_schedule" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."facility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"address" text NOT NULL,
	"location" extensions.geography(Point,4326) NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "facility_ck_1" CHECK (row_version > 0),
	CONSTRAINT "facility_ck_2" CHECK ("kind" IN ('hospital', 'clinic'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."facility" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."member_doctor_scope" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"member_id" uuid NOT NULL,
	"doctor_facility_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "member_doctor_scope_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."member_doctor_scope" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"public_code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "organization_ck_1" CHECK (row_version > 0),
	CONSTRAINT "organization_ck_2" CHECK ("kind" IN ('care_provider', 'ambulance_operator', 'mixed'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."organization" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."organization_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"identity_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "organization_member_uq_1" UNIQUE NULLS NOT DISTINCT("identity_id","organization_id","facility_id","role"),
	CONSTRAINT "organization_member_ck_1" CHECK (role NOT IN ('receptionist','facility_admin') OR facility_id IS NOT NULL),
	CONSTRAINT "organization_member_ck_2" CHECK (row_version > 0),
	CONSTRAINT "organization_member_ck_3" CHECK ("role" IN ('owner', 'receptionist', 'facility_admin', 'dispatcher', 'organization_admin'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."organization_member" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."fare_quote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"booking_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" text NOT NULL,
	"currency" char(3) NOT NULL,
	"base_minor" bigint NOT NULL,
	"distance_minor" bigint NOT NULL,
	"waiting_minor" bigint NOT NULL,
	"other_minor" bigint NOT NULL,
	"discount_minor" bigint NOT NULL,
	"tax_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL,
	"pricing_policy_version" text NOT NULL,
	"distance_meters" bigint NOT NULL,
	"accepted_by" uuid,
	CONSTRAINT "fare_quote_ck_1" CHECK (version > 0 AND distance_meters >= 0),
	CONSTRAINT "fare_quote_ck_2" CHECK (base_minor >= 0 AND distance_minor >= 0 AND waiting_minor >= 0 AND other_minor >= 0 AND discount_minor >= 0 AND tax_minor >= 0 AND total_minor >= 0),
	CONSTRAINT "fare_quote_ck_3" CHECK (total_minor = base_minor + distance_minor + waiting_minor + other_minor - discount_minor + tax_minor),
	CONSTRAINT "fare_quote_ck_4" CHECK ("kind" IN ('estimate', 'final')),
	CONSTRAINT "fare_quote_ck_5" CHECK (currency ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "clinzo"."fare_quote" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"booking_id" uuid NOT NULL,
	"fare_quote_id" uuid NOT NULL,
	"method" text NOT NULL,
	"status" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"provider" text,
	"provider_payment_id" text,
	"reported_by" uuid,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "payment_ck_1" CHECK (amount_minor > 0),
	CONSTRAINT "payment_ck_2" CHECK ((provider IS NULL) = (provider_payment_id IS NULL)),
	CONSTRAINT "payment_ck_3" CHECK (method <> 'gateway' OR provider IS NOT NULL),
	CONSTRAINT "payment_ck_4" CHECK (status <> 'confirmed' OR confirmed_at IS NOT NULL),
	CONSTRAINT "payment_ck_5" CHECK (row_version > 0),
	CONSTRAINT "payment_ck_6" CHECK ("method" IN ('cash', 'external_direct', 'gateway')),
	CONSTRAINT "payment_ck_7" CHECK ("status" IN ('pending', 'reported', 'confirmed', 'failed', 'cancelled')),
	CONSTRAINT "payment_ck_8" CHECK (currency ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "clinzo"."payment" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."provider_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"payment_id" uuid,
	"event_type" text NOT NULL,
	"payload_digest" "bytea" NOT NULL,
	"safe_payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "provider_event_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."provider_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."refund" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"reason" text NOT NULL,
	"status" text NOT NULL,
	"provider" text,
	"provider_refund_id" text,
	"requested_by" uuid NOT NULL,
	CONSTRAINT "refund_ck_1" CHECK (amount_minor > 0),
	CONSTRAINT "refund_ck_2" CHECK ((provider IS NULL) = (provider_refund_id IS NULL)),
	CONSTRAINT "refund_ck_3" CHECK (row_version > 0),
	CONSTRAINT "refund_ck_4" CHECK ("status" IN ('pending', 'confirmed', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."refund" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."medication_phase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"prescription_item_id" uuid NOT NULL,
	"phase_number" smallint NOT NULL,
	"dose_quantity" numeric(10, 3) NOT NULL,
	"dose_unit" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"frequency_kind" text NOT NULL,
	"interval_minutes" integer,
	"anchor_at" timestamp with time zone,
	"timezone" text NOT NULL,
	"max_doses_per_day" smallint,
	CONSTRAINT "medication_phase_ck_1" CHECK (phase_number > 0 AND dose_quantity > 0),
	CONSTRAINT "medication_phase_ck_2" CHECK (ends_on IS NULL OR ends_on >= starts_on),
	CONSTRAINT "medication_phase_ck_3" CHECK (max_doses_per_day IS NULL OR max_doses_per_day > 0),
	CONSTRAINT "medication_phase_ck_4" CHECK ((frequency_kind='interval' AND interval_minutes IS NOT NULL AND interval_minutes>0 AND anchor_at IS NOT NULL) OR (frequency_kind <> 'interval' AND interval_minutes IS NULL AND anchor_at IS NULL)),
	CONSTRAINT "medication_phase_ck_5" CHECK ("frequency_kind" IN ('daily_times', 'interval', 'as_needed'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."medication_phase" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."medication_timing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"phase_id" uuid NOT NULL,
	"sequence" smallint NOT NULL,
	"local_time" time,
	"meal_anchor" text,
	"meal_relation" text NOT NULL,
	"offset_minutes" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "medication_timing_ck_1" CHECK (sequence > 0),
	CONSTRAINT "medication_timing_ck_2" CHECK ((local_time IS NULL) <> (meal_anchor IS NULL)),
	CONSTRAINT "medication_timing_ck_3" CHECK ("meal_anchor" IN ('breakfast', 'lunch', 'dinner', 'bedtime')),
	CONSTRAINT "medication_timing_ck_4" CHECK ("meal_relation" IN ('before', 'with', 'after', 'independent'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."medication_timing" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."patient_routine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"patient_id" uuid NOT NULL,
	"anchor" text NOT NULL,
	"local_time" time NOT NULL,
	"timezone" text NOT NULL,
	CONSTRAINT "patient_routine_ck_1" CHECK (row_version > 0),
	CONSTRAINT "patient_routine_ck_2" CHECK ("anchor" IN ('breakfast', 'lunch', 'dinner', 'bedtime'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_routine" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."prescription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"public_code" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinzo"."prescription" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."prescription_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revision_id" uuid NOT NULL,
	"line_number" smallint NOT NULL,
	"medicine_name" text NOT NULL,
	"medicine_code_system" text,
	"medicine_code" text,
	"strength" text NOT NULL,
	"form" text NOT NULL,
	"route" text NOT NULL,
	"instructions" text NOT NULL,
	CONSTRAINT "prescription_item_ck_1" CHECK (line_number > 0),
	CONSTRAINT "prescription_item_ck_2" CHECK ((medicine_code IS NULL) = (medicine_code_system IS NULL))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."prescription_item" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."prescription_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"supersedes_id" uuid,
	"signed_by" uuid NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	CONSTRAINT "prescription_revision_ck_1" CHECK (revision_number > 0),
	CONSTRAINT "prescription_revision_ck_2" CHECK (action='issue' OR (reason IS NOT NULL AND length(trim(reason)) > 0)),
	CONSTRAINT "prescription_revision_ck_3" CHECK ("action" IN ('issue', 'replace', 'discontinue'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."prescription_revision" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."queue_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"queue_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"ticket_number" integer NOT NULL,
	"state" text NOT NULL,
	"priority" smallint DEFAULT 0 NOT NULL,
	"order_key" bigint NOT NULL,
	"called_at" timestamp with time zone,
	"hold_reason" text,
	CONSTRAINT "queue_entry_ck_1" CHECK (ticket_number > 0),
	CONSTRAINT "queue_entry_ck_2" CHECK (state <> 'held' OR (hold_reason IS NOT NULL AND length(trim(hold_reason)) > 0)),
	CONSTRAINT "queue_entry_ck_3" CHECK (row_version > 0),
	CONSTRAINT "queue_entry_ck_4" CHECK ("state" IN ('awaiting_arrival', 'waiting', 'called', 'in_service', 'held', 'completed', 'cancelled', 'no_show'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."queue_entry" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."session_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"session_id" uuid NOT NULL,
	"next_ticket" integer DEFAULT 1 NOT NULL,
	"queue_version" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "session_queue_ck_1" CHECK (next_ticket > 0 AND queue_version >= 0),
	CONSTRAINT "session_queue_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."session_queue" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."appointment_window" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"session_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"hard_capacity" integer NOT NULL,
	"state" text NOT NULL,
	CONSTRAINT "appointment_window_ck_1" CHECK (starts_at < ends_at AND hard_capacity > 0),
	CONSTRAINT "appointment_window_ck_2" CHECK (row_version > 0),
	CONSTRAINT "appointment_window_ck_3" CHECK ("state" IN ('open', 'blocked'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment_window" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."doctor_booking_day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"doctor_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"timezone" text NOT NULL,
	"auto_confirm_limit" integer,
	CONSTRAINT "doctor_booking_day_ck_1" CHECK (auto_confirm_limit IS NULL OR auto_confirm_limit >= 0),
	CONSTRAINT "doctor_booking_day_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_booking_day" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."schedule_break" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"schedule_rule_id" uuid NOT NULL,
	"local_start" time NOT NULL,
	"local_end" time NOT NULL,
	CONSTRAINT "schedule_break_ck_1" CHECK (local_start < local_end),
	CONSTRAINT "schedule_break_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."schedule_break" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."schedule_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"doctor_id" uuid NOT NULL,
	"doctor_facility_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"state" text NOT NULL,
	CONSTRAINT "schedule_exception_ck_1" CHECK (starts_at < ends_at),
	CONSTRAINT "schedule_exception_ck_2" CHECK (row_version > 0),
	CONSTRAINT "schedule_exception_ck_3" CHECK ("state" IN ('active', 'revoked'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."schedule_exception" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."schedule_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"doctor_facility_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"family_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"iso_weekdays" smallint[] NOT NULL,
	"local_start" time NOT NULL,
	"local_end" time NOT NULL,
	"window_minutes" smallint NOT NULL,
	"window_capacity" integer NOT NULL,
	"session_capacity" integer NOT NULL,
	"auto_confirm_limit" integer,
	"timezone" text NOT NULL,
	"state" text NOT NULL,
	CONSTRAINT "schedule_rule_ck_1" CHECK (version > 0 AND window_minutes > 0 AND window_capacity > 0 AND session_capacity > 0),
	CONSTRAINT "schedule_rule_ck_2" CHECK (auto_confirm_limit IS NULL OR auto_confirm_limit >= 0),
	CONSTRAINT "schedule_rule_ck_3" CHECK (effective_until IS NULL OR effective_until >= effective_from),
	CONSTRAINT "schedule_rule_ck_4" CHECK (local_start < local_end),
	CONSTRAINT "schedule_rule_ck_5" CHECK (cardinality(iso_weekdays) BETWEEN 1 AND 7 AND iso_weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[]),
	CONSTRAINT "schedule_rule_ck_6" CHECK (row_version > 0),
	CONSTRAINT "schedule_rule_ck_7" CHECK ("state" IN ('draft', 'published', 'retired'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."schedule_rule" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"doctor_facility_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"booking_day_id" uuid NOT NULL,
	"schedule_rule_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"hard_capacity" integer NOT NULL,
	"auto_confirm_limit" integer,
	"room_label" text,
	"state" text NOT NULL,
	CONSTRAINT "session_ck_1" CHECK (starts_at < ends_at AND hard_capacity > 0),
	CONSTRAINT "session_ck_2" CHECK (auto_confirm_limit IS NULL OR auto_confirm_limit >= 0),
	CONSTRAINT "session_ck_3" CHECK (row_version > 0),
	CONSTRAINT "session_ck_4" CHECK ("state" IN ('published', 'open', 'closed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."session_service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"session_id" uuid NOT NULL,
	"practice_service_id" uuid NOT NULL,
	CONSTRAINT "session_service_ck_1" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."session_service" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"guest_session_id" uuid,
	"actor_kind" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"organization_id" uuid,
	"facility_id" uuid,
	"request_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"reason" text,
	"metadata" jsonb NOT NULL,
	CONSTRAINT "audit_log_ck_1" CHECK ((actor_kind='identity' AND actor_id IS NOT NULL AND guest_session_id IS NULL) OR (actor_kind='guest' AND guest_session_id IS NOT NULL AND actor_id IS NULL) OR (actor_kind='system' AND actor_id IS NULL AND guest_session_id IS NULL)),
	CONSTRAINT "audit_log_ck_2" CHECK ("actor_kind" IN ('identity', 'guest', 'system')),
	CONSTRAINT "audit_log_ck_3" CHECK ("outcome" IN ('allowed', 'denied', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."clinical_access_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"patient_id" uuid NOT NULL,
	"identity_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"granted_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "clinical_access_grant_ck_1" CHECK (expires_at > created_at),
	CONSTRAINT "clinical_access_grant_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_access_grant" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."driver_location_latest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"driver_id" uuid NOT NULL,
	"shift_id" uuid NOT NULL,
	"stream_epoch" uuid NOT NULL,
	"sequence" bigint NOT NULL,
	"position" extensions.geography(Point,4326) NOT NULL,
	"accuracy_meters" numeric(8, 2) NOT NULL,
	"device_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "driver_location_latest_ck_1" CHECK (sequence >= 0 AND accuracy_meters >= 0),
	CONSTRAINT "driver_location_latest_ck_2" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."driver_location_latest" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."tracking_share" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"trip_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"created_by" uuid,
	"guest_session_id" uuid,
	"contact_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "tracking_share_ck_1" CHECK ((created_by IS NULL) <> (guest_session_id IS NULL)),
	CONSTRAINT "tracking_share_ck_2" CHECK (expires_at > created_at),
	CONSTRAINT "tracking_share_ck_3" CHECK (row_version > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."tracking_share" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."trip_location" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trip_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"stream_epoch" uuid NOT NULL,
	"sequence" bigint NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"device_at" timestamp with time zone NOT NULL,
	"position" extensions.geography(Point,4326) NOT NULL,
	"accuracy_meters" numeric(8, 2) NOT NULL,
	"sample_reason" text NOT NULL,
	CONSTRAINT "trip_location_id_received_at_pk" PRIMARY KEY("id","received_at"),
	CONSTRAINT "trip_location_ck_1" CHECK (sequence >= 0 AND accuracy_meters >= 0),
	CONSTRAINT "trip_location_ck_2" CHECK ("sample_reason" IN ('periodic', 'pickup', 'start', 'destination', 'complete', 'deviation'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."trip_location" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "clinzo"."trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	"booking_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"arrived_pickup_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"arrived_destination_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"start_authorization" text,
	"pin_credential_version" integer,
	"distance_meters" bigint,
	CONSTRAINT "trip_ck_1" CHECK (status NOT IN ('in_progress','arrived_at_destination','completed') OR (started_at IS NOT NULL AND start_authorization IS NOT NULL)),
	CONSTRAINT "trip_ck_2" CHECK (status <> 'completed' OR (completed_at IS NOT NULL AND arrived_destination_at IS NOT NULL)),
	CONSTRAINT "trip_ck_3" CHECK (distance_meters IS NULL OR distance_meters >= 0),
	CONSTRAINT "trip_ck_4" CHECK (start_authorization IS DISTINCT FROM 'patient_pin' OR pin_credential_version IS NOT NULL),
	CONSTRAINT "trip_ck_5" CHECK (row_version > 0),
	CONSTRAINT "trip_ck_6" CHECK ("status" IN ('heading_to_pickup', 'arrived_at_pickup', 'in_progress', 'arrived_at_destination', 'completed', 'cancelled')),
	CONSTRAINT "trip_ck_7" CHECK ("start_authorization" IN ('patient_pin', 'emergency_override'))
);
--> statement-breakpoint
ALTER TABLE "clinzo"."trip" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "ambulance_booking_uq_1" ON "clinzo"."ambulance_booking" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "booking_capability_uq_1" ON "clinzo"."booking_capability" USING btree ("booking_id","capability_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_ambulance_pin_uq_1" ON "clinzo"."patient_ambulance_pin" USING btree ("patient_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "capability_uq_1" ON "clinzo"."capability" USING btree ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX "driver_uq_1" ON "clinzo"."driver" USING btree ("identity_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "driver_uq_2" ON "clinzo"."driver" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "driver_shift_uq_1" ON "clinzo"."driver_shift" USING btree ("id","driver_id","vehicle_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "driver_shift_active_uq_1" ON "clinzo"."driver_shift" USING btree ("driver_id") WHERE ended_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "driver_shift_active_uq_2" ON "clinzo"."driver_shift" USING btree ("vehicle_id") WHERE ended_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_uq_1" ON "clinzo"."vehicle" USING btree ("registration_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_capability_uq_1" ON "clinzo"."vehicle_capability" USING btree ("vehicle_id","capability_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_uq_1" ON "clinzo"."appointment" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_uq_2" ON "clinzo"."appointment" USING btree ("replaces_appointment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_active_uq_1" ON "clinzo"."appointment" USING btree ("patient_id","session_id") WHERE status IN ('pending','confirmed','in_consultation','completed','no_show');
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_checkin_uq_1" ON "clinzo"."appointment_checkin" USING btree ("appointment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_checkin_uq_2" ON "clinzo"."appointment_checkin" USING btree ("token_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "checkin_token_uq_1" ON "clinzo"."checkin_token" USING btree ("token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_attachment_uq_1" ON "clinzo"."clinical_attachment" USING btree ("storage_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_uq_1" ON "clinzo"."consultation" USING btree ("appointment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_active_uq_1" ON "clinzo"."consultation" USING btree ("doctor_id") WHERE status = 'active';
--> statement-breakpoint
CREATE UNIQUE INDEX "vital_observation_uq_1" ON "clinzo"."vital_observation" USING btree ("supersedes_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_uq_1" ON "clinzo"."doctor" USING btree ("identity_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_uq_2" ON "clinzo"."doctor" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_uq_3" ON "clinzo"."doctor" USING btree ("registration_authority","registration_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_facility_uq_1" ON "clinzo"."doctor_facility" USING btree ("doctor_id","facility_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_facility_uq_2" ON "clinzo"."doctor_facility" USING btree ("id","doctor_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_language_uq_1" ON "clinzo"."doctor_language" USING btree ("doctor_id","language_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_specialty_uq_1" ON "clinzo"."doctor_specialty" USING btree ("doctor_id","specialty_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "practice_service_uq_1" ON "clinzo"."practice_service" USING btree ("doctor_facility_id","code");
--> statement-breakpoint
CREATE UNIQUE INDEX "specialty_uq_1" ON "clinzo"."specialty" USING btree ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX "symptom_uq_1" ON "clinzo"."symptom" USING btree ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX "symptom_specialty_uq_1" ON "clinzo"."symptom_specialty" USING btree ("symptom_id","specialty_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ambulance_assignment_uq_1" ON "clinzo"."ambulance_assignment" USING btree ("offer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ambulance_assignment_active_uq_1" ON "clinzo"."ambulance_assignment" USING btree ("booking_id") WHERE released_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "ambulance_assignment_active_uq_2" ON "clinzo"."ambulance_assignment" USING btree ("driver_id") WHERE released_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "ambulance_assignment_active_uq_3" ON "clinzo"."ambulance_assignment" USING btree ("vehicle_id") WHERE released_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "dispatch_offer_uq_1" ON "clinzo"."dispatch_offer" USING btree ("round_id","shift_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "dispatch_round_uq_1" ON "clinzo"."dispatch_round" USING btree ("booking_id","round_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "dispatch_round_active_uq_1" ON "clinzo"."dispatch_round" USING btree ("booking_id") WHERE status = 'open';
--> statement-breakpoint
CREATE UNIQUE INDEX "emergency_case_uq_1" ON "clinzo"."emergency_case" USING btree ("booking_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "emergency_start_override_uq_1" ON "clinzo"."emergency_start_override" USING btree ("trip_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "guest_emergency_session_uq_1" ON "clinzo"."guest_emergency_session" USING btree ("token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "ambulance_review_uq_1" ON "clinzo"."ambulance_review" USING btree ("trip_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_review_uq_1" ON "clinzo"."doctor_review" USING btree ("appointment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "identity_uq_1" ON "clinzo"."identity" USING btree ("issuer","subject");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_uq_1" ON "clinzo"."patient" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_access_uq_1" ON "clinzo"."patient_access" USING btree ("patient_id","identity_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_access_active_uq_1" ON "clinzo"."patient_access" USING btree ("patient_id") WHERE relationship = 'self' AND revoked_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "domain_event_uq_1" ON "clinzo"."domain_event" USING btree ("aggregate_type","aggregate_id","aggregate_version");
--> statement-breakpoint
CREATE UNIQUE INDEX "event_delivery_uq_1" ON "clinzo"."event_delivery" USING btree ("event_id","consumer");
--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_record_uq_1" ON "clinzo"."idempotency_record" USING btree ("principal_scope","operation","key");
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_delivery_uq_1" ON "clinzo"."notification_delivery" USING btree ("intent_id","endpoint_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_endpoint_uq_1" ON "clinzo"."notification_endpoint" USING btree ("identity_id","channel","address_digest");
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_intent_uq_1" ON "clinzo"."notification_intent" USING btree ("dedup_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preference_uq_1" ON "clinzo"."notification_preference" USING btree ("identity_id","channel","category");
--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_occurrence_uq_1" ON "clinzo"."reminder_occurrence" USING btree ("schedule_id","local_occurrence_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "facility_uq_1" ON "clinzo"."facility" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "member_doctor_scope_uq_1" ON "clinzo"."member_doctor_scope" USING btree ("member_id","doctor_facility_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_uq_1" ON "clinzo"."organization" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "fare_quote_uq_1" ON "clinzo"."fare_quote" USING btree ("booking_id","version");
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_uq_1" ON "clinzo"."payment" USING btree ("provider","provider_payment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "provider_event_uq_1" ON "clinzo"."provider_event" USING btree ("provider","event_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "refund_uq_1" ON "clinzo"."refund" USING btree ("provider","provider_refund_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "medication_phase_uq_1" ON "clinzo"."medication_phase" USING btree ("prescription_item_id","phase_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "medication_timing_uq_1" ON "clinzo"."medication_timing" USING btree ("phase_id","sequence");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_routine_uq_1" ON "clinzo"."patient_routine" USING btree ("patient_id","anchor");
--> statement-breakpoint
CREATE UNIQUE INDEX "prescription_uq_1" ON "clinzo"."prescription" USING btree ("public_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "prescription_item_uq_1" ON "clinzo"."prescription_item" USING btree ("revision_id","line_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "prescription_revision_uq_1" ON "clinzo"."prescription_revision" USING btree ("prescription_id","revision_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "prescription_revision_uq_2" ON "clinzo"."prescription_revision" USING btree ("supersedes_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "queue_entry_uq_1" ON "clinzo"."queue_entry" USING btree ("appointment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "queue_entry_uq_2" ON "clinzo"."queue_entry" USING btree ("queue_id","ticket_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "queue_entry_active_uq_1" ON "clinzo"."queue_entry" USING btree ("queue_id") WHERE state IN ('called','in_service');
--> statement-breakpoint
CREATE UNIQUE INDEX "session_queue_uq_1" ON "clinzo"."session_queue" USING btree ("session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_window_uq_1" ON "clinzo"."appointment_window" USING btree ("session_id","starts_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_window_uq_2" ON "clinzo"."appointment_window" USING btree ("id","session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_booking_day_uq_1" ON "clinzo"."doctor_booking_day" USING btree ("doctor_id","local_date");
--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_booking_day_uq_2" ON "clinzo"."doctor_booking_day" USING btree ("id","doctor_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_rule_uq_1" ON "clinzo"."schedule_rule" USING btree ("family_id","version");
--> statement-breakpoint
CREATE UNIQUE INDEX "session_uq_1" ON "clinzo"."session" USING btree ("doctor_facility_id","starts_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "session_service_uq_1" ON "clinzo"."session_service" USING btree ("session_id","practice_service_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "driver_location_latest_uq_1" ON "clinzo"."driver_location_latest" USING btree ("driver_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_share_uq_1" ON "clinzo"."tracking_share" USING btree ("token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "trip_location_uq_1" ON "clinzo"."trip_location" USING btree ("trip_id","stream_epoch","sequence","received_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "trip_uq_1" ON "clinzo"."trip" USING btree ("booking_id");
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_booking" ADD CONSTRAINT "ambulance_booking_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_booking" ADD CONSTRAINT "ambulance_booking_requested_by_identity_id_fk" FOREIGN KEY ("requested_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_booking" ADD CONSTRAINT "ambulance_booking_guest_session_id_guest_emergency_session_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "clinzo"."guest_emergency_session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_booking" ADD CONSTRAINT "ambulance_booking_destination_facility_id_facility_id_fk" FOREIGN KEY ("destination_facility_id") REFERENCES "clinzo"."facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."booking_capability" ADD CONSTRAINT "booking_capability_booking_id_ambulance_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "clinzo"."ambulance_booking"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."booking_capability" ADD CONSTRAINT "booking_capability_capability_id_capability_id_fk" FOREIGN KEY ("capability_id") REFERENCES "clinzo"."capability"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."booking_destination_change" ADD CONSTRAINT "booking_destination_change_booking_id_ambulance_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "clinzo"."ambulance_booking"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."booking_destination_change" ADD CONSTRAINT "booking_destination_change_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "clinzo"."facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."booking_destination_change" ADD CONSTRAINT "booking_destination_change_changed_by_identity_id_fk" FOREIGN KEY ("changed_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_ambulance_pin" ADD CONSTRAINT "patient_ambulance_pin_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."pin_attempt" ADD CONSTRAINT "pin_attempt_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "clinzo"."trip"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."pin_attempt" ADD CONSTRAINT "pin_attempt_driver_id_driver_id_fk" FOREIGN KEY ("driver_id") REFERENCES "clinzo"."driver"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."driver" ADD CONSTRAINT "driver_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."driver" ADD CONSTRAINT "driver_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "clinzo"."organization"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."driver_shift" ADD CONSTRAINT "driver_shift_driver_id_driver_id_fk" FOREIGN KEY ("driver_id") REFERENCES "clinzo"."driver"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."driver_shift" ADD CONSTRAINT "driver_shift_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "clinzo"."vehicle"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."vehicle" ADD CONSTRAINT "vehicle_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "clinzo"."organization"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."vehicle_capability" ADD CONSTRAINT "vehicle_capability_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "clinzo"."vehicle"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."vehicle_capability" ADD CONSTRAINT "vehicle_capability_capability_id_capability_id_fk" FOREIGN KEY ("capability_id") REFERENCES "clinzo"."capability"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "clinzo"."session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_window_id_appointment_window_id_fk" FOREIGN KEY ("window_id") REFERENCES "clinzo"."appointment_window"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_practice_service_id_practice_service_id_fk" FOREIGN KEY ("practice_service_id") REFERENCES "clinzo"."practice_service"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_requested_by_identity_id_fk" FOREIGN KEY ("requested_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_decision_by_identity_id_fk" FOREIGN KEY ("decision_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_replaces_appointment_id_appointment_id_fk" FOREIGN KEY ("replaces_appointment_id") REFERENCES "clinzo"."appointment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_composite_fk_1" FOREIGN KEY ("window_id","session_id") REFERENCES "clinzo"."appointment_window"("id","session_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_composite_fk_2" FOREIGN KEY ("session_id","practice_service_id") REFERENCES "clinzo"."session_service"("session_id","practice_service_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment_checkin" ADD CONSTRAINT "appointment_checkin_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "clinzo"."appointment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment_checkin" ADD CONSTRAINT "appointment_checkin_token_id_checkin_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "clinzo"."checkin_token"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment_checkin" ADD CONSTRAINT "appointment_checkin_checked_in_by_identity_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."checkin_token" ADD CONSTRAINT "checkin_token_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "clinzo"."appointment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_attachment" ADD CONSTRAINT "clinical_attachment_consultation_id_consultation_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "clinzo"."consultation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_attachment" ADD CONSTRAINT "clinical_attachment_uploaded_by_identity_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_note" ADD CONSTRAINT "clinical_note_consultation_id_consultation_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "clinzo"."consultation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_note" ADD CONSTRAINT "clinical_note_author_id_identity_id_fk" FOREIGN KEY ("author_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_note" ADD CONSTRAINT "clinical_note_supersedes_id_clinical_note_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "clinzo"."clinical_note"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."consultation" ADD CONSTRAINT "consultation_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "clinzo"."appointment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."consultation" ADD CONSTRAINT "consultation_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."consultation" ADD CONSTRAINT "consultation_doctor_id_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "clinzo"."doctor"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."consultation_diagnosis" ADD CONSTRAINT "consultation_diagnosis_consultation_id_consultation_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "clinzo"."consultation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."consultation_diagnosis" ADD CONSTRAINT "consultation_diagnosis_recorded_by_identity_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."consultation_diagnosis" ADD CONSTRAINT "consultation_diagnosis_supersedes_id_consultation_diagnosis_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "clinzo"."consultation_diagnosis"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."followup_recommendation" ADD CONSTRAINT "followup_recommendation_consultation_id_consultation_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "clinzo"."consultation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."followup_recommendation" ADD CONSTRAINT "followup_recommendation_recommended_by_identity_id_fk" FOREIGN KEY ("recommended_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."followup_recommendation" ADD CONSTRAINT "followup_recommendation_booked_appointment_id_appointment_id_fk" FOREIGN KEY ("booked_appointment_id") REFERENCES "clinzo"."appointment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."vital_observation" ADD CONSTRAINT "vital_observation_consultation_id_consultation_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "clinzo"."consultation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."vital_observation" ADD CONSTRAINT "vital_observation_recorded_by_identity_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."vital_observation" ADD CONSTRAINT "vital_observation_supersedes_id_vital_observation_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "clinzo"."vital_observation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor" ADD CONSTRAINT "doctor_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_facility" ADD CONSTRAINT "doctor_facility_doctor_id_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "clinzo"."doctor"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_facility" ADD CONSTRAINT "doctor_facility_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "clinzo"."facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_language" ADD CONSTRAINT "doctor_language_doctor_id_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "clinzo"."doctor"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_specialty" ADD CONSTRAINT "doctor_specialty_doctor_id_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "clinzo"."doctor"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_specialty" ADD CONSTRAINT "doctor_specialty_specialty_id_specialty_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "clinzo"."specialty"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."practice_service" ADD CONSTRAINT "practice_service_doctor_facility_id_doctor_facility_id_fk" FOREIGN KEY ("doctor_facility_id") REFERENCES "clinzo"."doctor_facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."symptom_specialty" ADD CONSTRAINT "symptom_specialty_symptom_id_symptom_id_fk" FOREIGN KEY ("symptom_id") REFERENCES "clinzo"."symptom"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."symptom_specialty" ADD CONSTRAINT "symptom_specialty_specialty_id_specialty_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "clinzo"."specialty"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_assignment" ADD CONSTRAINT "ambulance_assignment_booking_id_ambulance_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "clinzo"."ambulance_booking"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_assignment" ADD CONSTRAINT "ambulance_assignment_offer_id_dispatch_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "clinzo"."dispatch_offer"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_assignment" ADD CONSTRAINT "ambulance_assignment_shift_id_driver_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "clinzo"."driver_shift"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_assignment" ADD CONSTRAINT "ambulance_assignment_driver_id_driver_id_fk" FOREIGN KEY ("driver_id") REFERENCES "clinzo"."driver"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_assignment" ADD CONSTRAINT "ambulance_assignment_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "clinzo"."vehicle"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_assignment" ADD CONSTRAINT "ambulance_assignment_composite_fk_1" FOREIGN KEY ("shift_id","driver_id","vehicle_id") REFERENCES "clinzo"."driver_shift"("id","driver_id","vehicle_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."dispatch_offer" ADD CONSTRAINT "dispatch_offer_round_id_dispatch_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "clinzo"."dispatch_round"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."dispatch_offer" ADD CONSTRAINT "dispatch_offer_shift_id_driver_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "clinzo"."driver_shift"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."dispatch_round" ADD CONSTRAINT "dispatch_round_booking_id_ambulance_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "clinzo"."ambulance_booking"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."emergency_case" ADD CONSTRAINT "emergency_case_booking_id_ambulance_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "clinzo"."ambulance_booking"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."emergency_start_override" ADD CONSTRAINT "emergency_start_override_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "clinzo"."trip"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."emergency_start_override" ADD CONSTRAINT "emergency_start_override_approved_by_identity_id_fk" FOREIGN KEY ("approved_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."guest_emergency_session" ADD CONSTRAINT "guest_emergency_session_claimed_identity_id_identity_id_fk" FOREIGN KEY ("claimed_identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."triage_observation" ADD CONSTRAINT "triage_observation_emergency_case_id_emergency_case_id_fk" FOREIGN KEY ("emergency_case_id") REFERENCES "clinzo"."emergency_case"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."triage_observation" ADD CONSTRAINT "triage_observation_recorded_by_identity_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."triage_observation" ADD CONSTRAINT "triage_observation_suggested_facility_id_facility_id_fk" FOREIGN KEY ("suggested_facility_id") REFERENCES "clinzo"."facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_review" ADD CONSTRAINT "ambulance_review_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "clinzo"."trip"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."ambulance_review" ADD CONSTRAINT "ambulance_review_submitted_by_identity_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_review" ADD CONSTRAINT "doctor_review_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "clinzo"."appointment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_review" ADD CONSTRAINT "doctor_review_submitted_by_identity_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."platform_feedback" ADD CONSTRAINT "platform_feedback_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_access" ADD CONSTRAINT "patient_access_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_access" ADD CONSTRAINT "patient_access_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_contact" ADD CONSTRAINT "patient_contact_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."domain_event" ADD CONSTRAINT "domain_event_actor_id_identity_id_fk" FOREIGN KEY ("actor_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."domain_event" ADD CONSTRAINT "domain_event_guest_session_id_guest_emergency_session_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "clinzo"."guest_emergency_session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."event_delivery" ADD CONSTRAINT "event_delivery_event_id_domain_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "clinzo"."domain_event"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_delivery" ADD CONSTRAINT "notification_delivery_intent_id_notification_intent_id_fk" FOREIGN KEY ("intent_id") REFERENCES "clinzo"."notification_intent"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_delivery" ADD CONSTRAINT "notification_delivery_endpoint_id_notification_endpoint_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "clinzo"."notification_endpoint"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_endpoint" ADD CONSTRAINT "notification_endpoint_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_intent" ADD CONSTRAINT "notification_intent_recipient_id_identity_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_intent" ADD CONSTRAINT "notification_intent_event_id_domain_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "clinzo"."domain_event"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_intent" ADD CONSTRAINT "notification_intent_occurrence_id_reminder_occurrence_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "clinzo"."reminder_occurrence"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."notification_preference" ADD CONSTRAINT "notification_preference_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."reminder_occurrence" ADD CONSTRAINT "reminder_occurrence_schedule_id_reminder_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "clinzo"."reminder_schedule"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."reminder_schedule" ADD CONSTRAINT "reminder_schedule_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."reminder_schedule" ADD CONSTRAINT "reminder_schedule_phase_id_medication_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "clinzo"."medication_phase"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."reminder_schedule" ADD CONSTRAINT "reminder_schedule_timing_id_medication_timing_id_fk" FOREIGN KEY ("timing_id") REFERENCES "clinzo"."medication_timing"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."reminder_schedule" ADD CONSTRAINT "reminder_schedule_followup_id_followup_recommendation_id_fk" FOREIGN KEY ("followup_id") REFERENCES "clinzo"."followup_recommendation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."facility" ADD CONSTRAINT "facility_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "clinzo"."organization"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."member_doctor_scope" ADD CONSTRAINT "member_doctor_scope_member_id_organization_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "clinzo"."organization_member"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."member_doctor_scope" ADD CONSTRAINT "member_doctor_scope_doctor_facility_id_doctor_facility_id_fk" FOREIGN KEY ("doctor_facility_id") REFERENCES "clinzo"."doctor_facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."organization_member" ADD CONSTRAINT "organization_member_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "clinzo"."organization"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."organization_member" ADD CONSTRAINT "organization_member_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "clinzo"."facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."fare_quote" ADD CONSTRAINT "fare_quote_booking_id_ambulance_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "clinzo"."ambulance_booking"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."fare_quote" ADD CONSTRAINT "fare_quote_accepted_by_identity_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."payment" ADD CONSTRAINT "payment_booking_id_ambulance_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "clinzo"."ambulance_booking"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."payment" ADD CONSTRAINT "payment_fare_quote_id_fare_quote_id_fk" FOREIGN KEY ("fare_quote_id") REFERENCES "clinzo"."fare_quote"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."payment" ADD CONSTRAINT "payment_reported_by_identity_id_fk" FOREIGN KEY ("reported_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."payment" ADD CONSTRAINT "payment_confirmed_by_identity_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."provider_event" ADD CONSTRAINT "provider_event_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "clinzo"."payment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."refund" ADD CONSTRAINT "refund_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "clinzo"."payment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."refund" ADD CONSTRAINT "refund_requested_by_identity_id_fk" FOREIGN KEY ("requested_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."medication_phase" ADD CONSTRAINT "medication_phase_prescription_item_id_prescription_item_id_fk" FOREIGN KEY ("prescription_item_id") REFERENCES "clinzo"."prescription_item"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."medication_timing" ADD CONSTRAINT "medication_timing_phase_id_medication_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "clinzo"."medication_phase"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."patient_routine" ADD CONSTRAINT "patient_routine_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."prescription" ADD CONSTRAINT "prescription_consultation_id_consultation_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "clinzo"."consultation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."prescription_item" ADD CONSTRAINT "prescription_item_revision_id_prescription_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "clinzo"."prescription_revision"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."prescription_revision" ADD CONSTRAINT "prescription_revision_prescription_id_prescription_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "clinzo"."prescription"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."prescription_revision" ADD CONSTRAINT "prescription_revision_supersedes_id_prescription_revision_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "clinzo"."prescription_revision"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."prescription_revision" ADD CONSTRAINT "prescription_revision_signed_by_identity_id_fk" FOREIGN KEY ("signed_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."queue_entry" ADD CONSTRAINT "queue_entry_queue_id_session_queue_id_fk" FOREIGN KEY ("queue_id") REFERENCES "clinzo"."session_queue"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."queue_entry" ADD CONSTRAINT "queue_entry_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "clinzo"."appointment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session_queue" ADD CONSTRAINT "session_queue_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "clinzo"."session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."appointment_window" ADD CONSTRAINT "appointment_window_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "clinzo"."session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."doctor_booking_day" ADD CONSTRAINT "doctor_booking_day_doctor_id_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "clinzo"."doctor"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."schedule_break" ADD CONSTRAINT "schedule_break_schedule_rule_id_schedule_rule_id_fk" FOREIGN KEY ("schedule_rule_id") REFERENCES "clinzo"."schedule_rule"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."schedule_exception" ADD CONSTRAINT "schedule_exception_doctor_id_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "clinzo"."doctor"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."schedule_exception" ADD CONSTRAINT "schedule_exception_doctor_facility_id_doctor_facility_id_fk" FOREIGN KEY ("doctor_facility_id") REFERENCES "clinzo"."doctor_facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."schedule_rule" ADD CONSTRAINT "schedule_rule_doctor_facility_id_doctor_facility_id_fk" FOREIGN KEY ("doctor_facility_id") REFERENCES "clinzo"."doctor_facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session" ADD CONSTRAINT "session_doctor_facility_id_doctor_facility_id_fk" FOREIGN KEY ("doctor_facility_id") REFERENCES "clinzo"."doctor_facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session" ADD CONSTRAINT "session_doctor_id_doctor_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "clinzo"."doctor"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session" ADD CONSTRAINT "session_booking_day_id_doctor_booking_day_id_fk" FOREIGN KEY ("booking_day_id") REFERENCES "clinzo"."doctor_booking_day"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session" ADD CONSTRAINT "session_schedule_rule_id_schedule_rule_id_fk" FOREIGN KEY ("schedule_rule_id") REFERENCES "clinzo"."schedule_rule"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session" ADD CONSTRAINT "session_composite_fk_1" FOREIGN KEY ("doctor_facility_id","doctor_id") REFERENCES "clinzo"."doctor_facility"("id","doctor_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session" ADD CONSTRAINT "session_composite_fk_2" FOREIGN KEY ("booking_day_id","doctor_id") REFERENCES "clinzo"."doctor_booking_day"("id","doctor_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session_service" ADD CONSTRAINT "session_service_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "clinzo"."session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."session_service" ADD CONSTRAINT "session_service_practice_service_id_practice_service_id_fk" FOREIGN KEY ("practice_service_id") REFERENCES "clinzo"."practice_service"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."audit_log" ADD CONSTRAINT "audit_log_actor_id_identity_id_fk" FOREIGN KEY ("actor_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."audit_log" ADD CONSTRAINT "audit_log_guest_session_id_guest_emergency_session_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "clinzo"."guest_emergency_session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "clinzo"."organization"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."audit_log" ADD CONSTRAINT "audit_log_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "clinzo"."facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_access_grant" ADD CONSTRAINT "clinical_access_grant_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "clinzo"."patient"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_access_grant" ADD CONSTRAINT "clinical_access_grant_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_access_grant" ADD CONSTRAINT "clinical_access_grant_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "clinzo"."facility"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."clinical_access_grant" ADD CONSTRAINT "clinical_access_grant_granted_by_identity_id_fk" FOREIGN KEY ("granted_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."driver_location_latest" ADD CONSTRAINT "driver_location_latest_driver_id_driver_id_fk" FOREIGN KEY ("driver_id") REFERENCES "clinzo"."driver"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."driver_location_latest" ADD CONSTRAINT "driver_location_latest_shift_id_driver_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "clinzo"."driver_shift"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."tracking_share" ADD CONSTRAINT "tracking_share_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "clinzo"."trip"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."tracking_share" ADD CONSTRAINT "tracking_share_created_by_identity_id_fk" FOREIGN KEY ("created_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."tracking_share" ADD CONSTRAINT "tracking_share_guest_session_id_guest_emergency_session_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "clinzo"."guest_emergency_session"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."tracking_share" ADD CONSTRAINT "tracking_share_contact_id_patient_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "clinzo"."patient_contact"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."trip_location" ADD CONSTRAINT "trip_location_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "clinzo"."trip"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."trip_location" ADD CONSTRAINT "trip_location_assignment_id_ambulance_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "clinzo"."ambulance_assignment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."trip" ADD CONSTRAINT "trip_booking_id_ambulance_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "clinzo"."ambulance_booking"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clinzo"."trip" ADD CONSTRAINT "trip_assignment_id_ambulance_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "clinzo"."ambulance_assignment"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ambulance_booking_patient_id_idx" ON "clinzo"."ambulance_booking" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "ambulance_booking_requested_by_idx" ON "clinzo"."ambulance_booking" USING btree ("requested_by");
--> statement-breakpoint
CREATE INDEX "ambulance_booking_guest_session_id_idx" ON "clinzo"."ambulance_booking" USING btree ("guest_session_id");
--> statement-breakpoint
CREATE INDEX "ambulance_booking_pickup_position_geo_idx" ON "clinzo"."ambulance_booking" USING gist ("pickup_position");
--> statement-breakpoint
CREATE INDEX "ambulance_booking_destination_facility_id_idx" ON "clinzo"."ambulance_booking" USING btree ("destination_facility_id");
--> statement-breakpoint
CREATE INDEX "ambulance_booking_destination_position_geo_idx" ON "clinzo"."ambulance_booking" USING gist ("destination_position");
--> statement-breakpoint
CREATE INDEX "booking_capability_booking_id_idx" ON "clinzo"."booking_capability" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "booking_capability_capability_id_idx" ON "clinzo"."booking_capability" USING btree ("capability_id");
--> statement-breakpoint
CREATE INDEX "booking_destination_change_booking_id_idx" ON "clinzo"."booking_destination_change" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "booking_destination_change_facility_id_idx" ON "clinzo"."booking_destination_change" USING btree ("facility_id");
--> statement-breakpoint
CREATE INDEX "booking_destination_change_position_geo_idx" ON "clinzo"."booking_destination_change" USING gist ("position");
--> statement-breakpoint
CREATE INDEX "booking_destination_change_changed_by_idx" ON "clinzo"."booking_destination_change" USING btree ("changed_by");
--> statement-breakpoint
CREATE INDEX "patient_ambulance_pin_patient_id_idx" ON "clinzo"."patient_ambulance_pin" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "pin_attempt_trip_id_idx" ON "clinzo"."pin_attempt" USING btree ("trip_id");
--> statement-breakpoint
CREATE INDEX "pin_attempt_driver_id_idx" ON "clinzo"."pin_attempt" USING btree ("driver_id");
--> statement-breakpoint
CREATE INDEX "driver_identity_id_idx" ON "clinzo"."driver" USING btree ("identity_id");
--> statement-breakpoint
CREATE INDEX "driver_organization_id_idx" ON "clinzo"."driver" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "driver_shift_driver_id_idx" ON "clinzo"."driver_shift" USING btree ("driver_id");
--> statement-breakpoint
CREATE INDEX "driver_shift_vehicle_id_idx" ON "clinzo"."driver_shift" USING btree ("vehicle_id");
--> statement-breakpoint
CREATE INDEX "driver_shift_service_area_geo_idx" ON "clinzo"."driver_shift" USING gist ("service_area");
--> statement-breakpoint
CREATE INDEX "vehicle_organization_id_idx" ON "clinzo"."vehicle" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "vehicle_capability_vehicle_id_idx" ON "clinzo"."vehicle_capability" USING btree ("vehicle_id");
--> statement-breakpoint
CREATE INDEX "vehicle_capability_capability_id_idx" ON "clinzo"."vehicle_capability" USING btree ("capability_id");
--> statement-breakpoint
CREATE INDEX "appointment_patient_id_idx" ON "clinzo"."appointment" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "appointment_session_id_idx" ON "clinzo"."appointment" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "appointment_window_id_idx" ON "clinzo"."appointment" USING btree ("window_id");
--> statement-breakpoint
CREATE INDEX "appointment_practice_service_id_idx" ON "clinzo"."appointment" USING btree ("practice_service_id");
--> statement-breakpoint
CREATE INDEX "appointment_requested_by_idx" ON "clinzo"."appointment" USING btree ("requested_by");
--> statement-breakpoint
CREATE INDEX "appointment_decision_by_idx" ON "clinzo"."appointment" USING btree ("decision_by");
--> statement-breakpoint
CREATE INDEX "appointment_replaces_appointment_id_idx" ON "clinzo"."appointment" USING btree ("replaces_appointment_id");
--> statement-breakpoint
CREATE INDEX "appointment_checkin_appointment_id_idx" ON "clinzo"."appointment_checkin" USING btree ("appointment_id");
--> statement-breakpoint
CREATE INDEX "appointment_checkin_token_id_idx" ON "clinzo"."appointment_checkin" USING btree ("token_id");
--> statement-breakpoint
CREATE INDEX "appointment_checkin_checked_in_by_idx" ON "clinzo"."appointment_checkin" USING btree ("checked_in_by");
--> statement-breakpoint
CREATE INDEX "checkin_token_appointment_id_idx" ON "clinzo"."checkin_token" USING btree ("appointment_id");
--> statement-breakpoint
CREATE INDEX "clinical_attachment_consultation_id_idx" ON "clinzo"."clinical_attachment" USING btree ("consultation_id");
--> statement-breakpoint
CREATE INDEX "clinical_attachment_uploaded_by_idx" ON "clinzo"."clinical_attachment" USING btree ("uploaded_by");
--> statement-breakpoint
CREATE INDEX "clinical_note_consultation_id_idx" ON "clinzo"."clinical_note" USING btree ("consultation_id");
--> statement-breakpoint
CREATE INDEX "clinical_note_author_id_idx" ON "clinzo"."clinical_note" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX "clinical_note_supersedes_id_idx" ON "clinzo"."clinical_note" USING btree ("supersedes_id");
--> statement-breakpoint
CREATE INDEX "consultation_appointment_id_idx" ON "clinzo"."consultation" USING btree ("appointment_id");
--> statement-breakpoint
CREATE INDEX "consultation_patient_id_idx" ON "clinzo"."consultation" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "consultation_doctor_id_idx" ON "clinzo"."consultation" USING btree ("doctor_id");
--> statement-breakpoint
CREATE INDEX "consultation_diagnosis_consultation_id_idx" ON "clinzo"."consultation_diagnosis" USING btree ("consultation_id");
--> statement-breakpoint
CREATE INDEX "consultation_diagnosis_recorded_by_idx" ON "clinzo"."consultation_diagnosis" USING btree ("recorded_by");
--> statement-breakpoint
CREATE INDEX "consultation_diagnosis_supersedes_id_idx" ON "clinzo"."consultation_diagnosis" USING btree ("supersedes_id");
--> statement-breakpoint
CREATE INDEX "followup_recommendation_consultation_id_idx" ON "clinzo"."followup_recommendation" USING btree ("consultation_id");
--> statement-breakpoint
CREATE INDEX "followup_recommendation_recommended_by_idx" ON "clinzo"."followup_recommendation" USING btree ("recommended_by");
--> statement-breakpoint
CREATE INDEX "followup_recommendation_booked_appointment_id_idx" ON "clinzo"."followup_recommendation" USING btree ("booked_appointment_id");
--> statement-breakpoint
CREATE INDEX "vital_observation_consultation_id_idx" ON "clinzo"."vital_observation" USING btree ("consultation_id");
--> statement-breakpoint
CREATE INDEX "vital_observation_recorded_by_idx" ON "clinzo"."vital_observation" USING btree ("recorded_by");
--> statement-breakpoint
CREATE INDEX "vital_observation_supersedes_id_idx" ON "clinzo"."vital_observation" USING btree ("supersedes_id");
--> statement-breakpoint
CREATE INDEX "doctor_identity_id_idx" ON "clinzo"."doctor" USING btree ("identity_id");
--> statement-breakpoint
CREATE INDEX "doctor_facility_doctor_id_idx" ON "clinzo"."doctor_facility" USING btree ("doctor_id");
--> statement-breakpoint
CREATE INDEX "doctor_facility_facility_id_idx" ON "clinzo"."doctor_facility" USING btree ("facility_id");
--> statement-breakpoint
CREATE INDEX "doctor_language_doctor_id_idx" ON "clinzo"."doctor_language" USING btree ("doctor_id");
--> statement-breakpoint
CREATE INDEX "doctor_specialty_doctor_id_idx" ON "clinzo"."doctor_specialty" USING btree ("doctor_id");
--> statement-breakpoint
CREATE INDEX "doctor_specialty_specialty_id_idx" ON "clinzo"."doctor_specialty" USING btree ("specialty_id");
--> statement-breakpoint
CREATE INDEX "practice_service_doctor_facility_id_idx" ON "clinzo"."practice_service" USING btree ("doctor_facility_id");
--> statement-breakpoint
CREATE INDEX "symptom_specialty_symptom_id_idx" ON "clinzo"."symptom_specialty" USING btree ("symptom_id");
--> statement-breakpoint
CREATE INDEX "symptom_specialty_specialty_id_idx" ON "clinzo"."symptom_specialty" USING btree ("specialty_id");
--> statement-breakpoint
CREATE INDEX "ambulance_assignment_booking_id_idx" ON "clinzo"."ambulance_assignment" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "ambulance_assignment_offer_id_idx" ON "clinzo"."ambulance_assignment" USING btree ("offer_id");
--> statement-breakpoint
CREATE INDEX "ambulance_assignment_shift_id_idx" ON "clinzo"."ambulance_assignment" USING btree ("shift_id");
--> statement-breakpoint
CREATE INDEX "ambulance_assignment_driver_id_idx" ON "clinzo"."ambulance_assignment" USING btree ("driver_id");
--> statement-breakpoint
CREATE INDEX "ambulance_assignment_vehicle_id_idx" ON "clinzo"."ambulance_assignment" USING btree ("vehicle_id");
--> statement-breakpoint
CREATE INDEX "dispatch_offer_round_id_idx" ON "clinzo"."dispatch_offer" USING btree ("round_id");
--> statement-breakpoint
CREATE INDEX "dispatch_offer_shift_id_idx" ON "clinzo"."dispatch_offer" USING btree ("shift_id");
--> statement-breakpoint
CREATE INDEX "dispatch_round_booking_id_idx" ON "clinzo"."dispatch_round" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "emergency_case_booking_id_idx" ON "clinzo"."emergency_case" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "emergency_start_override_trip_id_idx" ON "clinzo"."emergency_start_override" USING btree ("trip_id");
--> statement-breakpoint
CREATE INDEX "emergency_start_override_approved_by_idx" ON "clinzo"."emergency_start_override" USING btree ("approved_by");
--> statement-breakpoint
CREATE INDEX "guest_emergency_session_claimed_identity_id_idx" ON "clinzo"."guest_emergency_session" USING btree ("claimed_identity_id");
--> statement-breakpoint
CREATE INDEX "triage_observation_emergency_case_id_idx" ON "clinzo"."triage_observation" USING btree ("emergency_case_id");
--> statement-breakpoint
CREATE INDEX "triage_observation_recorded_by_idx" ON "clinzo"."triage_observation" USING btree ("recorded_by");
--> statement-breakpoint
CREATE INDEX "triage_observation_suggested_facility_id_idx" ON "clinzo"."triage_observation" USING btree ("suggested_facility_id");
--> statement-breakpoint
CREATE INDEX "ambulance_review_trip_id_idx" ON "clinzo"."ambulance_review" USING btree ("trip_id");
--> statement-breakpoint
CREATE INDEX "ambulance_review_submitted_by_idx" ON "clinzo"."ambulance_review" USING btree ("submitted_by");
--> statement-breakpoint
CREATE INDEX "doctor_review_appointment_id_idx" ON "clinzo"."doctor_review" USING btree ("appointment_id");
--> statement-breakpoint
CREATE INDEX "doctor_review_submitted_by_idx" ON "clinzo"."doctor_review" USING btree ("submitted_by");
--> statement-breakpoint
CREATE INDEX "platform_feedback_identity_id_idx" ON "clinzo"."platform_feedback" USING btree ("identity_id");
--> statement-breakpoint
CREATE INDEX "patient_access_patient_id_idx" ON "clinzo"."patient_access" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "patient_access_identity_id_idx" ON "clinzo"."patient_access" USING btree ("identity_id");
--> statement-breakpoint
CREATE INDEX "patient_contact_patient_id_idx" ON "clinzo"."patient_contact" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "domain_event_actor_id_idx" ON "clinzo"."domain_event" USING btree ("actor_id");
--> statement-breakpoint
CREATE INDEX "domain_event_guest_session_id_idx" ON "clinzo"."domain_event" USING btree ("guest_session_id");
--> statement-breakpoint
CREATE INDEX "event_delivery_event_id_idx" ON "clinzo"."event_delivery" USING btree ("event_id");
--> statement-breakpoint
CREATE INDEX "notification_delivery_intent_id_idx" ON "clinzo"."notification_delivery" USING btree ("intent_id");
--> statement-breakpoint
CREATE INDEX "notification_delivery_endpoint_id_idx" ON "clinzo"."notification_delivery" USING btree ("endpoint_id");
--> statement-breakpoint
CREATE INDEX "notification_endpoint_identity_id_idx" ON "clinzo"."notification_endpoint" USING btree ("identity_id");
--> statement-breakpoint
CREATE INDEX "notification_intent_recipient_id_idx" ON "clinzo"."notification_intent" USING btree ("recipient_id");
--> statement-breakpoint
CREATE INDEX "notification_intent_event_id_idx" ON "clinzo"."notification_intent" USING btree ("event_id");
--> statement-breakpoint
CREATE INDEX "notification_intent_occurrence_id_idx" ON "clinzo"."notification_intent" USING btree ("occurrence_id");
--> statement-breakpoint
CREATE INDEX "notification_preference_identity_id_idx" ON "clinzo"."notification_preference" USING btree ("identity_id");
--> statement-breakpoint
CREATE INDEX "reminder_occurrence_schedule_id_idx" ON "clinzo"."reminder_occurrence" USING btree ("schedule_id");
--> statement-breakpoint
CREATE INDEX "reminder_schedule_patient_id_idx" ON "clinzo"."reminder_schedule" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "reminder_schedule_phase_id_idx" ON "clinzo"."reminder_schedule" USING btree ("phase_id");
--> statement-breakpoint
CREATE INDEX "reminder_schedule_timing_id_idx" ON "clinzo"."reminder_schedule" USING btree ("timing_id");
--> statement-breakpoint
CREATE INDEX "reminder_schedule_followup_id_idx" ON "clinzo"."reminder_schedule" USING btree ("followup_id");
--> statement-breakpoint
CREATE INDEX "facility_organization_id_idx" ON "clinzo"."facility" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "facility_location_geo_idx" ON "clinzo"."facility" USING gist ("location");
--> statement-breakpoint
CREATE INDEX "member_doctor_scope_member_id_idx" ON "clinzo"."member_doctor_scope" USING btree ("member_id");
--> statement-breakpoint
CREATE INDEX "member_doctor_scope_doctor_facility_id_idx" ON "clinzo"."member_doctor_scope" USING btree ("doctor_facility_id");
--> statement-breakpoint
CREATE INDEX "organization_member_identity_id_idx" ON "clinzo"."organization_member" USING btree ("identity_id");
--> statement-breakpoint
CREATE INDEX "organization_member_organization_id_idx" ON "clinzo"."organization_member" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "organization_member_facility_id_idx" ON "clinzo"."organization_member" USING btree ("facility_id");
--> statement-breakpoint
CREATE INDEX "fare_quote_booking_id_idx" ON "clinzo"."fare_quote" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "fare_quote_accepted_by_idx" ON "clinzo"."fare_quote" USING btree ("accepted_by");
--> statement-breakpoint
CREATE INDEX "payment_booking_id_idx" ON "clinzo"."payment" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "payment_fare_quote_id_idx" ON "clinzo"."payment" USING btree ("fare_quote_id");
--> statement-breakpoint
CREATE INDEX "payment_reported_by_idx" ON "clinzo"."payment" USING btree ("reported_by");
--> statement-breakpoint
CREATE INDEX "payment_confirmed_by_idx" ON "clinzo"."payment" USING btree ("confirmed_by");
--> statement-breakpoint
CREATE INDEX "provider_event_payment_id_idx" ON "clinzo"."provider_event" USING btree ("payment_id");
--> statement-breakpoint
CREATE INDEX "refund_payment_id_idx" ON "clinzo"."refund" USING btree ("payment_id");
--> statement-breakpoint
CREATE INDEX "refund_requested_by_idx" ON "clinzo"."refund" USING btree ("requested_by");
--> statement-breakpoint
CREATE INDEX "medication_phase_prescription_item_id_idx" ON "clinzo"."medication_phase" USING btree ("prescription_item_id");
--> statement-breakpoint
CREATE INDEX "medication_timing_phase_id_idx" ON "clinzo"."medication_timing" USING btree ("phase_id");
--> statement-breakpoint
CREATE INDEX "patient_routine_patient_id_idx" ON "clinzo"."patient_routine" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "prescription_consultation_id_idx" ON "clinzo"."prescription" USING btree ("consultation_id");
--> statement-breakpoint
CREATE INDEX "prescription_item_revision_id_idx" ON "clinzo"."prescription_item" USING btree ("revision_id");
--> statement-breakpoint
CREATE INDEX "prescription_revision_prescription_id_idx" ON "clinzo"."prescription_revision" USING btree ("prescription_id");
--> statement-breakpoint
CREATE INDEX "prescription_revision_supersedes_id_idx" ON "clinzo"."prescription_revision" USING btree ("supersedes_id");
--> statement-breakpoint
CREATE INDEX "prescription_revision_signed_by_idx" ON "clinzo"."prescription_revision" USING btree ("signed_by");
--> statement-breakpoint
CREATE INDEX "queue_entry_queue_id_idx" ON "clinzo"."queue_entry" USING btree ("queue_id");
--> statement-breakpoint
CREATE INDEX "queue_entry_appointment_id_idx" ON "clinzo"."queue_entry" USING btree ("appointment_id");
--> statement-breakpoint
CREATE INDEX "session_queue_session_id_idx" ON "clinzo"."session_queue" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "appointment_window_session_id_idx" ON "clinzo"."appointment_window" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "doctor_booking_day_doctor_id_idx" ON "clinzo"."doctor_booking_day" USING btree ("doctor_id");
--> statement-breakpoint
CREATE INDEX "schedule_break_schedule_rule_id_idx" ON "clinzo"."schedule_break" USING btree ("schedule_rule_id");
--> statement-breakpoint
CREATE INDEX "schedule_exception_doctor_id_idx" ON "clinzo"."schedule_exception" USING btree ("doctor_id");
--> statement-breakpoint
CREATE INDEX "schedule_exception_doctor_facility_id_idx" ON "clinzo"."schedule_exception" USING btree ("doctor_facility_id");
--> statement-breakpoint
CREATE INDEX "schedule_rule_doctor_facility_id_idx" ON "clinzo"."schedule_rule" USING btree ("doctor_facility_id");
--> statement-breakpoint
CREATE INDEX "session_doctor_facility_id_idx" ON "clinzo"."session" USING btree ("doctor_facility_id");
--> statement-breakpoint
CREATE INDEX "session_doctor_id_idx" ON "clinzo"."session" USING btree ("doctor_id");
--> statement-breakpoint
CREATE INDEX "session_booking_day_id_idx" ON "clinzo"."session" USING btree ("booking_day_id");
--> statement-breakpoint
CREATE INDEX "session_schedule_rule_id_idx" ON "clinzo"."session" USING btree ("schedule_rule_id");
--> statement-breakpoint
CREATE INDEX "session_service_session_id_idx" ON "clinzo"."session_service" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "session_service_practice_service_id_idx" ON "clinzo"."session_service" USING btree ("practice_service_id");
--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "clinzo"."audit_log" USING btree ("actor_id");
--> statement-breakpoint
CREATE INDEX "audit_log_guest_session_id_idx" ON "clinzo"."audit_log" USING btree ("guest_session_id");
--> statement-breakpoint
CREATE INDEX "audit_log_organization_id_idx" ON "clinzo"."audit_log" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "audit_log_facility_id_idx" ON "clinzo"."audit_log" USING btree ("facility_id");
--> statement-breakpoint
CREATE INDEX "clinical_access_grant_patient_id_idx" ON "clinzo"."clinical_access_grant" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX "clinical_access_grant_identity_id_idx" ON "clinzo"."clinical_access_grant" USING btree ("identity_id");
--> statement-breakpoint
CREATE INDEX "clinical_access_grant_facility_id_idx" ON "clinzo"."clinical_access_grant" USING btree ("facility_id");
--> statement-breakpoint
CREATE INDEX "clinical_access_grant_granted_by_idx" ON "clinzo"."clinical_access_grant" USING btree ("granted_by");
--> statement-breakpoint
CREATE INDEX "driver_location_latest_driver_id_idx" ON "clinzo"."driver_location_latest" USING btree ("driver_id");
--> statement-breakpoint
CREATE INDEX "driver_location_latest_shift_id_idx" ON "clinzo"."driver_location_latest" USING btree ("shift_id");
--> statement-breakpoint
CREATE INDEX "driver_location_latest_position_geo_idx" ON "clinzo"."driver_location_latest" USING gist ("position");
--> statement-breakpoint
CREATE INDEX "tracking_share_trip_id_idx" ON "clinzo"."tracking_share" USING btree ("trip_id");
--> statement-breakpoint
CREATE INDEX "tracking_share_created_by_idx" ON "clinzo"."tracking_share" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "tracking_share_guest_session_id_idx" ON "clinzo"."tracking_share" USING btree ("guest_session_id");
--> statement-breakpoint
CREATE INDEX "tracking_share_contact_id_idx" ON "clinzo"."tracking_share" USING btree ("contact_id");
--> statement-breakpoint
CREATE INDEX "trip_location_trip_id_idx" ON "clinzo"."trip_location" USING btree ("trip_id");
--> statement-breakpoint
CREATE INDEX "trip_location_assignment_id_idx" ON "clinzo"."trip_location" USING btree ("assignment_id");
--> statement-breakpoint
CREATE INDEX "trip_location_position_geo_idx" ON "clinzo"."trip_location" USING gist ("position");
--> statement-breakpoint
CREATE INDEX "trip_booking_id_idx" ON "clinzo"."trip" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "trip_assignment_id_idx" ON "clinzo"."trip" USING btree ("assignment_id");