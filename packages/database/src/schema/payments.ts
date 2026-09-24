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

export const fareQuote = clinzo
  .table(
    "fare_quote",
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
      version: integer("version").notNull(),
      kind: text("kind", { enum: ["estimate", "final"] }).notNull(),
      currency: char("currency", { length: 3 }).notNull(),
      base_minor: bigint("base_minor", { mode: "bigint" }).notNull(),
      distance_minor: bigint("distance_minor", { mode: "bigint" }).notNull(),
      waiting_minor: bigint("waiting_minor", { mode: "bigint" }).notNull(),
      other_minor: bigint("other_minor", { mode: "bigint" }).notNull(),
      discount_minor: bigint("discount_minor", { mode: "bigint" }).notNull(),
      tax_minor: bigint("tax_minor", { mode: "bigint" }).notNull(),
      total_minor: bigint("total_minor", { mode: "bigint" }).notNull(),
      pricing_policy_version: text("pricing_policy_version").notNull(),
      distance_meters: bigint("distance_meters", { mode: "bigint" }).notNull(),
      accepted_by: uuid("accepted_by").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
    },
    (table) => [
      uniqueIndex("fare_quote_uq_1").on(table.booking_id, table.version),
      index("fare_quote_booking_id_idx").on(table.booking_id),
      index("fare_quote_accepted_by_idx").on(table.accepted_by),
      check("fare_quote_ck_1", sql.raw("version > 0 AND distance_meters >= 0")),
      check(
        "fare_quote_ck_2",
        sql.raw(
          "base_minor >= 0 AND distance_minor >= 0 AND waiting_minor >= 0 AND other_minor >= 0 AND discount_minor >= 0 AND tax_minor >= 0 AND total_minor >= 0"
        )
      ),
      check(
        "fare_quote_ck_3",
        sql.raw(
          "total_minor = base_minor + distance_minor + waiting_minor + other_minor - discount_minor + tax_minor"
        )
      ),
      check("fare_quote_ck_4", sql.raw("\"kind\" IN ('estimate', 'final')")),
      check("fare_quote_ck_5", sql.raw("currency ~ '^[A-Z]{3}$'")),
    ]
  )
  .enableRLS();
export type FareQuote = typeof fareQuote.$inferSelect;
export type NewFareQuote = typeof fareQuote.$inferInsert;

export const payment = clinzo
  .table(
    "payment",
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
      fare_quote_id: uuid("fare_quote_id")
        .notNull()
        .references((): AnyPgColumn => fareQuote.id, { onDelete: "restrict" }),
      method: text("method", {
        enum: ["cash", "external_direct", "gateway"],
      }).notNull(),
      status: text("status", {
        enum: ["pending", "reported", "confirmed", "failed", "cancelled"],
      }).notNull(),
      amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),
      currency: char("currency", { length: 3 }).notNull(),
      provider: text("provider"),
      provider_payment_id: text("provider_payment_id"),
      reported_by: uuid("reported_by").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
      confirmed_by: uuid("confirmed_by").references(
        (): AnyPgColumn => identity.id,
        { onDelete: "restrict" }
      ),
      confirmed_at: timestamp("confirmed_at", {
        withTimezone: true,
        mode: "date",
      }),
    },
    (table) => [
      uniqueIndex("payment_uq_1").on(table.provider, table.provider_payment_id),
      index("payment_booking_id_idx").on(table.booking_id),
      index("payment_fare_quote_id_idx").on(table.fare_quote_id),
      index("payment_reported_by_idx").on(table.reported_by),
      index("payment_confirmed_by_idx").on(table.confirmed_by),
      check("payment_ck_1", sql.raw("amount_minor > 0")),
      check(
        "payment_ck_2",
        sql.raw("(provider IS NULL) = (provider_payment_id IS NULL)")
      ),
      check(
        "payment_ck_3",
        sql.raw("method <> 'gateway' OR provider IS NOT NULL")
      ),
      check(
        "payment_ck_4",
        sql.raw("status <> 'confirmed' OR confirmed_at IS NOT NULL")
      ),
      check("payment_ck_5", sql.raw("row_version > 0")),
      check(
        "payment_ck_6",
        sql.raw("\"method\" IN ('cash', 'external_direct', 'gateway')")
      ),
      check(
        "payment_ck_7",
        sql.raw(
          "\"status\" IN ('pending', 'reported', 'confirmed', 'failed', 'cancelled')"
        )
      ),
      check("payment_ck_8", sql.raw("currency ~ '^[A-Z]{3}$'")),
    ]
  )
  .enableRLS();
export type Payment = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;

export const refund = clinzo
  .table(
    "refund",
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
      payment_id: uuid("payment_id")
        .notNull()
        .references((): AnyPgColumn => payment.id, { onDelete: "restrict" }),
      amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),
      reason: text("reason").notNull(),
      status: text("status", {
        enum: ["pending", "confirmed", "failed"],
      }).notNull(),
      provider: text("provider"),
      provider_refund_id: text("provider_refund_id"),
      requested_by: uuid("requested_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
    },
    (table) => [
      uniqueIndex("refund_uq_1").on(table.provider, table.provider_refund_id),
      index("refund_payment_id_idx").on(table.payment_id),
      index("refund_requested_by_idx").on(table.requested_by),
      check("refund_ck_1", sql.raw("amount_minor > 0")),
      check(
        "refund_ck_2",
        sql.raw("(provider IS NULL) = (provider_refund_id IS NULL)")
      ),
      check("refund_ck_3", sql.raw("row_version > 0")),
      check(
        "refund_ck_4",
        sql.raw("\"status\" IN ('pending', 'confirmed', 'failed')")
      ),
    ]
  )
  .enableRLS();
export type Refund = typeof refund.$inferSelect;
export type NewRefund = typeof refund.$inferInsert;

export const providerEvent = clinzo
  .table(
    "provider_event",
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
      provider: text("provider").notNull(),
      event_id: text("event_id").notNull(),
      payment_id: uuid("payment_id").references((): AnyPgColumn => payment.id, {
        onDelete: "restrict",
      }),
      event_type: text("event_type").notNull(),
      payload_digest: bytea("payload_digest").notNull(),
      safe_payload: jsonb("safe_payload").$type<JsonValue>().notNull(),
      processed_at: timestamp("processed_at", {
        withTimezone: true,
        mode: "date",
      }),
    },
    (table) => [
      uniqueIndex("provider_event_uq_1").on(table.provider, table.event_id),
      index("provider_event_payment_id_idx").on(table.payment_id),
      check("provider_event_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type ProviderEvent = typeof providerEvent.$inferSelect;
export type NewProviderEvent = typeof providerEvent.$inferInsert;
