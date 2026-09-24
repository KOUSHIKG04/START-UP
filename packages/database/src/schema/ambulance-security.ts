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
import { driver } from "./ambulance-workforce";
import { patient } from "./identity";
import { trip } from "./trips";

export const patientAmbulancePin = clinzo
  .table(
    "patient_ambulance_pin",
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
      verifier: text("verifier").notNull(),
      pepper_key_id: text("pepper_key_id").notNull(),
      vault_secret_id: uuid("vault_secret_id").notNull(),
      credential_version: integer("credential_version").notNull(),
      failed_attempts: integer("failed_attempts").notNull().default(0),
      locked_until: timestamp("locked_until", {
        withTimezone: true,
        mode: "date",
      }),
      last_changed_at: timestamp("last_changed_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
    },
    (table) => [
      uniqueIndex("patient_ambulance_pin_uq_1").on(table.patient_id),
      uniqueIndex("patient_ambulance_pin_vault_secret_id_key").on(table.vault_secret_id),
      index("patient_ambulance_pin_patient_id_idx").on(table.patient_id),
      check(
        "patient_ambulance_pin_ck_1",
        sql.raw("credential_version > 0 AND failed_attempts >= 0")
      ),
      check("patient_ambulance_pin_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type PatientAmbulancePin = typeof patientAmbulancePin.$inferSelect;
export type NewPatientAmbulancePin = typeof patientAmbulancePin.$inferInsert;

export const pinAttempt = clinzo
  .table(
    "pin_attempt",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      trip_id: uuid("trip_id")
        .notNull()
        .references((): AnyPgColumn => trip.id, { onDelete: "restrict" }),
      driver_id: uuid("driver_id")
        .notNull()
        .references((): AnyPgColumn => driver.id, { onDelete: "restrict" }),
      credential_version: integer("credential_version"),
      outcome: text("outcome", {
        enum: ["success", "invalid", "throttled", "stale", "forbidden"],
      }).notNull(),
      request_id: uuid("request_id").notNull(),
    },
    (table) => [
      index("pin_attempt_trip_id_idx").on(table.trip_id),
      index("pin_attempt_driver_id_idx").on(table.driver_id),
      check(
        "pin_attempt_ck_1",
        sql.raw(
          "\"outcome\" IN ('success', 'invalid', 'throttled', 'stale', 'forbidden')"
        )
      ),
    ]
  )
  .enableRLS();
export type PinAttempt = typeof pinAttempt.$inferSelect;
export type NewPinAttempt = typeof pinAttempt.$inferInsert;
