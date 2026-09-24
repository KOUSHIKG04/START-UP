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
import { consultation } from "./clinical";
import { identity, patient } from "./identity";

export const prescription = clinzo
  .table(
    "prescription",
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
      public_code: text("public_code").notNull(),
    },
    (table) => [
      uniqueIndex("prescription_uq_1").on(table.public_code),
      index("prescription_consultation_id_idx").on(table.consultation_id),
    ]
  )
  .enableRLS();
export type Prescription = typeof prescription.$inferSelect;
export type NewPrescription = typeof prescription.$inferInsert;

export const prescriptionRevision = clinzo
  .table(
    "prescription_revision",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      prescription_id: uuid("prescription_id")
        .notNull()
        .references((): AnyPgColumn => prescription.id, {
          onDelete: "restrict",
        }),
      revision_number: integer("revision_number").notNull(),
      supersedes_id: uuid("supersedes_id").references(
        (): AnyPgColumn => prescriptionRevision.id,
        { onDelete: "restrict" }
      ),
      signed_by: uuid("signed_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      signed_at: timestamp("signed_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      action: text("action", {
        enum: ["issue", "replace", "discontinue"],
      }).notNull(),
      reason: text("reason"),
    },
    (table) => [
      uniqueIndex("prescription_revision_uq_1").on(
        table.prescription_id,
        table.revision_number
      ),
      uniqueIndex("prescription_revision_uq_2").on(table.supersedes_id),
      index("prescription_revision_prescription_id_idx").on(
        table.prescription_id
      ),
      index("prescription_revision_supersedes_id_idx").on(table.supersedes_id),
      index("prescription_revision_signed_by_idx").on(table.signed_by),
      check("prescription_revision_ck_1", sql.raw("revision_number > 0")),
      check(
        "prescription_revision_ck_2",
        sql.raw(
          "action='issue' OR (reason IS NOT NULL AND length(trim(reason)) > 0)"
        )
      ),
      check(
        "prescription_revision_ck_3",
        sql.raw("\"action\" IN ('issue', 'replace', 'discontinue')")
      ),
    ]
  )
  .enableRLS();
export type PrescriptionRevision = typeof prescriptionRevision.$inferSelect;
export type NewPrescriptionRevision = typeof prescriptionRevision.$inferInsert;

export const prescriptionItem = clinzo
  .table(
    "prescription_item",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      revision_id: uuid("revision_id")
        .notNull()
        .references((): AnyPgColumn => prescriptionRevision.id, {
          onDelete: "restrict",
        }),
      line_number: smallint("line_number").notNull(),
      medicine_name: text("medicine_name").notNull(),
      medicine_code_system: text("medicine_code_system"),
      medicine_code: text("medicine_code"),
      strength: text("strength").notNull(),
      form: text("form").notNull(),
      route: text("route").notNull(),
      instructions: text("instructions").notNull(),
    },
    (table) => [
      uniqueIndex("prescription_item_uq_1").on(
        table.revision_id,
        table.line_number
      ),
      index("prescription_item_revision_id_idx").on(table.revision_id),
      check("prescription_item_ck_1", sql.raw("line_number > 0")),
      check(
        "prescription_item_ck_2",
        sql.raw("(medicine_code IS NULL) = (medicine_code_system IS NULL)")
      ),
    ]
  )
  .enableRLS();
export type PrescriptionItem = typeof prescriptionItem.$inferSelect;
export type NewPrescriptionItem = typeof prescriptionItem.$inferInsert;

