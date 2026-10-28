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
import { appointment } from "./appointments";

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
      uniqueIndex("ambulance_payment_open_uq")
        .on(table.booking_id)
        .where(sql`${table.status} NOT IN ('failed','cancelled')`),
      index("payment_fare_quote_id_idx").on(table.fare_quote_id),
      index("payment_reported_by_idx").on(table.reported_by),
      index("payment_confirmed_by_idx").on(table.confirmed_by),
      check("payment_ck_1", sql.raw("amount_minor > 0")),
      check(
        "payment_ck_2",
        sql.raw(
          "(provider IS NULL) = (provider_payment_id IS NULL) OR (method='gateway' AND status='pending' AND provider='razorpay' AND provider_payment_id IS NULL)"
        )
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

export const companyFinanceMember = clinzo
  .table("company_finance_member", {
    identity_id: uuid("identity_id")
      .primaryKey()
      .references(() => identity.id),
    active: boolean("active").notNull().default(true),
  })
  .enableRLS();

export const marketplacePaymentConfig = clinzo
  .table(
    "marketplace_payment_config",
    {
      singleton: boolean("singleton").primaryKey().default(true),
      enabled: boolean("enabled").notNull().default(false),
      mode: text("mode").notNull().default("test"),
      appointment_bps: integer("appointment_bps"),
      ambulance_bps: integer("ambulance_bps"),
      release_delay_hours: integer("release_delay_hours").notNull().default(0),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
    },
    (t) => [
      check("marketplace_payment_config_singleton_check", sql`${t.singleton}`),
      check(
        "marketplace_payment_config_mode_check",
        sql`${t.mode} IN ('test','live')`
      ),
      check(
        "marketplace_payment_config_appointment_bps_check",
        sql`${t.appointment_bps} BETWEEN 0 AND 10000`
      ),
      check(
        "marketplace_payment_config_ambulance_bps_check",
        sql`${t.ambulance_bps} BETWEEN 0 AND 10000`
      ),
      check(
        "marketplace_payment_config_release_delay_hours_check",
        sql`${t.release_delay_hours} BETWEEN 0 AND 168`
      ),
      check(
        "marketplace_payment_config_row_version_check",
        sql`${t.row_version}>0`
      ),
    ]
  )
  .enableRLS();

export const payoutRecipient = clinzo
  .table(
    "payout_recipient",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      scope_kind: text("scope_kind").notNull(),
      scope_id: uuid("scope_id").notNull(),
      payee_kind: text("payee_kind").notNull(),
      legal_name: text("legal_name").notNull(),
      mode: text("mode").notNull(),
      account_id: text("account_id").notNull(),
      product_id: text("product_id").notNull(),
      active: boolean("active").notNull().default(true),
      verified_at: timestamp("verified_at", { withTimezone: true }),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
      created_by: uuid("created_by")
        .notNull()
        .references(() => identity.id),
    },
    (t) => [
      uniqueIndex("payout_recipient_active_uq")
        .on(t.scope_kind, t.scope_id, t.mode)
        .where(sql`${t.active}`),
      index("payout_recipient_created_by_idx").on(t.created_by),
      check(
        "payout_recipient_scope_kind_check",
        sql`${t.scope_kind} IN ('practice','driver')`
      ),
      check(
        "payout_recipient_payee_kind_check",
        sql`${t.payee_kind} IN ('doctor','facility','driver','operator')`
      ),
      check(
        "payout_recipient_legal_name_check",
        sql`length(btrim(${t.legal_name})) BETWEEN 2 AND 200`
      ),
      check("payout_recipient_mode_check", sql`${t.mode} IN ('test','live')`),
      check(
        "payout_recipient_account_id_check",
        sql`${t.account_id} ~ '^acc_[A-Za-z0-9]+$'`
      ),
      check(
        "payout_recipient_product_id_check",
        sql`${t.product_id} ~ '^acc_prd_[A-Za-z0-9]+$'`
      ),
    ]
  )
  .enableRLS();

