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
import { appointment } from "./appointments";
import { doctor } from "./directory";
import { identity, patient } from "./identity";

export const consultation = clinzo
  .table(
    "consultation",
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
      appointment_id: uuid("appointment_id")
        .notNull()
        .references((): AnyPgColumn => appointment.id, {
          onDelete: "restrict",
        }),
      patient_id: uuid("patient_id")
        .notNull()
        .references((): AnyPgColumn => patient.id, { onDelete: "restrict" }),
      doctor_id: uuid("doctor_id")
        .notNull()
        .references((): AnyPgColumn => doctor.id, { onDelete: "restrict" }),
      status: text("status", {
        enum: ["active", "signed", "amended", "void"],
      }).notNull(),
      started_at: timestamp("started_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      ended_at: timestamp("ended_at", { withTimezone: true, mode: "date" }),
      signed_at: timestamp("signed_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      uniqueIndex("consultation_uq_1").on(table.appointment_id),
      uniqueIndex("consultation_active_uq_1")
        .on(table.doctor_id)
        .where(sql.raw("status = 'active'")),
      index("consultation_appointment_id_idx").on(table.appointment_id),
      index("consultation_patient_id_idx").on(table.patient_id),
      index("consultation_doctor_id_idx").on(table.doctor_id),
      check(
        "consultation_ck_1",
        sql.raw("ended_at IS NULL OR ended_at >= started_at")
      ),
      check(
        "consultation_ck_2",
        sql.raw(
          "status NOT IN ('signed','amended') OR (ended_at IS NOT NULL AND signed_at IS NOT NULL)"
        )
      ),
      check("consultation_ck_3", sql.raw("row_version > 0")),
      check(
        "consultation_ck_4",
        sql.raw("\"status\" IN ('active', 'signed', 'amended', 'void')")
      ),
    ]
  )
  .enableRLS();
export type Consultation = typeof consultation.$inferSelect;
export type NewConsultation = typeof consultation.$inferInsert;

export const vitalObservation = clinzo
  .table(
    "vital_observation",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      consultation_id: uuid("consultation_id")
        .notNull()
        .references((): AnyPgColumn => consultation.id, {
          onDelete: "restrict",
        }),
      code: text("code").notNull(),
      value_numeric: numeric("value_numeric", {
        precision: 12,
        scale: 3,
      }).notNull(),
      unit_code: text("unit_code").notNull(),
      group_id: uuid("group_id"),
      measured_at: timestamp("measured_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      recorded_by: uuid("recorded_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      supersedes_id: uuid("supersedes_id").references(
        (): AnyPgColumn => vitalObservation.id,
        { onDelete: "restrict" }
      ),
      void_reason: text("void_reason"),
    },
    (table) => [
      uniqueIndex("vital_observation_uq_1").on(table.supersedes_id),
      index("vital_observation_consultation_id_idx").on(table.consultation_id),
      index("vital_observation_recorded_by_idx").on(table.recorded_by),
      index("vital_observation_supersedes_id_idx").on(table.supersedes_id),
    ]
  )
  .enableRLS();
export type VitalObservation = typeof vitalObservation.$inferSelect;
export type NewVitalObservation = typeof vitalObservation.$inferInsert;

export const clinicalNote = clinzo
  .table(
    "clinical_note",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      consultation_id: uuid("consultation_id")
        .notNull()
        .references((): AnyPgColumn => consultation.id, {
          onDelete: "restrict",
        }),
      author_id: uuid("author_id")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      kind: text("kind", {
        enum: ["assessment", "advice", "addendum", "correction"],
      }).notNull(),
      body: text("body").notNull(),
      signed_at: timestamp("signed_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      supersedes_id: uuid("supersedes_id").references(
        (): AnyPgColumn => clinicalNote.id,
        { onDelete: "restrict" }
      ),
    },
    (table) => [
      index("clinical_note_consultation_id_idx").on(table.consultation_id),
      index("clinical_note_author_id_idx").on(table.author_id),
      index("clinical_note_supersedes_id_idx").on(table.supersedes_id),
      check(
        "clinical_note_ck_1",
        sql.raw(
          "\"kind\" IN ('assessment', 'advice', 'addendum', 'correction')"
        )
      ),
    ]
  )
  .enableRLS();
