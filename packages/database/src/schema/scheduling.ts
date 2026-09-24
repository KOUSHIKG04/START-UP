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
import { doctor, doctorFacility, practiceService } from "./directory";

export const scheduleRule = clinzo
  .table(
    "schedule_rule",
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
      version: integer("version").notNull(),
      family_id: uuid("family_id").notNull(),
      effective_from: date("effective_from", { mode: "string" }).notNull(),
      effective_until: date("effective_until", { mode: "string" }),
      iso_weekdays: smallint("iso_weekdays").array().notNull(),
      local_start: time("local_start").notNull(),
      local_end: time("local_end").notNull(),
      window_minutes: smallint("window_minutes").notNull(),
      window_capacity: integer("window_capacity").notNull(),
      session_capacity: integer("session_capacity").notNull(),
      auto_confirm_limit: integer("auto_confirm_limit"),
      timezone: text("timezone").notNull(),
      state: text("state", {
        enum: ["draft", "published", "retired"],
      }).notNull(),
    },
    (table) => [
      uniqueIndex("schedule_rule_uq_1").on(table.family_id, table.version),
      index("schedule_rule_doctor_facility_id_idx").on(
        table.doctor_facility_id
      ),
      check(
        "schedule_rule_ck_1",
        sql.raw(
          "version > 0 AND window_minutes > 0 AND window_capacity > 0 AND session_capacity > 0"
        )
      ),
      check(
        "schedule_rule_ck_2",
        sql.raw("auto_confirm_limit IS NULL OR auto_confirm_limit >= 0")
      ),
      check(
        "schedule_rule_ck_3",
        sql.raw("effective_until IS NULL OR effective_until >= effective_from")
      ),
      check("schedule_rule_ck_4", sql.raw("local_start < local_end")),
      check(
        "schedule_rule_ck_5",
        sql.raw(
          "cardinality(iso_weekdays) BETWEEN 1 AND 7 AND iso_weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[]"
        )
      ),
      check("schedule_rule_ck_6", sql.raw("row_version > 0")),
      check(
        "schedule_rule_ck_7",
        sql.raw("\"state\" IN ('draft', 'published', 'retired')")
      ),
    ]
  )
  .enableRLS();
export type ScheduleRule = typeof scheduleRule.$inferSelect;
export type NewScheduleRule = typeof scheduleRule.$inferInsert;

