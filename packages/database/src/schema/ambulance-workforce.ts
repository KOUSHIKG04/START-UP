// Server-only Drizzle models. Never import into a web/mobile client bundle.
import { sql } from "drizzle-orm";
import {
  uuid,
  text,
  boolean,
  integer,
  smallint,
  bigint,
  numeric,
  char,
  date,
  time,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
  foreignKey,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  clinzo,
  geographyPoint,
  geographyArea,
  bytea,
  type JsonValue,
} from "./common";
import { identity } from "./identity";
import { organization } from "./organizations";

export const driver = clinzo
  .table(
    "driver",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
      identity_id: uuid("identity_id")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      organization_id: uuid("organization_id")
        .notNull()
        .references((): AnyPgColumn => organization.id, {
          onDelete: "restrict",
        }),
      public_code: text("public_code").notNull(),
      full_name: text("full_name").notNull(),
      date_of_birth: date("date_of_birth", { mode: "string" }),
      city: text("city"),
      contact_phone: text("contact_phone"),
      profile_photo_path: text("profile_photo_path"),
      verification_consent_at: timestamp("verification_consent_at", {
        withTimezone: true,
        mode: "date",
      }),
      license_number: text("license_number").notNull(),
      license_expires_on: date("license_expires_on", {
        mode: "string",
      }).notNull(),
      verification_status: text("verification_status", {
        enum: ["pending", "verified", "suspended"],
      }).notNull(),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("driver_uq_1").on(table.identity_id),
      uniqueIndex("driver_uq_2").on(table.public_code),
      index("driver_identity_id_idx").on(table.identity_id),
      index("driver_organization_id_idx").on(table.organization_id),
      check("driver_ck_1", sql.raw("row_version > 0")),
      check(
        "driver_city_length",
        sql.raw("city IS NULL OR length(city) BETWEEN 2 AND 120")
      ),
      check(
        "driver_contact_phone_format",
        sql.raw(
          "contact_phone IS NULL OR contact_phone ~ '^\\+[1-9][0-9]{7,14}$'"
        )
      ),
      check(
        "driver_ck_2",
        sql.raw(
          "\"verification_status\" IN ('pending', 'verified', 'suspended')"
        )
      ),
    ]
  )
  .enableRLS();
export type Driver = typeof driver.$inferSelect;
export type NewDriver = typeof driver.$inferInsert;

// Pending evidence from the `main` driver onboarding UI. Approval creates a
// separate driver/fleet record only through the future trusted review boundary.
export const driverRegistrationApplication = clinzo
  .table(
    "driver_registration_application",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      identity_id: uuid("identity_id")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      full_name: text("full_name").notNull(),
      contact_phone: text("contact_phone").notNull(),
      date_of_birth: date("date_of_birth", { mode: "string" }).notNull(),
      city: text("city").notNull(),
      profile_photo_path: text("profile_photo_path"),
      consent_at: timestamp("consent_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      capability_code: text("capability_code", {
        enum: ["BLS", "ALS", "NICU"],
      }),
      registration_number: text("registration_number"),
      documents: jsonb("documents")
        .$type<Record<string, string>>()
        .notNull()
        .default(sql`'{}'::jsonb`),
      status: text("status", {
        enum: ["details_saved", "submitted", "approved", "rejected"],
      })
        .notNull()
        .default("details_saved"),
      submitted_at: timestamp("submitted_at", {
        withTimezone: true,
        mode: "date",
      }),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
    },
    (table) => [
      uniqueIndex("driver_registration_application_identity_uq").on(
        table.identity_id
      ),
      check(
        "driver_registration_application_row_version_ck",
        sql.raw("row_version > 0")
      ),
      check(
        "driver_registration_application_phone_ck",
        sql.raw("contact_phone ~ '^\\+[1-9][0-9]{7,14}$'")
      ),
    ]
  )
  .enableRLS();
export type DriverRegistrationApplication =
  typeof driverRegistrationApplication.$inferSelect;