export const ambulancePaymentAttempt = clinzo
  .table(
    "ambulance_payment_attempt",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      payment_id: uuid("payment_id")
        .notNull()
        .unique()
        .references(() => payment.id),
      mode: text("mode").notNull(),
      order_id: text("order_id").unique(),
      gateway_payment_id: text("gateway_payment_id").unique(),
      status: text("status").notNull().default("creating"),
      claimed_at: timestamp("claimed_at", { withTimezone: true }),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (t) => [
      check(
        "ambulance_payment_attempt_mode_check",
        sql`${t.mode} IN ('test','live')`
      ),
      check(
        "ambulance_payment_attempt_status_check",
        sql`${t.status} IN ('creating','created','authorized','captured','uncertain','failed')`
      ),
    ]
  )
  .enableRLS();

export const payoutEntry = clinzo
  .table(
    "payout_entry",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      appointment_attempt_id: uuid("appointment_attempt_id")
        .unique()
        .references((): AnyPgColumn => appointmentPaymentAttempt.id),
      ambulance_payment_id: uuid("ambulance_payment_id")
        .unique()
        .references(() => payment.id),
      scope_kind: text("scope_kind").notNull(),
      scope_id: uuid("scope_id").notNull(),
      mode: text("mode").notNull(),
      method: text("method").notNull(),
      recipient_id: uuid("recipient_id").references(() => payoutRecipient.id),
      commission_bps: integer("commission_bps"),
      gross_minor: bigint("gross_minor", { mode: "bigint" }).notNull(),
      refunded_minor: bigint("refunded_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      payment_id: text("payment_id"),
      transfer_id: text("transfer_id").unique(),
      transfer_minor: bigint("transfer_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      reversed_minor: bigint("reversed_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      transfer_status: text("transfer_status").notNull().default("pending"),
      settlement_status: text("settlement_status").notNull().default("pending"),
      settlement_id: text("settlement_id"),
      gateway_fees_minor: bigint("gateway_fees_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      gateway_tax_minor: bigint("gateway_tax_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      route_fees_minor: bigint("route_fees_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      route_tax_minor: bigint("route_tax_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      claimed_at: timestamp("claimed_at", { withTimezone: true }),
      last_checked_at: timestamp("last_checked_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (t) => [
      index("payout_entry_scope_idx").on(
        t.scope_kind,
        t.scope_id,
        t.created_at,
        t.id
      ),
      index("payout_entry_recipient_idx").on(t.recipient_id),
      index("payout_entry_work_idx").on(t.mode, t.last_checked_at),
      check(
        "payout_entry_source_check",
        sql`(${t.appointment_attempt_id} IS NULL) <> (${t.ambulance_payment_id} IS NULL)`
      ),
      check(
        "payout_entry_scope_kind_check",
        sql`${t.scope_kind} IN ('practice','driver')`
      ),
      check("payout_entry_mode_check", sql`${t.mode} IN ('test','live')`),
      check(
        "payout_entry_method_check",
        sql`${t.method} IN ('gateway','cash','external_direct')`
      ),
      check(
        "payout_entry_commission_bps_check",
        sql`${t.commission_bps} BETWEEN 0 AND 10000`
      ),
      check(
        "payout_entry_gross_minor_check",
        sql`${t.gross_minor} BETWEEN 1 AND 9000000000000`
      ),
      check(
        "payout_entry_refunded_minor_check",
        sql`${t.refunded_minor} BETWEEN 0 AND ${t.gross_minor}`
      ),
      check("payout_entry_transfer_minor_check", sql`${t.transfer_minor}>=0`),
      check(
        "payout_entry_reversed_minor_check",
        sql`${t.reversed_minor} BETWEEN 0 AND ${t.transfer_minor}`
      ),
      check(
        "payout_entry_transfer_status_check",
        sql`${t.transfer_status} IN ('pending','working','uncertain','processed','failed','reversed','partially_reversed')`
      ),
      check(
        "payout_entry_settlement_status_check",
        sql`${t.settlement_status} IN ('pending','on_hold','settled')`
      ),
    ]
  )
  .enableRLS();

export const payoutReversal = clinzo
  .table(
    "payout_reversal",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      entry_id: uuid("entry_id")
        .notNull()
        .references(() => payoutEntry.id),
      amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),
      provider_id: text("provider_id").unique(),
      status: text("status").notNull().default("working"),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (t) => [
      uniqueIndex("payout_reversal_open_uq")
        .on(t.entry_id)
        .where(sql`${t.status}<>'processed'`),
      check("payout_reversal_amount_minor_check", sql`${t.amount_minor}>0`),
      check(
        "payout_reversal_status_check",
        sql`${t.status} IN ('working','uncertain','processed')`
      ),
    ]
  )
  .enableRLS();

export const cashCommissionReceipt = clinzo
  .table(
    "cash_commission_receipt",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      entry_id: uuid("entry_id")
        .notNull()
        .references(() => payoutEntry.id),
      amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),
      reference: text("reference").notNull().unique(),
      note: text("note").notNull(),
      received_by: uuid("received_by")
        .notNull()
        .references(() => identity.id),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (t) => [
      index("cash_commission_receipt_entry_idx").on(t.entry_id),
      index("cash_commission_receipt_received_by_idx").on(t.received_by),
      check(
        "cash_commission_receipt_amount_minor_check",
        sql`${t.amount_minor}>0`
      ),
      check(
        "cash_commission_receipt_reference_check",
        sql`length(btrim(${t.reference})) BETWEEN 3 AND 150`
      ),
      check(
        "cash_commission_receipt_note_check",
        sql`length(btrim(${t.note})) BETWEEN 2 AND 1000`
      ),
    ]
  )
  .enableRLS();

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

export const appointmentBillingConfig = clinzo
  .table(
    "appointment_billing_config",
    {
      singleton: boolean("singleton").primaryKey().default(true),
      enabled: boolean("enabled").notNull().default(false),
      mode: text("mode").notNull().default("test"),
      activated_at: timestamp("activated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
      policy_version: text("policy_version")
        .notNull()
        .default("consultation-zero-deduction-v1"),
      deduction_bps: integer("deduction_bps").notNull().default(0),
    },
    () => [
      check("appointment_billing_config_singleton_check", sql`singleton`),
      check(
        "appointment_billing_config_mode_check",
        sql`mode IN ('test','live')`
      ),
      check(
        "appointment_billing_config_deduction_bps_check",
        sql`deduction_bps BETWEEN 0 AND 10000`
      ),
    ]
  )
  .enableRLS();

export const appointmentCharge = clinzo
  .table(
    "appointment_charge",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      root_appointment_id: uuid("root_appointment_id")
        .notNull()
        .unique()
        .references(() => appointment.id),
      appointment_id: uuid("appointment_id")
        .notNull()
        .unique()
        .references(() => appointment.id),
      amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),
      currency: text("currency").notNull().default("INR"),
      mode: text("mode").notNull(),
      policy_version: text("policy_version").notNull(),
      deduction_bps: integer("deduction_bps").notNull(),
      deduction_minor: bigint("deduction_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      accepted_by: uuid("accepted_by")
        .notNull()
        .references(() => identity.id),
      last_checked_at: timestamp("last_checked_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    () => [
      check(
        "appointment_charge_amount_minor_check",
        sql`amount_minor BETWEEN 0 AND 9000000000000`
      ),
      check("appointment_charge_currency_check", sql`currency='INR'`),
      check("appointment_charge_mode_check", sql`mode IN ('test','live')`),
      check(
        "appointment_charge_deduction_bps_check",
        sql`deduction_bps BETWEEN 0 AND 10000`
      ),
      check(
        "appointment_charge_deduction_minor_check",
        sql`deduction_minor>=0`
      ),
    ]
  )
  .enableRLS();

export const appointmentPaymentAttempt = clinzo
  .table(
    "appointment_payment_attempt",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      charge_id: uuid("charge_id")
        .notNull()
        .references(() => appointmentCharge.id),
      method: text("method").notNull().default("gateway"),
      amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),
      currency: text("currency").notNull().default("INR"),
      order_id: text("order_id").unique(),
      payment_id: text("payment_id").unique(),
      status: text("status").notNull().default("creating"),
      refunded_minor: bigint("refunded_minor", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
      lease_token: uuid("lease_token"),
      claimed_at: timestamp("claimed_at", { withTimezone: true }),
      expires_at: timestamp("expires_at", { withTimezone: true }),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index("appointment_payment_charge_idx").on(table.charge_id),
      uniqueIndex("appointment_payment_active_uq")
        .on(table.charge_id)
        .where(sql`status IN ('creating','created','authorized','uncertain')`),
      check(
        "appointment_payment_attempt_method_check",
        sql`method IN ('gateway','cash')`
      ),
      check(
        "appointment_payment_attempt_amount_minor_check",
        sql`amount_minor BETWEEN 100 AND 9000000000000`
      ),
      check("appointment_payment_attempt_currency_check", sql`currency='INR'`),
      check(
        "appointment_payment_attempt_status_check",
        sql`status IN ('creating','created','authorized','captured','failed','uncertain')`
      ),
      check(
        "appointment_payment_attempt_refunded_minor_check",
        sql`refunded_minor BETWEEN 0 AND amount_minor`
      ),
    ]
  )
  .enableRLS();

export const appointmentRefundRequest = clinzo
  .table(
    "appointment_refund_request",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      charge_id: uuid("charge_id")
        .notNull()
        .references(() => appointmentCharge.id),
      kind: text("kind").notNull(),
      status: text("status").notNull().default("requested"),
      amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),
      deduction_minor: bigint("deduction_minor", { mode: "bigint" }).notNull(),
      reason: text("reason").notNull(),
      requested_by: uuid("requested_by")
        .notNull()
        .references(() => identity.id),
      decided_by: uuid("decided_by").references(() => identity.id),
      decision_note: text("decision_note"),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (table) => [
      index("appointment_refund_charge_idx").on(table.charge_id),
      uniqueIndex("appointment_refund_open_uq")
        .on(table.charge_id)
        .where(sql`status IN ('requested','approved','processing')`),
      check(
        "appointment_refund_request_kind_check",
        sql`kind IN ('cancel','surplus')`
      ),
      check(
        "appointment_refund_request_status_check",
        sql`status IN ('requested','approved','processing','refunded','rejected')`
      ),
      check(
        "appointment_refund_request_amount_minor_check",
        sql`amount_minor>0`
      ),
      check(
        "appointment_refund_request_deduction_minor_check",
        sql`deduction_minor>=0`
      ),
      check(
        "appointment_refund_request_reason_check",
        sql`length(btrim(reason)) BETWEEN 2 AND 1000`
      ),
    ]
  )
  .enableRLS();

export const appointmentRefundJob = clinzo
  .table(
    "appointment_refund_job",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      refund_id: uuid("refund_id")
        .notNull()
        .references(() => appointmentRefundRequest.id),
      attempt_id: uuid("attempt_id")
        .notNull()
        .references(() => appointmentPaymentAttempt.id),
      amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),
      status: text("status").notNull().default("ready"),
      provider_refund_id: text("provider_refund_id").unique(),
      lease_token: uuid("lease_token"),
      claimed_at: timestamp("claimed_at", { withTimezone: true }),
      created_at: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (table) => [
      uniqueIndex("appointment_refund_job_refund_id_attempt_id_key").on(
        table.refund_id,
        table.attempt_id
      ),
      index("appointment_refund_job_attempt_idx").on(table.attempt_id),
      check("appointment_refund_job_amount_minor_check", sql`amount_minor>0`),
      check(
        "appointment_refund_job_status_check",
        sql`status IN ('ready','working','pending','processed','failed','uncertain')`
      ),
    ]
  )
  .enableRLS();

export const appointmentPaymentEvent = clinzo
  .table("appointment_payment_event", {
    event_id: text("event_id").primaryKey(),
    digest: text("digest").notNull(),
    event_type: text("event_type").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  })
  .enableRLS();
