// Server-only Drizzle models. Never import into a web/mobile client bundle.
import { sql } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";
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
import { followupRecommendation } from "./clinical";
import { identity, patient } from "./identity";
import { domainEvent } from "./infrastructure";
import { medicationPhase, medicationTiming } from "./prescriptions";

export const reminderSchedule = clinzo
  .table(
    "reminder_schedule",
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
      phase_id: uuid("phase_id").references(
        (): AnyPgColumn => medicationPhase.id,
        { onDelete: "restrict" }
      ),
      timing_id: uuid("timing_id").references(
        (): AnyPgColumn => medicationTiming.id,
        { onDelete: "restrict" }
      ),
      followup_id: uuid("followup_id").references(
        (): AnyPgColumn => followupRecommendation.id,
        { onDelete: "restrict" }
      ),
      generation: integer("generation").notNull(),
      timezone: text("timezone").notNull(),
      resolved_local_time: time("resolved_local_time"),
      next_due_at: timestamp("next_due_at", {
        withTimezone: true,
        mode: "date",
      }),
      status: text("status", {
        enum: ["active", "paused", "superseded", "completed"],
      }).notNull(),
    },
    (table) => [
      unique("reminder_schedule_uq_1")
        .on(
          table.phase_id,
          table.timing_id,
          table.followup_id,
          table.generation
        )
        .nullsNotDistinct(),
      index("reminder_schedule_patient_id_idx").on(table.patient_id),
      index("reminder_schedule_phase_id_idx").on(table.phase_id),
      index("reminder_schedule_timing_id_idx").on(table.timing_id),
      index("reminder_schedule_followup_id_idx").on(table.followup_id),
      check("reminder_schedule_ck_1", sql.raw("generation > 0")),
      check(
        "reminder_schedule_ck_2",
        sql.raw("(phase_id IS NULL) <> (followup_id IS NULL)")
      ),
      check(
        "reminder_schedule_ck_3",
        sql.raw("timing_id IS NULL OR phase_id IS NOT NULL")
      ),
      check("reminder_schedule_ck_4", sql.raw("row_version > 0")),
      check(
        "reminder_schedule_ck_5",
        sql.raw("\"status\" IN ('active', 'paused', 'superseded', 'completed')")
      ),
    ]
  )
  .enableRLS();
export type ReminderSchedule = typeof reminderSchedule.$inferSelect;
export type NewReminderSchedule = typeof reminderSchedule.$inferInsert;

export const reminderOccurrence = clinzo
  .table(
    "reminder_occurrence",
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
      schedule_id: uuid("schedule_id")
        .notNull()
        .references((): AnyPgColumn => reminderSchedule.id, {
          onDelete: "restrict",
        }),
      due_at: timestamp("due_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      local_occurrence_key: text("local_occurrence_key").notNull(),
      status: text("status", {
        enum: ["pending", "emitted", "cancelled", "expired"],
      }).notNull(),
      emitted_at: timestamp("emitted_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      uniqueIndex("reminder_occurrence_uq_1").on(
        table.schedule_id,
        table.local_occurrence_key
      ),
      index("reminder_occurrence_schedule_id_idx").on(table.schedule_id),
      check("reminder_occurrence_ck_1", sql.raw("row_version > 0")),
      check(
        "reminder_occurrence_ck_2",
        sql.raw("\"status\" IN ('pending', 'emitted', 'cancelled', 'expired')")
      ),
    ]
  )
  .enableRLS();
export type ReminderOccurrence = typeof reminderOccurrence.$inferSelect;
export type NewReminderOccurrence = typeof reminderOccurrence.$inferInsert;

export const notificationPreference = clinzo
  .table(
    "notification_preference",
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
      channel: text("channel", {
        enum: ["push", "sms", "email", "in_app"],
      }).notNull(),
      category: text("category", {
        enum: ["appointments", "medication", "followup", "trips", "marketing"],
      }).notNull(),
      enabled: boolean("enabled").notNull().default(true),
      quiet_start: time("quiet_start"),
      quiet_end: time("quiet_end"),
      timezone: text("timezone").notNull(),
    },
    (table) => [
      uniqueIndex("notification_preference_uq_1").on(
        table.identity_id,
        table.channel,
        table.category
      ),
      index("notification_preference_identity_id_idx").on(table.identity_id),
      check(
        "notification_preference_ck_1",
        sql.raw("(quiet_start IS NULL) = (quiet_end IS NULL)")
      ),
      check("notification_preference_ck_2", sql.raw("row_version > 0")),
      check(
        "notification_preference_ck_3",
        sql.raw("\"channel\" IN ('push', 'sms', 'email', 'in_app')")
      ),
      check(
        "notification_preference_ck_4",
        sql.raw(
          "\"category\" IN ('appointments', 'medication', 'followup', 'trips', 'marketing')"
        )
      ),
    ]
  )
  .enableRLS();