export const vehicle = clinzo
  .table(
    "vehicle",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
      organization_id: uuid("organization_id")
        .notNull()
        .references((): AnyPgColumn => organization.id, {
          onDelete: "restrict",
        }),
      registration_number: text("registration_number").notNull(),
      display_label: text("display_label").notNull(),
      inspection_expires_on: date("inspection_expires_on", {
        mode: "string",
      }).notNull(),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("vehicle_uq_1").on(table.registration_number),
      index("vehicle_organization_id_idx").on(table.organization_id),
      check("vehicle_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type Vehicle = typeof vehicle.$inferSelect;
export type NewVehicle = typeof vehicle.$inferInsert;

export const driverDocument = clinzo
  .table(
    "driver_document",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      driver_id: uuid("driver_id")
        .notNull()
        .references((): AnyPgColumn => driver.id, { onDelete: "restrict" }),
      vehicle_id: uuid("vehicle_id")
        .notNull()
        .references((): AnyPgColumn => vehicle.id, { onDelete: "restrict" }),
      kind: text("kind", {
        enum: [
          "aadhaar",
          "pan",
          "driving_licence",
          "vehicle_rc",
          "insurance",
          "fitness",
          "ambulance_image",
          "equipment_images",
        ],
      }).notNull(),
      storage_path: text("storage_path").notNull(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex("driver_document_vehicle_kind_uq").on(
        table.vehicle_id,
        table.kind
      ),
      uniqueIndex("driver_document_storage_path_uq").on(table.storage_path),
      index("driver_document_driver_id_idx").on(table.driver_id),
    ]
  )
  .enableRLS();
export type DriverDocument = typeof driverDocument.$inferSelect;
export type NewDriverDocument = typeof driverDocument.$inferInsert;

export const capability = clinzo
  .table(
    "capability",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
      code: text("code").notNull(),
      description: text("description").notNull(),
    },
    (table) => [
      uniqueIndex("capability_uq_1").on(table.code),
      check("capability_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type Capability = typeof capability.$inferSelect;
export type NewCapability = typeof capability.$inferInsert;

export const vehicleCapability = clinzo
  .table(
    "vehicle_capability",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
      vehicle_id: uuid("vehicle_id")
        .notNull()
        .references((): AnyPgColumn => vehicle.id, { onDelete: "restrict" }),
      capability_id: uuid("capability_id")
        .notNull()
        .references((): AnyPgColumn => capability.id, { onDelete: "restrict" }),
      verified_at: timestamp("verified_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
    },
    (table) => [
      uniqueIndex("vehicle_capability_uq_1").on(
        table.vehicle_id,
        table.capability_id
      ),
      index("vehicle_capability_vehicle_id_idx").on(table.vehicle_id),
      index("vehicle_capability_capability_id_idx").on(table.capability_id),
      check("vehicle_capability_ck_1", sql.raw("expires_at > verified_at")),
      check("vehicle_capability_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type VehicleCapability = typeof vehicleCapability.$inferSelect;
export type NewVehicleCapability = typeof vehicleCapability.$inferInsert;

export const vehicleReviewRequest = clinzo
  .table(
    "vehicle_review_request",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
      driver_id: uuid("driver_id")
        .notNull()
        .references(() => driver.id, { onDelete: "restrict" }),
      vehicle_id: uuid("vehicle_id")
        .notNull()
        .references(() => vehicle.id, { onDelete: "restrict" }),
      capability_id: uuid("capability_id")
        .notNull()
        .references(() => capability.id, { onDelete: "restrict" }),
      equipment_notes: text("equipment_notes").notNull(),
      crew_notes: text("crew_notes").notNull(),
      status: text("status", {
        enum: ["pending", "approved", "rejected", "revoked"],
      })
        .notNull()
        .default("pending"),
      reviewed_at: timestamp("reviewed_at", {
        withTimezone: true,
        mode: "date",
      }),
      approved_until: timestamp("approved_until", {
        withTimezone: true,
        mode: "date",
      }),
      reviewer_reference: text("reviewer_reference"),
      evidence_reference: text("evidence_reference"),
      review_note: text("review_note"),
    },
    (table) => [
      uniqueIndex("vehicle_review_pending_uq")
        .on(table.driver_id, table.vehicle_id, table.capability_id)
        .where(sql`status='pending'`),
      index("vehicle_review_approved_idx")
        .on(
          table.driver_id,
          table.vehicle_id,
          table.capability_id,
          table.approved_until
        )
        .where(sql`status='approved'`),
      check("vehicle_review_request_row_version_check", sql`row_version > 0`),
      check(
        "vehicle_review_request_equipment_notes_check",
        sql`length(equipment_notes) BETWEEN 10 AND 1000`
      ),
      check(
        "vehicle_review_request_crew_notes_check",
        sql`length(crew_notes) BETWEEN 10 AND 1000`
      ),
      check(
        "vehicle_review_request_status_check",
        sql`status IN ('pending','approved','rejected','revoked')`
      ),
      check(
        "vehicle_review_decision_ck",
        sql`(status='pending' AND reviewed_at IS NULL AND approved_until IS NULL) OR (status='approved' AND reviewed_at IS NOT NULL AND approved_until > reviewed_at) OR (status IN ('rejected','revoked') AND reviewed_at IS NOT NULL AND approved_until IS NULL)`
      ),
    ]
  )
  .enableRLS();
export type VehicleReviewRequest = typeof vehicleReviewRequest.$inferSelect;
export type NewVehicleReviewRequest = typeof vehicleReviewRequest.$inferInsert;

export const driverShift = clinzo
  .table(
    "driver_shift",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
      driver_id: uuid("driver_id")
        .notNull()
        .references((): AnyPgColumn => driver.id, { onDelete: "restrict" }),
      vehicle_id: uuid("vehicle_id")
        .notNull()
        .references((): AnyPgColumn => vehicle.id, { onDelete: "restrict" }),
      started_at: timestamp("started_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      ended_at: timestamp("ended_at", { withTimezone: true, mode: "date" }),
      desired_availability: text("desired_availability", {
        enum: ["online", "offline"],
      }).notNull(),
      service_area: geographyArea("service_area").notNull(),
      crew_attestation: text("crew_attestation").notNull(),
      crew_verified_until: timestamp("crew_verified_until", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
    },
    (table) => [
      uniqueIndex("driver_shift_uq_1").on(
        table.id,
        table.driver_id,
        table.vehicle_id
      ),
      uniqueIndex("driver_shift_active_uq_1")
        .on(table.driver_id)
        .where(sql.raw("ended_at IS NULL")),
      uniqueIndex("driver_shift_active_uq_2")
        .on(table.vehicle_id)
        .where(sql.raw("ended_at IS NULL")),
      index("driver_shift_driver_id_idx").on(table.driver_id),
      index("driver_shift_vehicle_id_idx").on(table.vehicle_id),
      index("driver_shift_service_area_geo_idx").using(
        "gist",
        table.service_area
      ),
      check(
        "driver_shift_ck_1",
        sql.raw("ended_at IS NULL OR ended_at >= started_at")
      ),
      check("driver_shift_ck_2", sql.raw("crew_verified_until > started_at")),
      check("driver_shift_ck_3", sql.raw("row_version > 0")),
      check(
        "driver_shift_ck_4",
        sql.raw("\"desired_availability\" IN ('online', 'offline')")
      ),
    ]
  )
  .enableRLS();
export type DriverShift = typeof driverShift.$inferSelect;
export type NewDriverShift = typeof driverShift.$inferInsert;
