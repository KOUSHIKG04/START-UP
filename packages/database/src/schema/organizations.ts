// Server-only Drizzle models. Never import into a web/mobile client bundle.
import { sql } from "drizzle-orm";
import { unique } from "drizzle-orm/pg-core";
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
import { doctorFacility } from "./directory";
import { identity } from "./identity";

export const organization = clinzo
  .table(
    "organization",
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
      name: text("name").notNull(),
      kind: text("kind", {
        enum: ["care_provider", "ambulance_operator", "mixed"],
      }).notNull(),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("organization_uq_1").on(table.public_code),
      check("organization_ck_1", sql.raw("row_version > 0")),
      check(
        "organization_ck_2",
        sql.raw("\"kind\" IN ('care_provider', 'ambulance_operator', 'mixed')")
      ),
    ]
  )
  .enableRLS();
export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

export const facility = clinzo
  .table(
    "facility",
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
      organization_id: uuid("organization_id")
        .notNull()
        .references((): AnyPgColumn => organization.id, {
          onDelete: "restrict",
        }),
      public_code: text("public_code").notNull(),
      name: text("name").notNull(),
      kind: text("kind", { enum: ["hospital", "clinic"] }).notNull(),
      address: text("address").notNull(),
      location: geographyPoint("location").notNull(),
      timezone: text("timezone").notNull().default("Asia/Kolkata"),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("facility_uq_1").on(table.public_code),
      index("facility_organization_id_idx").on(table.organization_id),
      index("facility_location_geo_idx").using("gist", table.location),
      check("facility_ck_1", sql.raw("row_version > 0")),
      check("facility_ck_2", sql.raw("\"kind\" IN ('hospital', 'clinic')")),
    ]
  )
  .enableRLS();
export type Facility = typeof facility.$inferSelect;
export type NewFacility = typeof facility.$inferInsert;

export const organizationMember = clinzo
  .table(
    "organization_member",
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
      identity_id: uuid("identity_id")
        .notNull()
        .references((): AnyPgColumn => identity.id, { onDelete: "restrict" }),
      organization_id: uuid("organization_id")
        .notNull()
        .references((): AnyPgColumn => organization.id, {
          onDelete: "restrict",
        }),
      facility_id: uuid("facility_id").references(
        (): AnyPgColumn => facility.id,
        { onDelete: "restrict" }
      ),
      role: text("role", {
        enum: [
          "owner",
          "receptionist",
          "facility_admin",
          "dispatcher",
          "organization_admin",
        ],
      }).notNull(),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      unique("organization_member_uq_1")
        .on(
          table.identity_id,
          table.organization_id,
          table.facility_id,
          table.role
        )
        .nullsNotDistinct(),
      index("organization_member_identity_id_idx").on(table.identity_id),
      index("organization_member_organization_id_idx").on(
        table.organization_id
      ),
      index("organization_member_facility_id_idx").on(table.facility_id),
      check(
        "organization_member_ck_1",
        sql.raw(
          "role NOT IN ('receptionist','facility_admin') OR facility_id IS NOT NULL"
        )
      ),
      check("organization_member_ck_2", sql.raw("row_version > 0")),
      check(
        "organization_member_ck_3",
        sql.raw(
          "\"role\" IN ('owner', 'receptionist', 'facility_admin', 'dispatcher', 'organization_admin')"
        )
      ),
    ]
  )
  .enableRLS();
export type OrganizationMember = typeof organizationMember.$inferSelect;
export type NewOrganizationMember = typeof organizationMember.$inferInsert;

export const memberDoctorScope = clinzo
  .table(
    "member_doctor_scope",
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
      member_id: uuid("member_id")
        .notNull()
        .references((): AnyPgColumn => organizationMember.id, {
          onDelete: "restrict",
        }),
      doctor_facility_id: uuid("doctor_facility_id")
        .notNull()
        .references((): AnyPgColumn => doctorFacility.id, {
          onDelete: "restrict",
        }),
      active: boolean("active").notNull().default(true),
    },
    (table) => [
      uniqueIndex("member_doctor_scope_uq_1").on(
        table.member_id,
        table.doctor_facility_id
      ),
      index("member_doctor_scope_member_id_idx").on(table.member_id),
      index("member_doctor_scope_doctor_facility_id_idx").on(
        table.doctor_facility_id
      ),
      check("member_doctor_scope_ck_1", sql.raw("row_version > 0")),
    ]
  )
  .enableRLS();
export type MemberDoctorScope = typeof memberDoctorScope.$inferSelect;
export type NewMemberDoctorScope = typeof memberDoctorScope.$inferInsert;