export const medicationPhase = clinzo
  .table(
    "medication_phase",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      prescription_item_id: uuid("prescription_item_id")
        .notNull()
        .references((): AnyPgColumn => prescriptionItem.id, {
          onDelete: "restrict",
        }),
      phase_number: smallint("phase_number").notNull(),
      dose_quantity: numeric("dose_quantity", {
        precision: 10,
        scale: 3,
      }).notNull(),
      dose_unit: text("dose_unit").notNull(),
      starts_on: date("starts_on", { mode: "string" }).notNull(),
      ends_on: date("ends_on", { mode: "string" }),
      frequency_kind: text("frequency_kind", {
        enum: ["daily_times", "interval", "as_needed"],
      }).notNull(),
      interval_minutes: integer("interval_minutes"),
      anchor_at: timestamp("anchor_at", { withTimezone: true, mode: "date" }),
      timezone: text("timezone").notNull(),
      max_doses_per_day: smallint("max_doses_per_day"),
    },
    (table) => [
      uniqueIndex("medication_phase_uq_1").on(
        table.prescription_item_id,
        table.phase_number
      ),
      index("medication_phase_prescription_item_id_idx").on(
        table.prescription_item_id
      ),
      check(
        "medication_phase_ck_1",
        sql.raw("phase_number > 0 AND dose_quantity > 0")
      ),
      check(
        "medication_phase_ck_2",
        sql.raw("ends_on IS NULL OR ends_on >= starts_on")
      ),
      check(
        "medication_phase_ck_3",
        sql.raw("max_doses_per_day IS NULL OR max_doses_per_day > 0")
      ),
      check(
        "medication_phase_ck_4",
        sql.raw(
          "(frequency_kind='interval' AND interval_minutes IS NOT NULL AND interval_minutes>0 AND anchor_at IS NOT NULL) OR (frequency_kind <> 'interval' AND interval_minutes IS NULL AND anchor_at IS NULL)"
        )
      ),
      check(
        "medication_phase_ck_5",
        sql.raw(
          "\"frequency_kind\" IN ('daily_times', 'interval', 'as_needed')"
        )
      ),
    ]
  )
  .enableRLS();
export type MedicationPhase = typeof medicationPhase.$inferSelect;
export type NewMedicationPhase = typeof medicationPhase.$inferInsert;

export const medicationTiming = clinzo
  .table(
    "medication_timing",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      phase_id: uuid("phase_id")
        .notNull()
        .references((): AnyPgColumn => medicationPhase.id, {
          onDelete: "restrict",
        }),
      sequence: smallint("sequence").notNull(),
      local_time: time("local_time"),
      meal_anchor: text("meal_anchor", {
        enum: ["breakfast", "lunch", "dinner", "bedtime"],
      }),
      meal_relation: text("meal_relation", {
        enum: ["before", "with", "after", "independent"],
      }).notNull(),
      offset_minutes: smallint("offset_minutes").notNull().default(0),
    },
    (table) => [
      uniqueIndex("medication_timing_uq_1").on(table.phase_id, table.sequence),
      index("medication_timing_phase_id_idx").on(table.phase_id),
      check("medication_timing_ck_1", sql.raw("sequence > 0")),
      check(
        "medication_timing_ck_2",
        sql.raw("(local_time IS NULL) <> (meal_anchor IS NULL)")
      ),
      check(
        "medication_timing_ck_3",
        sql.raw(
          "\"meal_anchor\" IN ('breakfast', 'lunch', 'dinner', 'bedtime')"
        )
      ),
      check(
        "medication_timing_ck_4",
        sql.raw(
          "\"meal_relation\" IN ('before', 'with', 'after', 'independent')"
        )
      ),
    ]
  )
  .enableRLS();
export type MedicationTiming = typeof medicationTiming.$inferSelect;
export type NewMedicationTiming = typeof medicationTiming.$inferInsert;

export const patientRoutine = clinzo
  .table(
    "patient_routine",
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
      anchor: text("anchor", {
        enum: ["breakfast", "lunch", "dinner", "bedtime"],
      }).notNull(),
      local_time: time("local_time").notNull(),
      timezone: text("timezone").notNull(),
    },
    (table) => [
      uniqueIndex("patient_routine_uq_1").on(table.patient_id, table.anchor),
      index("patient_routine_patient_id_idx").on(table.patient_id),
      check("patient_routine_ck_1", sql.raw("row_version > 0")),
      check(
        "patient_routine_ck_2",
        sql.raw("\"anchor\" IN ('breakfast', 'lunch', 'dinner', 'bedtime')")
      ),
    ]
  )
  .enableRLS();
export type PatientRoutine = typeof patientRoutine.$inferSelect;
export type NewPatientRoutine = typeof patientRoutine.$inferInsert;
