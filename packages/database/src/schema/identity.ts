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

export const identity = clinzo
  .table(
    "identity",
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
      issuer: text("issuer").notNull(),
      subject: text("subject").notNull(),
      display_name: text("display_name").notNull(),
      verified_phone: text("verified_phone"),
      disabled_at: timestamp("disabled_at", {
        withTimezone: true,
        mode: "date",
      }),
    },
    (table) => [
      uniqueIndex("identity_uq_1").on(table.issuer, table.subject),
      check("identity_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type Identity = typeof identity.$inferSelect;
export type NewIdentity = typeof identity.$inferInsert;

export const patient = clinzo
  .table(
    "patient",
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
      public_code: text("public_code").notNull(),
      full_name: text("full_name").notNull(),
      birth_date: date("birth_date", { mode: "string" }),
      sex_at_birth: text("sex_at_birth"),
      contact_phone: text("contact_phone"),
      timezone: text("timezone").notNull().default("Asia/Kolkata"),
      archived_at: timestamp("archived_at", {
        withTimezone: true,
        mode: "date",
      }),
    },
    (table) => [
      uniqueIndex("patient_uq_1").on(table.public_code),
      check("patient_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type Patient = typeof patient.$inferSelect;
export type NewPatient = typeof patient.$inferInsert;

export const patientAccess = clinzo
  .table(
    "patient_access",
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
      patient_id: uuid("patient_id")
        .notNull()
        .references((): AnyPgColumn => patient.id, { onDelete: "restrict" }),
      identity_id: uuid("identity_id")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      relationship: text("relationship", {
        enum: ["self", "guardian", "delegate"],
      }).notNull(),
      verified_at: timestamp("verified_at", {
        withTimezone: true,
        mode: "date",
      }),
      revoked_at: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      uniqueIndex("patient_access_uq_1").on(
        table.patient_id,
        table.identity_id
      ),
      uniqueIndex("patient_access_active_uq_1")
        .on(table.patient_id)
        .where(sql.raw("relationship = 'self' AND revoked_at IS NULL")),
      index("patient_access_patient_id_idx").on(table.patient_id),
      index("patient_access_identity_id_idx").on(table.identity_id),
      check("patient_access_ck_1", sql.raw("row_version > 0")),
      check(
        "patient_access_ck_2",
        sql.raw("\"relationship\" IN ('self', 'guardian', 'delegate')")
      ),
    ]
  )
  .enableRLS();
export type PatientAccess = typeof patientAccess.$inferSelect;
export type NewPatientAccess = typeof patientAccess.$inferInsert;

export const patientContact = clinzo
  .table(
    "patient_contact",
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
      patient_id: uuid("patient_id")
        .notNull()
        .references((): AnyPgColumn => patient.id, { onDelete: "restrict" }),
      name: text("name").notNull(),
      phone: text("phone").notNull(),
      relationship: text("relationship").notNull(),
      sharing_consent_at: timestamp("sharing_consent_at", {
        withTimezone: true,
        mode: "date",
      }),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      index("patient_contact_patient_id_idx").on(table.patient_id),
      check("patient_contact_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type PatientContact = typeof patientContact.$inferSelect;
export type NewPatientContact = typeof patientContact.$inferInsert;