export type ClinicalNote = typeof clinicalNote.$inferSelect;
export type NewClinicalNote = typeof clinicalNote.$inferInsert;

export const consultationDiagnosis = clinzo
  .table(
    "consultation_diagnosis",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      consultation_id: uuid("consultation_id")
        .notNull()
        .references((): AnyPgColumn => consultation.id, {
          onDelete: "restrict",
        }),
      coding_system: text("coding_system"),
      code: text("code"),
      description: text("description").notNull(),
      is_primary: boolean("is_primary").notNull().default(false),
      recorded_by: uuid("recorded_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      supersedes_id: uuid("supersedes_id").references(
        (): AnyPgColumn => consultationDiagnosis.id,
        { onDelete: "restrict" }
      ),
    },
    (table) => [
      index("consultation_diagnosis_consultation_id_idx").on(
        table.consultation_id
      ),
      index("consultation_diagnosis_recorded_by_idx").on(table.recorded_by),
      index("consultation_diagnosis_supersedes_id_idx").on(table.supersedes_id),
      check(
        "consultation_diagnosis_ck_1",
        sql.raw("(code IS NULL) = (coding_system IS NULL)")
      ),
    ]
  )
  .enableRLS();
export type ConsultationDiagnosis = typeof consultationDiagnosis.$inferSelect;
export type NewConsultationDiagnosis =
  typeof consultationDiagnosis.$inferInsert;

export const clinicalAttachment = clinzo
  .table(
    "clinical_attachment",
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
      consultation_id: uuid("consultation_id")
        .notNull()
        .references((): AnyPgColumn => consultation.id, {
          onDelete: "restrict",
        }),
      uploaded_by: uuid("uploaded_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      storage_key: text("storage_key").notNull(),
      mime_type: text("mime_type").notNull(),
      size_bytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
      sha256: bytea("sha256").notNull(),
      scan_status: text("scan_status", {
        enum: ["pending", "clean", "quarantined"],
      }).notNull(),
    },
    (table) => [
      uniqueIndex("clinical_attachment_uq_1").on(table.storage_key),
      index("clinical_attachment_consultation_id_idx").on(
        table.consultation_id
      ),
      index("clinical_attachment_uploaded_by_idx").on(table.uploaded_by),
      check("clinical_attachment_ck_1", sql.raw("size_bytes > 0")),
      check("clinical_attachment_ck_2", sql.raw("row_version > 0")),
      check(
        "clinical_attachment_ck_3",
        sql.raw("\"scan_status\" IN ('pending', 'clean', 'quarantined')")
      ),
    ]
  )
  .enableRLS();
export type ClinicalAttachment = typeof clinicalAttachment.$inferSelect;
export type NewClinicalAttachment = typeof clinicalAttachment.$inferInsert;

export const followupRecommendation = clinzo
  .table(
    "followup_recommendation",
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
      consultation_id: uuid("consultation_id")
        .notNull()
        .references((): AnyPgColumn => consultation.id, {
          onDelete: "restrict",
        }),
      recommended_by: uuid("recommended_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      recommended_date: date("recommended_date", { mode: "string" }).notNull(),
      timezone: text("timezone").notNull(),
      reason: text("reason").notNull(),
      status: text("status", {
        enum: ["active", "withdrawn", "fulfilled"],
      }).notNull(),
      booked_appointment_id: uuid("booked_appointment_id").references(
        (): AnyPgColumn => appointment.id,
        { onDelete: "restrict" }
      ),
    },
    (table) => [
      index("followup_recommendation_consultation_id_idx").on(
        table.consultation_id
      ),
      index("followup_recommendation_recommended_by_idx").on(
        table.recommended_by
      ),
      index("followup_recommendation_booked_appointment_id_idx").on(
        table.booked_appointment_id
      ),
      check("followup_recommendation_ck_1", sql.raw("row_version > 0")),
      check(
        "followup_recommendation_ck_2",
        sql.raw("\"status\" IN ('active', 'withdrawn', 'fulfilled')")
      ),
    ]
  )
  .enableRLS();
export type FollowupRecommendation = typeof followupRecommendation.$inferSelect;
export type NewFollowupRecommendation =
  typeof followupRecommendation.$inferInsert;
