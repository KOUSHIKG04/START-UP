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
import { facility } from "./organizations";

export const doctor = clinzo
  .table(
    "doctor",
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
      identity_id: uuid("identity_id").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
      public_code: text("public_code").notNull(),
      full_name: text("full_name").notNull(),
      bio: text("bio"),
      registration_authority: text("registration_authority").notNull(),
      registration_number: text("registration_number").notNull(),
      practice_started_on: date("practice_started_on", {
        mode: "string",
      }).notNull(),
      credential_status: text("credential_status", {
        enum: ["pending", "verified", "suspended"],
      }).notNull(),
      active: boolean("active").notNull().default(true),
      booking_timezone: text("booking_timezone")
        .notNull()
        .default("Asia/Kolkata"),
    },
    (table) => [
      uniqueIndex("doctor_uq_1").on(table.identity_id),
      uniqueIndex("doctor_uq_2").on(table.public_code),
      uniqueIndex("doctor_uq_3").on(
        table.registration_authority,
        table.registration_number
      ),
      index("doctor_identity_id_idx").on(table.identity_id),
      check("doctor_ck_1", sql.raw("row_version > 0")),
      check(
        "doctor_ck_2",
        sql.raw("\"credential_status\" IN ('pending', 'verified', 'suspended')")
      ),
    ]
  )
  .enableRLS();
export type Doctor = typeof doctor.$inferSelect;
export type NewDoctor = typeof doctor.$inferInsert;

export const specialty = clinzo
  .table(
    "specialty",
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
      name: text("name").notNull(),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("specialty_uq_1").on(table.code),
      check("specialty_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type Specialty = typeof specialty.$inferSelect;
export type NewSpecialty = typeof specialty.$inferInsert;

export const symptom = clinzo
  .table(
    "symptom",
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
      label: text("label").notNull(),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("symptom_uq_1").on(table.code),
      check("symptom_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type Symptom = typeof symptom.$inferSelect;
export type NewSymptom = typeof symptom.$inferInsert;

export const symptomSpecialty = clinzo
  .table(
    "symptom_specialty",
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
      symptom_id: uuid("symptom_id")
        .notNull()
        .references((): AnyPgColumn => symptom.id, { onDelete: "restrict" }),
      specialty_id: uuid("specialty_id")
        .notNull()
        .references((): AnyPgColumn => specialty.id, { onDelete: "restrict" }),
      rank: smallint("rank").notNull().default(0),
    },
    (table) => [
      uniqueIndex("symptom_specialty_uq_1").on(
        table.symptom_id,
        table.specialty_id
      ),
      index("symptom_specialty_symptom_id_idx").on(table.symptom_id),
      index("symptom_specialty_specialty_id_idx").on(table.specialty_id),
      check("symptom_specialty_ck_1", sql.raw("rank >= 0")),
      check("symptom_specialty_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type SymptomSpecialty = typeof symptomSpecialty.$inferSelect;
export type NewSymptomSpecialty = typeof symptomSpecialty.$inferInsert;

export const doctorSpecialty = clinzo
  .table(
    "doctor_specialty",
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
      doctor_id: uuid("doctor_id")
        .notNull()
        .references((): AnyPgColumn => doctor.id, { onDelete: "restrict" }),
      specialty_id: uuid("specialty_id")
        .notNull()
        .references((): AnyPgColumn => specialty.id, { onDelete: "restrict" }),
    },
    (table) => [
      uniqueIndex("doctor_specialty_uq_1").on(
        table.doctor_id,
        table.specialty_id
      ),
      index("doctor_specialty_doctor_id_idx").on(table.doctor_id),
      index("doctor_specialty_specialty_id_idx").on(table.specialty_id),
      check("doctor_specialty_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type DoctorSpecialty = typeof doctorSpecialty.$inferSelect;
export type NewDoctorSpecialty = typeof doctorSpecialty.$inferInsert;

export const doctorLanguage = clinzo
  .table(
    "doctor_language",
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
      doctor_id: uuid("doctor_id")
        .notNull()
        .references((): AnyPgColumn => doctor.id, { onDelete: "restrict" }),
      language_code: text("language_code").notNull(),
    },
    (table) => [
      uniqueIndex("doctor_language_uq_1").on(
        table.doctor_id,
        table.language_code
      ),
      index("doctor_language_doctor_id_idx").on(table.doctor_id),
      check("doctor_language_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type DoctorLanguage = typeof doctorLanguage.$inferSelect;
export type NewDoctorLanguage = typeof doctorLanguage.$inferInsert;

export const doctorFacility = clinzo
  .table(
    "doctor_facility",
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
      doctor_id: uuid("doctor_id")
        .notNull()
        .references((): AnyPgColumn => doctor.id, { onDelete: "restrict" }),
      facility_id: uuid("facility_id")
        .notNull()
        .references((): AnyPgColumn => facility.id, { onDelete: "restrict" }),
      room_label: text("room_label"),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("doctor_facility_uq_1").on(
        table.doctor_id,
        table.facility_id
      ),
      uniqueIndex("doctor_facility_uq_2").on(table.id, table.doctor_id),
      index("doctor_facility_doctor_id_idx").on(table.doctor_id),
      index("doctor_facility_facility_id_idx").on(table.facility_id),
      check("doctor_facility_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type DoctorFacility = typeof doctorFacility.$inferSelect;
export type NewDoctorFacility = typeof doctorFacility.$inferInsert;

export const practiceService = clinzo
  .table(
    "practice_service",
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
      doctor_facility_id: uuid("doctor_facility_id")
        .notNull()
        .references((): AnyPgColumn => doctorFacility.id, {
          onDelete: "restrict",
        }),
      code: text("code").notNull(),
      name: text("name").notNull(),
      fee_minor: bigint("fee_minor", { mode: "bigint" }).notNull(),
      currency: char("currency", { length: 3 }).notNull(),
      duration_minutes: smallint("duration_minutes").notNull(),
      room_label: text("room_label"),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("practice_service_uq_1").on(
        table.doctor_facility_id,
        table.code
      ),
      index("practice_service_doctor_facility_id_idx").on(
        table.doctor_facility_id
      ),
      check(
        "practice_service_ck_1",
        sql.raw("fee_minor >= 0 AND duration_minutes > 0")
      ),
      check("practice_service_ck_2", sql.raw("row_version > 0")),
      check("practice_service_ck_3", sql.raw("currency ~ '^[A-Z]{3}$'")),
    ]
  )
  .enableRLS();
export type PracticeService = typeof practiceService.$inferSelect;
export type NewPracticeService = typeof practiceService.$inferInsert;
