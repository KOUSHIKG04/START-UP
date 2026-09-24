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
import { identity, patient } from "./identity";
import { facility, organization } from "./organizations";

export const auditLog = clinzo
  .table(
    "audit_log",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      actor_id: uuid("actor_id").references((): AnyPgColumn => identity.id, {
        onDelete: "restrict",
      }),
      guest_session_id: uuid("guest_session_id").references(
        (): AnyPgColumn => guestEmergencySession.id,
        { onDelete: "restrict" }
      ),
      actor_kind: text("actor_kind", {
        enum: ["identity", "guest", "system"],
      }).notNull(),
      action: text("action").notNull(),
      resource_type: text("resource_type").notNull(),
      resource_id: uuid("resource_id"),
      organization_id: uuid("organization_id").references(
        (): AnyPgColumn => organization.id,
        { onDelete: "restrict" }
      ),
      facility_id: uuid("facility_id").references(
        (): AnyPgColumn => facility.id,
        { onDelete: "restrict" }
      ),
      request_id: uuid("request_id").notNull(),
      outcome: text("outcome", {
        enum: ["allowed", "denied", "failed"],
      }).notNull(),
      reason: text("reason"),
      metadata: jsonb("metadata").$type<JsonValue>().notNull(),
    },
    (table) => [
      index("audit_log_actor_id_idx").on(table.actor_id),
      index("audit_log_guest_session_id_idx").on(table.guest_session_id),
      index("audit_log_organization_id_idx").on(table.organization_id),
      index("audit_log_facility_id_idx").on(table.facility_id),
      check(
        "audit_log_ck_1",
        sql.raw(
          "(actor_kind='identity' AND actor_id IS NOT NULL AND guest_session_id IS NULL) OR (actor_kind='guest' AND guest_session_id IS NOT NULL AND actor_id IS NULL) OR (actor_kind='system' AND actor_id IS NULL AND guest_session_id IS NULL)"
        )
      ),
      check(
        "audit_log_ck_2",
        sql.raw("\"actor_kind\" IN ('identity', 'guest', 'system')")
      ),
      check(
        "audit_log_ck_3",
        sql.raw("\"outcome\" IN ('allowed', 'denied', 'failed')")
      ),
    ]
  )
  .enableRLS();
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export const clinicalAccessGrant = clinzo
  .table(
    "clinical_access_grant",
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
      identity_id: uuid("identity_id")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      facility_id: uuid("facility_id")
        .notNull()
        .references((): AnyPgColumn => facility.id, { onDelete: "restrict" }),
      granted_by: uuid("granted_by")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      reason: text("reason").notNull(),
      expires_at: timestamp("expires_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      revoked_at: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    },
    (table) => [
      index("clinical_access_grant_patient_id_idx").on(table.patient_id),
      index("clinical_access_grant_identity_id_idx").on(table.identity_id),
      index("clinical_access_grant_facility_id_idx").on(table.facility_id),
      index("clinical_access_grant_granted_by_idx").on(table.granted_by),
      check("clinical_access_grant_ck_1", sql.raw("expires_at > created_at")),
      check("clinical_access_grant_ck_2", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type ClinicalAccessGrant = typeof clinicalAccessGrant.$inferSelect;
export type NewClinicalAccessGrant = typeof clinicalAccessGrant.$inferInsert;
