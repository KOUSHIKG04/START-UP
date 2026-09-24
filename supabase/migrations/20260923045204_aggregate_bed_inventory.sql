CREATE TABLE "clinzo"."bed_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinzo"."bed_type" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clinzo"."facility_bed_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"bed_type_id" uuid NOT NULL,
	"total" integer NOT NULL,
	"occupied" integer NOT NULL,
	"maintenance" integer NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"row_version" bigint DEFAULT 1 NOT NULL,
	CONSTRAINT "facility_bed_inventory_counts_ck" CHECK ("clinzo"."facility_bed_inventory"."total" >= 0 AND "clinzo"."facility_bed_inventory"."occupied" >= 0 AND "clinzo"."facility_bed_inventory"."maintenance" >= 0 AND "clinzo"."facility_bed_inventory"."occupied"::bigint + "clinzo"."facility_bed_inventory"."maintenance"::bigint <= "clinzo"."facility_bed_inventory"."total"),
	CONSTRAINT "facility_bed_inventory_version_ck" CHECK ("clinzo"."facility_bed_inventory"."row_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "clinzo"."facility_bed_inventory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinzo"."facility_bed_inventory" ADD CONSTRAINT "facility_bed_inventory_facility_id_facility_id_fk" FOREIGN KEY ("facility_id") REFERENCES "clinzo"."facility"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinzo"."facility_bed_inventory" ADD CONSTRAINT "facility_bed_inventory_bed_type_id_bed_type_id_fk" FOREIGN KEY ("bed_type_id") REFERENCES "clinzo"."bed_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinzo"."facility_bed_inventory" ADD CONSTRAINT "facility_bed_inventory_updated_by_identity_id_fk" FOREIGN KEY ("updated_by") REFERENCES "clinzo"."identity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bed_type_code_uq" ON "clinzo"."bed_type" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "facility_bed_inventory_facility_type_uq" ON "clinzo"."facility_bed_inventory" USING btree ("facility_id","bed_type_id");--> statement-breakpoint
CREATE INDEX "facility_bed_inventory_type_idx" ON "clinzo"."facility_bed_inventory" USING btree ("bed_type_id");--> statement-breakpoint
CREATE INDEX "facility_bed_inventory_actor_idx" ON "clinzo"."facility_bed_inventory" USING btree ("updated_by");
-- Preserve immutable ownership and version semantics for inventory updates.
CREATE TRIGGER touch_row BEFORE UPDATE ON clinzo.facility_bed_inventory
FOR EACH ROW EXECUTE FUNCTION clinzo.touch_row();
CREATE TRIGGER prevent_reparenting BEFORE UPDATE ON clinzo.facility_bed_inventory
FOR EACH ROW EXECUTE FUNCTION clinzo.prevent_reparenting('facility_id', 'bed_type_id');
REVOKE ALL ON clinzo.bed_type, clinzo.facility_bed_inventory FROM PUBLIC, anon, authenticated;
-- No table grants or public stock claims are enabled by this migration.
-- A scoped command and an explicit public freshness policy are required first.
