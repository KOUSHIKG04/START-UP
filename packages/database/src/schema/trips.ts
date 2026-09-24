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
import { ambulanceAssignment } from "./dispatch";

export const trip = clinzo
  .table(
    "trip",
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
      assignment_id: uuid("assignment_id")
        .notNull()
        .references((): AnyPgColumn => ambulanceAssignment.id, {
          onDelete: "restrict",
        }),
      status: text("status", {
        enum: [
          "heading_to_pickup",
          "arrived_at_pickup",
          "in_progress",
          "arrived_at_destination",
          "completed",
          "cancelled",
        ],
      }).notNull(),
      arrived_pickup_at: timestamp("arrived_pickup_at", {
        withTimezone: true,
        mode: "date",
      }),
      started_at: timestamp("started_at", { withTimezone: true, mode: "date" }),
      arrived_destination_at: timestamp("arrived_destination_at", {
        withTimezone: true,
        mode: "date",
      }),
      completed_at: timestamp("completed_at", {
        withTimezone: true,
        mode: "date",
      }),
      start_authorization: text("start_authorization", {
        enum: ["driver_confirmed", "emergency_override"],
      }),
      pin_credential_version: integer("pin_credential_version"),
      distance_meters: bigint("distance_meters", { mode: "bigint" }),
    },
    (table) => [
      uniqueIndex("trip_uq_1").on(table.booking_id),
      index("trip_booking_id_idx").on(table.booking_id),
      index("trip_assignment_id_idx").on(table.assignment_id),
      check(
        "trip_ck_1",
        sql.raw(
          "status NOT IN ('in_progress','arrived_at_destination','completed') OR (started_at IS NOT NULL AND start_authorization IS NOT NULL)"
        )
      ),
      check(
        "trip_ck_2",
        sql.raw(
          "status <> 'completed' OR (completed_at IS NOT NULL AND arrived_destination_at IS NOT NULL)"
        )
      ),
      check(
        "trip_ck_3",
        sql.raw("distance_meters IS NULL OR distance_meters >= 0")
      ),
      check(
        "trip_ck_4",
        sql.raw(
          "status <> 'completed' OR pin_credential_version IS NOT NULL"
        )
      ),
      check("trip_ck_5", sql.raw("row_version > 0")),
      check(
        "trip_ck_6",
        sql.raw(
          "\"status\" IN ('heading_to_pickup', 'arrived_at_pickup', 'in_progress', 'arrived_at_destination', 'completed', 'cancelled')"
        )
      ),
      check(
        "trip_ck_7",
        sql.raw(
          "\"start_authorization\" IN ('driver_confirmed', 'emergency_override')"
        )
      ),
    ]
  )
  .enableRLS();
export type Trip = typeof trip.$inferSelect;
export type NewTrip = typeof trip.$inferInsert;