export const scheduleBreak = clinzo
  .table(
    "schedule_break",
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
      schedule_rule_id: uuid("schedule_rule_id")
        .notNull()
        .references((): AnyPgColumn => scheduleRule.id, {
          onDelete: "restrict",
        }),
      local_start: time("local_start").notNull(),
      local_end: time("local_end").notNull(),
    },
    (table) => [
      index("schedule_break_schedule_rule_id_idx").on(table.schedule_rule_id),
      check("schedule_break_ck_1", sql.raw("local_start < local_end")),
      check("schedule_break_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type ScheduleBreak = typeof scheduleBreak.$inferSelect;
export type NewScheduleBreak = typeof scheduleBreak.$inferInsert;

export const scheduleException = clinzo
  .table(
    "schedule_exception",
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
      doctor_facility_id: uuid("doctor_facility_id").references(
        (): AnyPgColumn => doctorFacility.id,
        { onDelete: "restrict" }
      ),
      starts_at: timestamp("starts_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      ends_at: timestamp("ends_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      reason: text("reason").notNull(),
      state: text("state", { enum: ["active", "revoked"] }).notNull(),
    },
    (table) => [
      index("schedule_exception_doctor_id_idx").on(table.doctor_id),
      index("schedule_exception_doctor_facility_id_idx").on(
        table.doctor_facility_id
      ),
      check("schedule_exception_ck_1", sql.raw("starts_at < ends_at")),
      check("schedule_exception_ck_2", sql.raw("row_version > 0")),
      check(
        "schedule_exception_ck_3",
        sql.raw("\"state\" IN ('active', 'revoked')")
      ),
    ]
  )
  .enableRLS();
export type ScheduleException = typeof scheduleException.$inferSelect;
export type NewScheduleException = typeof scheduleException.$inferInsert;

export const doctorBookingDay = clinzo
  .table(
    "doctor_booking_day",
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
      local_date: date("local_date", { mode: "string" }).notNull(),
      timezone: text("timezone").notNull(),
      auto_confirm_limit: integer("auto_confirm_limit"),
    },
    (table) => [
      uniqueIndex("doctor_booking_day_uq_1").on(
        table.doctor_id,
        table.local_date
      ),
      uniqueIndex("doctor_booking_day_uq_2").on(table.id, table.doctor_id),
      index("doctor_booking_day_doctor_id_idx").on(table.doctor_id),
      check(
        "doctor_booking_day_ck_1",
        sql.raw("auto_confirm_limit IS NULL OR auto_confirm_limit >= 0")
      ),
      check("doctor_booking_day_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type DoctorBookingDay = typeof doctorBookingDay.$inferSelect;
export type NewDoctorBookingDay = typeof doctorBookingDay.$inferInsert;

export const session = clinzo
  .table(
    "session",
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
      doctor_id: uuid("doctor_id")
        .notNull()
        .references((): AnyPgColumn => doctor.id, { onDelete: "restrict" }),
      booking_day_id: uuid("booking_day_id")
        .notNull()
        .references((): AnyPgColumn => doctorBookingDay.id, {
          onDelete: "restrict",
        }),
      schedule_rule_id: uuid("schedule_rule_id").references(
        (): AnyPgColumn => scheduleRule.id,
        { onDelete: "restrict" }
      ),
      starts_at: timestamp("starts_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      ends_at: timestamp("ends_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      timezone: text("timezone").notNull(),
      hard_capacity: integer("hard_capacity").notNull(),
      auto_confirm_limit: integer("auto_confirm_limit"),
      room_label: text("room_label"),
      state: text("state", {
        enum: ["published", "open", "closed", "cancelled"],
      }).notNull(),
    },
    (table) => [
      uniqueIndex("session_uq_1").on(table.doctor_facility_id, table.starts_at),
      index("session_doctor_facility_id_idx").on(table.doctor_facility_id),
      index("session_doctor_id_idx").on(table.doctor_id),
      index("session_booking_day_id_idx").on(table.booking_day_id),
      index("session_schedule_rule_id_idx").on(table.schedule_rule_id),
      check(
        "session_ck_1",
        sql.raw("starts_at < ends_at AND hard_capacity > 0")
      ),
      check(
        "session_ck_2",
        sql.raw("auto_confirm_limit IS NULL OR auto_confirm_limit >= 0")
      ),
      check("session_ck_3", sql.raw("row_version > 0")),
      check(
        "session_ck_4",
        sql.raw("\"state\" IN ('published', 'open', 'closed', 'cancelled')")
      ),
      foreignKey({
        name: "session_composite_fk_1",
        columns: [table.doctor_facility_id, table.doctor_id],
        foreignColumns: [doctorFacility.id, doctorFacility.doctor_id],
      }).onDelete("restrict"),
      foreignKey({
        name: "session_composite_fk_2",
        columns: [table.booking_day_id, table.doctor_id],
        foreignColumns: [doctorBookingDay.id, doctorBookingDay.doctor_id],
      }).onDelete("restrict"),
    ]
  )
  .enableRLS();
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export const sessionService = clinzo
  .table(
    "session_service",
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
      session_id: uuid("session_id")
        .notNull()
        .references((): AnyPgColumn => session.id, { onDelete: "restrict" }),
      practice_service_id: uuid("practice_service_id")
        .notNull()
        .references((): AnyPgColumn => practiceService.id, {
          onDelete: "restrict",
        }),
    },
    (table) => [
      uniqueIndex("session_service_uq_1").on(
        table.session_id,
        table.practice_service_id
      ),
      index("session_service_session_id_idx").on(table.session_id),
      index("session_service_practice_service_id_idx").on(
        table.practice_service_id
      ),
      check("session_service_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type SessionService = typeof sessionService.$inferSelect;
export type NewSessionService = typeof sessionService.$inferInsert;

export const appointmentWindow = clinzo
  .table(
    "appointment_window",
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
      session_id: uuid("session_id")
        .notNull()
        .references((): AnyPgColumn => session.id, { onDelete: "restrict" }),
      starts_at: timestamp("starts_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      ends_at: timestamp("ends_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      hard_capacity: integer("hard_capacity").notNull(),
      state: text("state", { enum: ["open", "blocked"] }).notNull(),
    },
    (table) => [
      uniqueIndex("appointment_window_uq_1").on(
        table.session_id,
        table.starts_at
      ),
      uniqueIndex("appointment_window_uq_2").on(table.id, table.session_id),
      index("appointment_window_session_id_idx").on(table.session_id),
      check(
        "appointment_window_ck_1",
        sql.raw("starts_at < ends_at AND hard_capacity > 0")
      ),
      check("appointment_window_ck_2", sql.raw("row_version > 0")),
      check(
        "appointment_window_ck_3",
        sql.raw("\"state\" IN ('open', 'blocked')")
      ),
    ]
  )
  .enableRLS();
export type AppointmentWindow = typeof appointmentWindow.$inferSelect;
export type NewAppointmentWindow = typeof appointmentWindow.$inferInsert;
