ALTER TABLE "clinzo"."trip" DROP CONSTRAINT "trip_ck_4";--> statement-breakpoint
ALTER TABLE "clinzo"."trip" DROP CONSTRAINT "trip_ck_7";--> statement-breakpoint
-- Historical trip starts used the PIN as a start marker. Preserve the row while
-- moving future enforcement to completion; no patient PIN is needed to start.
UPDATE "clinzo"."trip" SET "start_authorization" = 'driver_confirmed'
  WHERE "start_authorization" = 'patient_pin';--> statement-breakpoint
ALTER TABLE "clinzo"."trip" ADD CONSTRAINT "trip_ck_4" CHECK (status <> 'completed' OR pin_credential_version IS NOT NULL);--> statement-breakpoint
ALTER TABLE "clinzo"."trip" ADD CONSTRAINT "trip_ck_7" CHECK ("start_authorization" IN ('driver_confirmed', 'emergency_override'));
