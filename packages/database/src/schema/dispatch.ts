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
import { driver, driverShift, vehicle } from "./ambulance-workforce";

export const dispatchRound = clinzo
  .table(
    "dispatch_round",
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
      round_number: integer("round_number").notNull(),
      radius_meters: integer("radius_meters").notNull(),
      status: text("status", {
        enum: ["open", "exhausted", "matched", "cancelled"],
      }).notNull(),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
    },
    (table) => [
      uniqueIndex("dispatch_round_uq_1").on(
        table.booking_id,
        table.round_number
      ),
      uniqueIndex("dispatch_round_active_uq_1")
        .on(table.booking_id)
        .where(sql.raw("status = 'open'")),
      index("dispatch_round_booking_id_idx").on(table.booking_id),
      check(
        "dispatch_round_ck_1",
        sql.raw("round_number > 0 AND radius_meters > 0")
      ),
      check("dispatch_round_ck_2", sql.raw("expires_at > created_at")),
      check("dispatch_round_ck_3", sql.raw("row_version > 0")),
      check(
        "dispatch_round_ck_4",
        sql.raw("\"status\" IN ('open', 'exhausted', 'matched', 'cancelled')")
      ),
    ]
  )
  .enableRLS();
export type DispatchRound = typeof dispatchRound.$inferSelect;
export type NewDispatchRound = typeof dispatchRound.$inferInsert;

export const dispatchOffer = clinzo
  .table(
    "dispatch_offer",
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
      round_id: uuid("round_id")
        .notNull()
        .references((): AnyPgColumn => dispatchRound.id, {
          onDelete: "restrict",
        }),
      shift_id: uuid("shift_id")
        .notNull()
        .references((): AnyPgColumn => driverShift.id, {
          onDelete: "restrict",
        }),
      status: text("status", {
        enum: ["pending", "accepted", "rejected", "expired", "withdrawn"],
      }).notNull(),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      responded_at: timestamp("responded_at", {
        withTimezone: true,
        mode: "date",
      }),
      reason: text("reason"),
      distance_meters: integer("distance_meters").notNull(),
    },
    (table) => [
      uniqueIndex("dispatch_offer_uq_1").on(table.round_id, table.shift_id),
      index("dispatch_offer_round_id_idx").on(table.round_id),
      index("dispatch_offer_shift_id_idx").on(table.shift_id),
      check("dispatch_offer_ck_1", sql.raw("distance_meters >= 0")),
      check("dispatch_offer_ck_2", sql.raw("expires_at > created_at")),
      check("dispatch_offer_ck_3", sql.raw("row_version > 0")),
      check(
        "dispatch_offer_ck_4",
        sql.raw(
          "\"status\" IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')"
        )
      ),
    ]
  )
  .enableRLS();
export type DispatchOffer = typeof dispatchOffer.$inferSelect;
export type NewDispatchOffer = typeof dispatchOffer.$inferInsert;

export const ambulanceAssignment = clinzo
  .table(
    "ambulance_assignment",
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
      offer_id: uuid("offer_id")
        .notNull()
        .references((): AnyPgColumn => dispatchOffer.id, {
          onDelete: "restrict",
        }),
      shift_id: uuid("shift_id")
        .notNull()
        .references((): AnyPgColumn => driverShift.id, {
          onDelete: "restrict",
        }),
      driver_id: uuid("driver_id")
        .notNull()
        .references((): AnyPgColumn => driver.id, { onDelete: "restrict" }),
      vehicle_id: uuid("vehicle_id")
        .notNull()
        .references((): AnyPgColumn => vehicle.id, { onDelete: "restrict" }),
      accepted_at: timestamp("accepted_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      released_at: timestamp("released_at", {
        withTimezone: true,
        mode: "date",
      }),
      release_reason: text("release_reason"),
      driver_name_snapshot: text("driver_name_snapshot").notNull(),
      vehicle_registration_snapshot: text(
        "vehicle_registration_snapshot"
      ).notNull(),
      operator_name_snapshot: text("operator_name_snapshot").notNull(),
    },
    (table) => [
      uniqueIndex("ambulance_assignment_uq_1").on(table.offer_id),
      uniqueIndex("ambulance_assignment_active_uq_1")
        .on(table.booking_id)
        .where(sql.raw("released_at IS NULL")),
      uniqueIndex("ambulance_assignment_active_uq_2")
        .on(table.driver_id)
        .where(sql.raw("released_at IS NULL")),
      uniqueIndex("ambulance_assignment_active_uq_3")
        .on(table.vehicle_id)
        .where(sql.raw("released_at IS NULL")),
      index("ambulance_assignment_booking_id_idx").on(table.booking_id),
      index("ambulance_assignment_offer_id_idx").on(table.offer_id),
      index("ambulance_assignment_shift_id_idx").on(table.shift_id),
      index("ambulance_assignment_driver_id_idx").on(table.driver_id),
      index("ambulance_assignment_vehicle_id_idx").on(table.vehicle_id),
      check(
        "ambulance_assignment_ck_1",
        sql.raw(
          "released_at IS NULL OR (released_at >= accepted_at AND release_reason IS NOT NULL)"
        )
      ),
      check("ambulance_assignment_ck_2", sql.raw("row_version > 0")),
      foreignKey({
        name: "ambulance_assignment_composite_fk_1",
        columns: [table.shift_id, table.driver_id, table.vehicle_id],
        foreignColumns: [
          driverShift.id,
          driverShift.driver_id,
          driverShift.vehicle_id,
        ],
      }).onDelete("restrict"),
    ]
  )
  .enableRLS();
export type AmbulanceAssignment = typeof ambulanceAssignment.$inferSelect;
export type NewAmbulanceAssignment = typeof ambulanceAssignment.$inferInsert;
