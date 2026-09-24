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
import { driver, driverShift } from "./ambulance-workforce";
import { ambulanceAssignment } from "./dispatch";
import { guestEmergencySession } from "./emergency";
import { identity, patientContact } from "./identity";
import { trip } from "./trips";

export const driverLocationLatest = clinzo
  .table(
    "driver_location_latest",
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
      driver_id: uuid("driver_id")
        .notNull()
        .references((): AnyPgColumn => driver.id, { onDelete: "restrict" }),
      shift_id: uuid("shift_id")
        .notNull()
        .references((): AnyPgColumn => driverShift.id, {
          onDelete: "restrict",
        }),
      stream_epoch: uuid("stream_epoch").notNull(),
      sequence: bigint("sequence", { mode: "bigint" }).notNull(),
      position: geographyPoint("position").notNull(),
      accuracy_meters: numeric("accuracy_meters", {
        precision: 8,
        scale: 2,
      }).notNull(),
      device_at: timestamp("device_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      received_at: timestamp("received_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
    },
    (table) => [
      uniqueIndex("driver_location_latest_uq_1").on(table.driver_id),
      index("driver_location_latest_driver_id_idx").on(table.driver_id),
      index("driver_location_latest_shift_id_idx").on(table.shift_id),
      index("driver_location_latest_position_geo_idx").using(
        "gist",
        table.position
      ),
      check(
        "driver_location_latest_ck_1",
        sql.raw("sequence >= 0 AND accuracy_meters >= 0")
      ),
      check("driver_location_latest_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type DriverLocationLatest = typeof driverLocationLatest.$inferSelect;
export type NewDriverLocationLatest = typeof driverLocationLatest.$inferInsert;

export const tripLocation = clinzo
  .table(
    "trip_location",
    {
      id: uuid("id").notNull().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      trip_id: uuid("trip_id")
        .notNull()
        .references((): AnyPgColumn => trip.id, { onDelete: "restrict" }),
      assignment_id: uuid("assignment_id")
        .notNull()
        .references((): AnyPgColumn => ambulanceAssignment.id, {
          onDelete: "restrict",
        }),
      stream_epoch: uuid("stream_epoch").notNull(),
      sequence: bigint("sequence", { mode: "bigint" }).notNull(),
      received_at: timestamp("received_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      device_at: timestamp("device_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      position: geographyPoint("position").notNull(),
      accuracy_meters: numeric("accuracy_meters", {
        precision: 8,
        scale: 2,
      }).notNull(),
      sample_reason: text("sample_reason", {
        enum: [
          "periodic",
          "pickup",
          "start",
          "destination",
          "complete",
          "deviation",
        ],
      }).notNull(),
    },
    (table) => [
      uniqueIndex("trip_location_uq_1").on(
        table.trip_id,
        table.stream_epoch,
        table.sequence,
        table.received_at
      ),
      index("trip_location_trip_id_idx").on(table.trip_id),
      index("trip_location_assignment_id_idx").on(table.assignment_id),
      index("trip_location_position_geo_idx").using("gist", table.position),
      check(
        "trip_location_ck_1",
        sql.raw("sequence >= 0 AND accuracy_meters >= 0")
      ),
      check(
        "trip_location_ck_2",
        sql.raw(
          "\"sample_reason\" IN ('periodic', 'pickup', 'start', 'destination', 'complete', 'deviation')"
        )
      ),
      primaryKey({ columns: [table.id, table.received_at] }),
    ]
  )
  .enableRLS();
export type TripLocation = typeof tripLocation.$inferSelect;
export type NewTripLocation = typeof tripLocation.$inferInsert;

export const trackingShare = clinzo
  .table(
    "tracking_share",
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
      token_hash: bytea("token_hash").notNull(),
      created_by: uuid("created_by").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
      guest_session_id: uuid("guest_session_id").references(
        (): AnyPgColumn => guestEmergencySession.id,
        { onDelete: "restrict" }
      ),
      contact_id: uuid("contact_id").references(
        (): AnyPgColumn => patientContact.id,
        { onDelete: "restrict" }
      ),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      revoked_at: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      uniqueIndex("tracking_share_uq_1").on(table.token_hash),
      index("tracking_share_trip_id_idx").on(table.trip_id),
      index("tracking_share_created_by_idx").on(table.created_by),
      index("tracking_share_guest_session_id_idx").on(table.guest_session_id),
      index("tracking_share_contact_id_idx").on(table.contact_id),
      check(
        "tracking_share_ck_1",
        sql.raw("(created_by IS NULL) <> (guest_session_id IS NULL)")
      ),
      check("tracking_share_ck_2", sql.raw("expires_at > created_at")),
      check("tracking_share_ck_3", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type TrackingShare = typeof trackingShare.$inferSelect;
export type NewTrackingShare = typeof trackingShare.$inferInsert;
