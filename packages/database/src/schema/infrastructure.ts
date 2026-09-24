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
import { guestEmergencySession } from "./emergency";
import { identity } from "./identity";

export const domainEvent = clinzo
  .table(
    "domain_event",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      event_type: text("event_type").notNull(),
      aggregate_type: text("aggregate_type").notNull(),
      aggregate_id: uuid("aggregate_id").notNull(),
      aggregate_version: bigint("aggregate_version", {
        mode: "bigint",
      }).notNull(),
      actor_id: uuid("actor_id").references((): AnyPgColumn => identity.id, {
        onDelete: "restrict",
      }),
      guest_session_id: uuid("guest_session_id").references(
        (): AnyPgColumn => guestEmergencySession.id,
        { onDelete: "restrict" }
      ),
      request_id: uuid("request_id").notNull(),
      payload: jsonb("payload").$type<JsonValue>().notNull(),
    },
    (table) => [
      uniqueIndex("domain_event_uq_1").on(
        table.aggregate_type,
        table.aggregate_id,
        table.aggregate_version
      ),
      index("domain_event_actor_id_idx").on(table.actor_id),
      index("domain_event_guest_session_id_idx").on(table.guest_session_id),
      check("domain_event_ck_1", sql.raw("aggregate_version > 0")),
    ]
  )
  .enableRLS();
export type DomainEvent = typeof domainEvent.$inferSelect;
export type NewDomainEvent = typeof domainEvent.$inferInsert;

export const eventDelivery = clinzo
  .table(
    "event_delivery",
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
      event_id: uuid("event_id")
        .notNull()
        .references((): AnyPgColumn => domainEvent.id, {
          onDelete: "restrict",
        }),
      consumer: text("consumer").notNull(),
      status: text("status", {
        enum: ["pending", "leased", "done", "dead"],
      }).notNull(),
      attempts: integer("attempts").notNull().default(0),
      available_at: timestamp("available_at", {
        withTimezone: true,
        mode: "date",
      })
        .notNull()
        .defaultNow(),
      lease_until: timestamp("lease_until", {
        withTimezone: true,
        mode: "date",
      }),
      last_error_code: text("last_error_code"),
    },
    (table) => [
      uniqueIndex("event_delivery_uq_1").on(table.event_id, table.consumer),
      index("event_delivery_event_id_idx").on(table.event_id),
      check("event_delivery_ck_1", sql.raw("attempts >= 0")),
      check("event_delivery_ck_2", sql.raw("row_version > 0")),
      check(
        "event_delivery_ck_3",
        sql.raw("\"status\" IN ('pending', 'leased', 'done', 'dead')")
      ),
    ]
  )
  .enableRLS();
export type EventDelivery = typeof eventDelivery.$inferSelect;
export type NewEventDelivery = typeof eventDelivery.$inferInsert;

export const idempotencyRecord = clinzo
  .table(
    "idempotency_record",
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
      principal_scope: text("principal_scope").notNull(),
      operation: text("operation").notNull(),
      key: text("key").notNull(),
      request_hash: bytea("request_hash").notNull(),
      resource_type: text("resource_type"),
      resource_id: uuid("resource_id"),
      result_code: text("result_code"),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
    },
    (table) => [
      uniqueIndex("idempotency_record_uq_1").on(
        table.principal_scope,
        table.operation,
        table.key
      ),
      check("idempotency_record_ck_1", sql.raw("expires_at > created_at")),
      check("idempotency_record_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type IdempotencyRecord = typeof idempotencyRecord.$inferSelect;
export type NewIdempotencyRecord = typeof idempotencyRecord.$inferInsert;
