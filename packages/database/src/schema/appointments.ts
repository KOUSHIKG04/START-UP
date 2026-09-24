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
import { practiceService } from "./directory";
import { identity, patient } from "./identity";
import { appointmentWindow, session, sessionService } from "./scheduling";

export const appointment = clinzo
  .table(
    "appointment",
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
      patient_id: uuid("patient_id")
        .notNull()
        .references((): AnyPgColumn => patient.id, { onDelete: "restrict" }),
      session_id: uuid("session_id")
        .notNull()
        .references((): AnyPgColumn => session.id, { onDelete: "restrict" }),
      window_id: uuid("window_id")
        .notNull()
        .references((): AnyPgColumn => appointmentWindow.id, {
          onDelete: "restrict",
        }),
      practice_service_id: uuid("practice_service_id")
        .notNull()
        .references((): AnyPgColumn => practiceService.id, {
          onDelete: "restrict",
        }),
      source: text("source", {
        enum: [
          "patient_online",
          "reception_walk_in",
          "staff_booking",
          "offline_sync",
        ],
      }).notNull(),
      status: text("status", {
        enum: [
          "pending",
          "confirmed",
          "in_consultation",
          "completed",
          "rejected",
          "cancelled",
          "no_show",
        ],
      }).notNull(),
      requested_by: uuid("requested_by").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
      reason: text("reason"),
      visit_mode: text("visit_mode", { enum: ["clinic", "online", "home"] }).notNull().default("clinic"),
      confirmed_at: timestamp("confirmed_at", {
        withTimezone: true,
        mode: "date",
      }),
      capacity_released_at: timestamp("capacity_released_at", {
        withTimezone: true,
        mode: "date",
      }),
      request_expires_at: timestamp("request_expires_at", {
        withTimezone: true,
        mode: "date",
      }),
      decision_by: uuid("decision_by").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
      decision_reason: text("decision_reason"),
      replaces_appointment_id: uuid("replaces_appointment_id").references(
        (): AnyPgColumn => appointment.id,
        { onDelete: "restrict" }
      ),
      fee_minor: bigint("fee_minor", { mode: "bigint" }).notNull(),
      currency: char("currency", { length: 3 }).notNull(),
      doctor_name_snapshot: text("doctor_name_snapshot").notNull(),
      facility_name_snapshot: text("facility_name_snapshot").notNull(),
      facility_address_snapshot: text("facility_address_snapshot").notNull(),
      service_name_snapshot: text("service_name_snapshot").notNull(),
      doctor_registration_snapshot: text(
        "doctor_registration_snapshot"
      ).notNull(),
    },
    (table) => [
      uniqueIndex("appointment_uq_1").on(table.public_code),
      uniqueIndex("appointment_uq_2").on(table.replaces_appointment_id),
      uniqueIndex("appointment_active_uq_1")
        .on(table.patient_id, table.session_id)
        .where(
          sql.raw(
            "status IN ('pending','confirmed','in_consultation','completed','no_show')"
          )
        ),
      index("appointment_patient_id_idx").on(table.patient_id),
      index("appointment_session_id_idx").on(table.session_id),
      index("appointment_window_id_idx").on(table.window_id),
      index("appointment_practice_service_id_idx").on(
        table.practice_service_id
      ),
      index("appointment_requested_by_idx").on(table.requested_by),
      index("appointment_decision_by_idx").on(table.decision_by),
      index("appointment_replaces_appointment_id_idx").on(
        table.replaces_appointment_id
      ),
      check("appointment_ck_1", sql.raw("fee_minor >= 0")),
      check("appointment_visit_mode_ck", sql.raw("visit_mode IN ('clinic','online','home')")),
      check("appointment_reason_ck", sql.raw("reason IS NULL OR length(trim(reason)) BETWEEN 1 AND 1000")),
      check(
        "appointment_ck_2",
        sql.raw(
          "status NOT IN ('confirmed','in_consultation','completed','no_show') OR confirmed_at IS NOT NULL"
        )
      ),
      check(
        "appointment_ck_3",
        sql.raw(
          "capacity_released_at IS NULL OR (status='cancelled' AND confirmed_at IS NOT NULL)"
        )
      ),
      check(
        "appointment_ck_4",
        sql.raw(
          "status <> 'pending' OR (confirmed_at IS NULL AND request_expires_at IS NOT NULL)"
        )
      ),
      check("appointment_ck_5", sql.raw("row_version > 0")),
      check(
        "appointment_ck_6",
        sql.raw(
          "\"source\" IN ('patient_online', 'reception_walk_in', 'staff_booking', 'offline_sync')"
        )
      ),
      check(
        "appointment_ck_7",
        sql.raw(
          "\"status\" IN ('pending', 'confirmed', 'in_consultation', 'completed', 'rejected', 'cancelled', 'no_show')"
        )
      ),
      check("appointment_ck_8", sql.raw("currency ~ '^[A-Z]{3}$'")),
      foreignKey({
        name: "appointment_composite_fk_1",
        columns: [table.window_id, table.session_id],
        foreignColumns: [appointmentWindow.id, appointmentWindow.session_id],
      }).onDelete("restrict"),
      foreignKey({
        name: "appointment_composite_fk_2",
        columns: [table.session_id, table.practice_service_id],
        foreignColumns: [
          sessionService.session_id,
          sessionService.practice_service_id,
        ],
      }).onDelete("restrict"),
    ]
  )
  .enableRLS();