export type NotificationPreference = typeof notificationPreference.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreference.$inferInsert;

export const notificationEndpoint = clinzo
  .table(
    "notification_endpoint",
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
      channel: text("channel", {
        enum: ["push", "sms", "email", "in_app"],
      }).notNull(),
      address_ciphertext: bytea("address_ciphertext").notNull(),
      address_digest: bytea("address_digest").notNull(),
      verified_at: timestamp("verified_at", {
        withTimezone: true,
        mode: "date",
      }),
      revoked_at: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      uniqueIndex("notification_endpoint_uq_1").on(
        table.identity_id,
        table.channel,
        table.address_digest
      ),
      index("notification_endpoint_identity_id_idx").on(table.identity_id),
      check("notification_endpoint_ck_1", sql.raw("row_version > 0")),
      check(
        "notification_endpoint_ck_2",
        sql.raw("\"channel\" IN ('push', 'sms', 'email', 'in_app')")
      ),
    ]
  )
  .enableRLS();
export type NotificationEndpoint = typeof notificationEndpoint.$inferSelect;
export type NewNotificationEndpoint = typeof notificationEndpoint.$inferInsert;

export const notificationIntent = clinzo
  .table(
    "notification_intent",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      recipient_id: uuid("recipient_id")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      event_id: uuid("event_id").references((): AnyPgColumn => domainEvent.id, {
        onDelete: "restrict",
      }),
      occurrence_id: uuid("occurrence_id").references(
        (): AnyPgColumn => reminderOccurrence.id,
        { onDelete: "restrict" }
      ),
      template_key: text("template_key").notNull(),
      dedup_key: text("dedup_key").notNull(),
      safe_parameters: jsonb("safe_parameters").$type<JsonValue>().notNull(),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
    },
    (table) => [
      uniqueIndex("notification_intent_uq_1").on(table.dedup_key),
      index("notification_intent_recipient_id_idx").on(table.recipient_id),
      index("notification_intent_event_id_idx").on(table.event_id),
      index("notification_intent_occurrence_id_idx").on(table.occurrence_id),
      check(
        "notification_intent_ck_1",
        sql.raw("(event_id IS NULL) <> (occurrence_id IS NULL)")
      ),
    ]
  )
  .enableRLS();
export type NotificationIntent = typeof notificationIntent.$inferSelect;
export type NewNotificationIntent = typeof notificationIntent.$inferInsert;

export const notificationDelivery = clinzo
  .table(
    "notification_delivery",
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
      intent_id: uuid("intent_id")
        .notNull()
        .references((): AnyPgColumn => notificationIntent.id, {
          onDelete: "restrict",
        }),
      endpoint_id: uuid("endpoint_id")
        .notNull()
        .references((): AnyPgColumn => notificationEndpoint.id, {
          onDelete: "restrict",
        }),
      status: text("status", {
        enum: ["pending", "leased", "sent", "delivered", "failed", "cancelled"],
      }).notNull(),
      attempts: integer("attempts").notNull().default(0),
      next_attempt_at: timestamp("next_attempt_at", {
        withTimezone: true,
        mode: "date",
      })
        .notNull()
        .defaultNow(),
      lease_until: timestamp("lease_until", {
        withTimezone: true,
        mode: "date",
      }),
      provider_message_id: text("provider_message_id"),
      last_error_code: text("last_error_code"),
    },
    (table) => [
      uniqueIndex("notification_delivery_uq_1").on(
        table.intent_id,
        table.endpoint_id
      ),
      index("notification_delivery_intent_id_idx").on(table.intent_id),
      index("notification_delivery_endpoint_id_idx").on(table.endpoint_id),
      check("notification_delivery_ck_1", sql.raw("attempts >= 0")),
      check("notification_delivery_ck_2", sql.raw("row_version > 0")),
      check(
        "notification_delivery_ck_3",
        sql.raw(
          "\"status\" IN ('pending', 'leased', 'sent', 'delivered', 'failed', 'cancelled')"
        )
      ),
    ]
  )
  .enableRLS();
export type NotificationDelivery = typeof notificationDelivery.$inferSelect;
export type NewNotificationDelivery = typeof notificationDelivery.$inferInsert;
