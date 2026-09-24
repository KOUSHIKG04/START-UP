// Aggregate inventory only; no patient admissions or individual-bed allocation.
import { sql } from "drizzle-orm";
import {
  uuid,
  text,
  integer,
  bigint,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { clinzo } from "./common";
import { facility } from "./organizations";
import { identity } from "./identity";

export const bedType = clinzo
  .table(
    "bed_type",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      code: text("code").notNull(),
      name: text("name").notNull(),
    },
    (table) => [uniqueIndex("bed_type_code_uq").on(table.code)]
  )
  .enableRLS();

export const facilityBedInventory = clinzo
  .table(
    "facility_bed_inventory",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      facility_id: uuid("facility_id")
        .notNull()
        .references(() => facility.id, { onDelete: "restrict" }),
      bed_type_id: uuid("bed_type_id")
        .notNull()
        .references(() => bedType.id, { onDelete: "restrict" }),
      total: integer("total").notNull(),
      occupied: integer("occupied").notNull(),
      maintenance: integer("maintenance").notNull(),
      observed_at: timestamp("observed_at", {
        withTimezone: true,
        mode: "date",
      }).notNull(),
      updated_by: uuid("updated_by")
        .notNull()
        .references(() => identity.id, { onDelete: "restrict" }),
      created_at: timestamp("created_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" })
        .notNull()
        .defaultNow(),
      row_version: bigint("row_version", { mode: "bigint" })
        .notNull()
        .default(sql`1`),
    },
    (table) => [
      uniqueIndex("facility_bed_inventory_facility_type_uq").on(
        table.facility_id,
        table.bed_type_id
      ),
      index("facility_bed_inventory_type_idx").on(table.bed_type_id),
      index("facility_bed_inventory_actor_idx").on(table.updated_by),
      check(
        "facility_bed_inventory_counts_ck",
        sql`${table.total} >= 0 AND ${table.occupied} >= 0 AND ${table.maintenance} >= 0 AND ${table.occupied}::bigint + ${table.maintenance}::bigint <= ${table.total}`
      ),
      check("facility_bed_inventory_version_ck", sql`${table.row_version} > 0`),
    ]
  )
  .enableRLS();

export type FacilityBedInventory = typeof facilityBedInventory.$inferSelect;
export type NewFacilityBedInventory = typeof facilityBedInventory.$inferInsert;
