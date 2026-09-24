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
import { capability } from "./ambulance-workforce";
import { guestEmergencySession } from "./emergency";
import { identity, patient } from "./identity";
import { facility } from "./organizations";

export const ambulanceBooking = clinzo
  .table(
    "ambulance_booking",
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
      patient_id: uuid("patient_id").references((): AnyPgColumn => patient.id, {
        onDelete: "restrict",
      }),
      requested_by: uuid("requested_by").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
      guest_session_id: uuid("guest_session_id").references(
        (): AnyPgColumn => guestEmergencySession.id,
        { onDelete: "restrict" }
      ),
      booking_type: text("booking_type", { enum: ["normal", "sos"] }).notNull(),
      status: text("status", {
        enum: [
          "awaiting_location",
          "searching",
          "assigned",
          "fulfilled",
          "cancelled",
          "unfulfilled",
        ],
      }).notNull(),
      priority: smallint("priority").notNull(),
      pickup_position: geographyPoint("pickup_position"),
      pickup_address: text("pickup_address"),
      destination_facility_id: uuid("destination_facility_id").references(
        (): AnyPgColumn => facility.id,
        { onDelete: "restrict" }
      ),
      destination_position: geographyPoint("destination_position"),
      destination_address: text("destination_address"),
      patient_name_snapshot: text("patient_name_snapshot"),
      contact_phone_snapshot: text("contact_phone_snapshot"),
      cancel_reason: text("cancel_reason"),
    },
    (table) => [
      uniqueIndex("ambulance_booking_uq_1").on(table.public_code),
      index("ambulance_booking_patient_id_idx").on(table.patient_id),
      index("ambulance_booking_requested_by_idx").on(table.requested_by),
      index("ambulance_booking_guest_session_id_idx").on(
        table.guest_session_id
      ),
      index("ambulance_booking_pickup_position_geo_idx").using(
        "gist",
        table.pickup_position
      ),
      index("ambulance_booking_destination_facility_id_idx").on(
        table.destination_facility_id
      ),
      index("ambulance_booking_destination_position_geo_idx").using(
        "gist",
        table.destination_position
      ),
      check(
        "ambulance_booking_ck_1",
        sql.raw("(requested_by IS NULL) <> (guest_session_id IS NULL)")
      ),
      check(
        "ambulance_booking_ck_2",
        sql.raw(
          "booking_type='sos' OR (patient_id IS NOT NULL AND requested_by IS NOT NULL AND pickup_position IS NOT NULL AND destination_position IS NOT NULL)"
        )
      ),
      check(
        "ambulance_booking_ck_3",
        sql.raw("status='awaiting_location' OR pickup_position IS NOT NULL")
      ),
      check(
        "ambulance_booking_ck_4",
        sql.raw(
          "(destination_position IS NULL) = (destination_address IS NULL)"
        )
      ),
      check(
        "ambulance_booking_ck_5",
        sql.raw("status <> 'awaiting_location' OR booking_type='sos'")
      ),
      check("ambulance_booking_ck_6", sql.raw("row_version > 0")),
      check(
        "ambulance_booking_ck_7",
        sql.raw("\"booking_type\" IN ('normal', 'sos')")
      ),
      check(
        "ambulance_booking_ck_8",
        sql.raw(
          "\"status\" IN ('awaiting_location', 'searching', 'assigned', 'fulfilled', 'cancelled', 'unfulfilled')"
        )
      ),
    ]
  )
  .enableRLS();
export type AmbulanceBooking = typeof ambulanceBooking.$inferSelect;
export type NewAmbulanceBooking = typeof ambulanceBooking.$inferInsert;

export const bookingCapability = clinzo
  .table(
    "booking_capability",
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
      capability_id: uuid("capability_id")
        .notNull()
        .references((): AnyPgColumn => capability.id, { onDelete: "restrict" }),
    },
    (table) => [
      uniqueIndex("booking_capability_uq_1").on(
        table.booking_id,
        table.capability_id
      ),
      index("booking_capability_booking_id_idx").on(table.booking_id),
      index("booking_capability_capability_id_idx").on(table.capability_id),
      check("booking_capability_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type BookingCapability = typeof bookingCapability.$inferSelect;
export type NewBookingCapability = typeof bookingCapability.$inferInsert;

export const bookingDestinationChange = clinzo
  .table(
    "booking_destination_change",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      booking_id: uuid("booking_id")
        .notNull()
        .references((): AnyPgColumn => ambulanceBooking.id, {
          onDelete: "restrict",
        }),
      facility_id: uuid("facility_id").references(
        (): AnyPgColumn => facility.id,
        { onDelete: "restrict" }
      ),
      position: geographyPoint("position").notNull(),
      address: text("address").notNull(),
      changed_by: uuid("changed_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      reason: text("reason").notNull(),
    },
    (table) => [
      index("booking_destination_change_booking_id_idx").on(table.booking_id),
      index("booking_destination_change_facility_id_idx").on(table.facility_id),
      index("booking_destination_change_position_geo_idx").using(
        "gist",
        table.position
      ),
      index("booking_destination_change_changed_by_idx").on(table.changed_by),
    ]
  )
  .enableRLS();
export type BookingDestinationChange =
  typeof bookingDestinationChange.$inferSelect;
export type NewBookingDestinationChange =
  typeof bookingDestinationChange.$inferInsert;