export type Appointment = typeof appointment.$inferSelect;
export type NewAppointment = typeof appointment.$inferInsert;

export const checkinToken = clinzo
  .table(
    "checkin_token",
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
      token_hash: bytea("token_hash").notNull(),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      consumed_at: timestamp("consumed_at", {
        withTimezone: true,
        mode: "date",
      }),
      revoked_at: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      uniqueIndex("checkin_token_uq_1").on(table.token_hash),
      index("checkin_token_appointment_id_idx").on(table.appointment_id),
      check("checkin_token_ck_1", sql.raw("expires_at > created_at")),
      check("checkin_token_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type CheckinToken = typeof checkinToken.$inferSelect;
export type NewCheckinToken = typeof checkinToken.$inferInsert;

export const appointmentCheckin = clinzo
  .table(
    "appointment_checkin",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      appointment_id: uuid("appointment_id")
        .notNull()
        .references((): AnyPgColumn => appointment.id, {
          onDelete: "restrict",
        }),
      token_id: uuid("token_id").references(
        (): AnyPgColumn => checkinToken.id,
        { onDelete: "restrict" }
      ),
      checked_in_by: uuid("checked_in_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      method: text("method", { enum: ["qr", "manual"] }).notNull(),
      reason: text("reason"),
    },
    (table) => [
      uniqueIndex("appointment_checkin_uq_1").on(table.appointment_id),
      uniqueIndex("appointment_checkin_uq_2").on(table.token_id),
      index("appointment_checkin_appointment_id_idx").on(table.appointment_id),
      index("appointment_checkin_token_id_idx").on(table.token_id),
      index("appointment_checkin_checked_in_by_idx").on(table.checked_in_by),
      check(
        "appointment_checkin_ck_1",
        sql.raw(
          "(method='qr' AND token_id IS NOT NULL) OR (method='manual' AND token_id IS NULL AND length(trim(reason)) > 0 AND reason IS NOT NULL)"
        )
      ),
      check(
        "appointment_checkin_ck_2",
        sql.raw("\"method\" IN ('qr', 'manual')")
      ),
    ]
  )
  .enableRLS();
export type AppointmentCheckin = typeof appointmentCheckin.$inferSelect;
export type NewAppointmentCheckin = typeof appointmentCheckin.$inferInsert;
