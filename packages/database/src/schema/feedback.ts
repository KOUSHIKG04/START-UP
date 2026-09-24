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
import { identity } from "./identity";
import { trip } from "./trips";

export const doctorReview = clinzo
  .table(
    "doctor_review",
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
      rating: smallint("rating").notNull(),
      comment: text("comment"),
      submitted_by: uuid("submitted_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      moderation_state: text("moderation_state", {
        enum: ["pending", "published", "hidden"],
      }).notNull(),
    },
    (table) => [
      uniqueIndex("doctor_review_uq_1").on(table.appointment_id),
      index("doctor_review_appointment_id_idx").on(table.appointment_id),
      index("doctor_review_submitted_by_idx").on(table.submitted_by),
      check("doctor_review_ck_1", sql.raw("rating BETWEEN 1 AND 5")),
      check("doctor_review_ck_2", sql.raw("row_version > 0")),
      check(
        "doctor_review_ck_3",
        sql.raw("\"moderation_state\" IN ('pending', 'published', 'hidden')")
      ),
    ]
  )
  .enableRLS();
export type DoctorReview = typeof doctorReview.$inferSelect;
export type NewDoctorReview = typeof doctorReview.$inferInsert;

export const platformFeedback = clinzo
  .table(
    "platform_feedback",
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
      app: text("app", {
        enum: ["patient", "doctor", "admin", "driver"],
      }).notNull(),
      category: text("category").notNull(),
      body: text("body").notNull(),
      status: text("status", { enum: ["new", "triaged", "closed"] }).notNull(),
    },
    (table) => [
      index("platform_feedback_identity_id_idx").on(table.identity_id),
      check("platform_feedback_ck_1", sql.raw("row_version > 0")),
      check(
        "platform_feedback_ck_2",
        sql.raw("\"app\" IN ('patient', 'doctor', 'admin', 'driver')")
      ),
      check(
        "platform_feedback_ck_3",
        sql.raw("\"status\" IN ('new', 'triaged', 'closed')")
      ),
    ]
  )
  .enableRLS();
export type PlatformFeedback = typeof platformFeedback.$inferSelect;
export type NewPlatformFeedback = typeof platformFeedback.$inferInsert;

export const ambulanceReview = clinzo
  .table(
    "ambulance_review",
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
      submitted_by: uuid("submitted_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      driver_rating: smallint("driver_rating").notNull(),
      service_rating: smallint("service_rating").notNull(),
      comment: text("comment"),
      moderation_state: text("moderation_state", {
        enum: ["pending", "published", "hidden"],
      }).notNull(),
    },
    (table) => [
      uniqueIndex("ambulance_review_uq_1").on(table.trip_id),
      index("ambulance_review_trip_id_idx").on(table.trip_id),
      index("ambulance_review_submitted_by_idx").on(table.submitted_by),
      check(
        "ambulance_review_ck_1",
        sql.raw(
          "driver_rating BETWEEN 1 AND 5 AND service_rating BETWEEN 1 AND 5"
        )
      ),
      check("ambulance_review_ck_2", sql.raw("row_version > 0")),
      check(
        "ambulance_review_ck_3",
        sql.raw("\"moderation_state\" IN ('pending', 'published', 'hidden')")
      ),
    ]
  )
  .enableRLS();
export type AmbulanceReview = typeof ambulanceReview.$inferSelect;
export type NewAmbulanceReview = typeof ambulanceReview.$inferInsert;
