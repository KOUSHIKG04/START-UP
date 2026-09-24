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
import { ambulanceBooking } from "./ambulance-bookings";
import { identity } from "./identity";
import { facility } from "./organizations";
import { trip } from "./trips";

export const guestEmergencySession = clinzo
  .table(
    "guest_emergency_session",
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
      token_hash: bytea("token_hash").notNull(),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      verified_contact: text("verified_contact"),
      claimed_identity_id: uuid("claimed_identity_id").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
      revoked_at: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      uniqueIndex("guest_emergency_session_uq_1").on(table.token_hash),
      index("guest_emergency_session_claimed_identity_id_idx").on(
        table.claimed_identity_id
      ),
      check("guest_emergency_session_ck_1", sql.raw("expires_at > created_at")),
      check("guest_emergency_session_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type GuestEmergencySession = typeof guestEmergencySession.$inferSelect;
export type NewGuestEmergencySession =
  typeof guestEmergencySession.$inferInsert;

export const emergencyCase = clinzo
  .table(
    "emergency_case",
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
      booking_id: uuid("booking_id")
        .notNull()
        .references((): AnyPgColumn => ambulanceBooking.id, {
          onDelete: "restrict",
        }),
      reported_summary: text("reported_summary").notNull(),
      opened_at: timestamp("opened_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      closed_at: timestamp("closed_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      uniqueIndex("emergency_case_uq_1").on(table.booking_id),
      index("emergency_case_booking_id_idx").on(table.booking_id),
      check("emergency_case_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type EmergencyCase = typeof emergencyCase.$inferSelect;
export type NewEmergencyCase = typeof emergencyCase.$inferInsert;

export const triageObservation = clinzo
  .table(
    "triage_observation",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      emergency_case_id: uuid("emergency_case_id")
        .notNull()
        .references((): AnyPgColumn => emergencyCase.id, {
          onDelete: "restrict",
        }),
      recorded_by: uuid("recorded_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      observed_at: timestamp("observed_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      severity: text("severity").notNull(),
      assessment: text("assessment").notNull(),
      suggested_facility_id: uuid("suggested_facility_id").references(
        (): AnyPgColumn => facility.id,
        { onDelete: "restrict" }
      ),
    },
    (table) => [
      index("triage_observation_emergency_case_id_idx").on(
        table.emergency_case_id
      ),
      index("triage_observation_recorded_by_idx").on(table.recorded_by),
      index("triage_observation_suggested_facility_id_idx").on(
        table.suggested_facility_id
      ),
    ]
  )
  .enableRLS();
export type TriageObservation = typeof triageObservation.$inferSelect;
export type NewTriageObservation = typeof triageObservation.$inferInsert;

export const emergencyStartOverride = clinzo
  .table(
    "emergency_start_override",
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
      trip_id: uuid("trip_id")
        .notNull()
        .references((): AnyPgColumn => trip.id, { onDelete: "restrict" }),
      approved_by: uuid("approved_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      reason: text("reason").notNull(),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      consumed_at: timestamp("consumed_at", {
        withTimezone: true,
        mode: "date",
      }),
    },
    (table) => [
      uniqueIndex("emergency_start_override_uq_1").on(table.trip_id),
      index("emergency_start_override_trip_id_idx").on(table.trip_id),
      index("emergency_start_override_approved_by_idx").on(table.approved_by),
      check(
        "emergency_start_override_ck_1",
        sql.raw("expires_at > created_at")
      ),
      check("emergency_start_override_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type EmergencyStartOverride = typeof emergencyStartOverride.$inferSelect;
export type NewEmergencyStartOverride =
  typeof emergencyStartOverride.$inferInsert;
