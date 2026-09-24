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
import { session } from "./scheduling";

export const sessionQueue = clinzo
  .table(
    "session_queue",
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
      next_ticket: integer("next_ticket").notNull().default(1),
      queue_version: bigint("queue_version", { mode: "bigint" })
        .notNull()
        .default(sql`0`),
    },
    (table) => [
      uniqueIndex("session_queue_uq_1").on(table.session_id),
      index("session_queue_session_id_idx").on(table.session_id),
      check(
        "session_queue_ck_1",
        sql.raw("next_ticket > 0 AND queue_version >= 0")
      ),
      check("session_queue_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type SessionQueue = typeof sessionQueue.$inferSelect;
export type NewSessionQueue = typeof sessionQueue.$inferInsert;

export const queueEntry = clinzo
  .table(
    "queue_entry",
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
      queue_id: uuid("queue_id")
        .notNull()
        .references((): AnyPgColumn => sessionQueue.id, {
          onDelete: "restrict",
        }),
      appointment_id: uuid("appointment_id")
        .notNull()
        .references((): AnyPgColumn => appointment.id, {
          onDelete: "restrict",
        }),
      ticket_number: integer("ticket_number").notNull(),
      state: text("state", {
        enum: [
          "awaiting_arrival",
          "waiting",
          "called",
          "in_service",
          "held",
          "completed",
          "cancelled",
          "no_show",
        ],
      }).notNull(),
      priority: smallint("priority").notNull().default(0),
      order_key: bigint("order_key", { mode: "bigint" }).notNull(),
      called_at: timestamp("called_at", { withTimezone: true, mode: "date" }),
      hold_reason: text("hold_reason"),
    },
    (table) => [
      uniqueIndex("queue_entry_uq_1").on(table.appointment_id),
      uniqueIndex("queue_entry_uq_2").on(table.queue_id, table.ticket_number),
      uniqueIndex("queue_entry_active_uq_1")
        .on(table.queue_id)
        .where(sql.raw("state IN ('called','in_service')")),
      index("queue_entry_queue_id_idx").on(table.queue_id),
      index("queue_entry_appointment_id_idx").on(table.appointment_id),
      check("queue_entry_ck_1", sql.raw("ticket_number > 0")),
      check(
        "queue_entry_ck_2",
        sql.raw(
          "state <> 'held' OR (hold_reason IS NOT NULL AND length(trim(hold_reason)) > 0)"
        )
      ),
      check("queue_entry_ck_3", sql.raw("row_version > 0")),
      check(
        "queue_entry_ck_4",
        sql.raw(
          "\"state\" IN ('awaiting_arrival', 'waiting', 'called', 'in_service', 'held', 'completed', 'cancelled', 'no_show')"
        )
      ),
    ]
  )
  .enableRLS();
export type QueueEntry = typeof queueEntry.$inferSelect;
export type NewQueueEntry = typeof queueEntry.$inferInsert;
