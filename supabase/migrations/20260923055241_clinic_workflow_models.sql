CREATE TABLE "clinzo"."driver_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"phone" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "driver_invitation_expiry_ck" CHECK (expires_at > created_at)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."driver_invitation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clinzo"."driver_invitation_acceptance" (
	"invitation_id" uuid PRIMARY KEY NOT NULL,
	"identity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinzo"."driver_invitation_acceptance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD COLUMN "visit_mode" text DEFAULT 'clinic' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinzo"."driver_invitation" ADD CONSTRAINT "driver_invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "clinzo"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinzo"."driver_invitation" ADD CONSTRAINT "driver_invitation_created_by_identity_id_fk" FOREIGN KEY ("created_by") REFERENCES "clinzo"."identity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinzo"."driver_invitation_acceptance" ADD CONSTRAINT "driver_invitation_acceptance_invitation_id_driver_invitation_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "clinzo"."driver_invitation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinzo"."driver_invitation_acceptance" ADD CONSTRAINT "driver_invitation_acceptance_identity_id_identity_id_fk" FOREIGN KEY ("identity_id") REFERENCES "clinzo"."identity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "driver_invitation_token_uq" ON "clinzo"."driver_invitation" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "driver_invitation_org_idx" ON "clinzo"."driver_invitation" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_visit_mode_ck" CHECK (visit_mode IN ('clinic','online','home'));--> statement-breakpoint
ALTER TABLE "clinzo"."appointment" ADD CONSTRAINT "appointment_reason_ck" CHECK (reason IS NULL OR length(trim(reason)) BETWEEN 1 AND 1000);