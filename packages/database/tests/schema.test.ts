import { describe, expect, test } from "bun:test";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../src/schema";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
const migrationFolder = fileURLToPath(
  new URL("../../../supabase/migrations", import.meta.url)
);

const tables = Object.values(schema).filter((value) => is(value, PgTable));
describe("database model contract", () => {
  test("all 83 domain tables are private and RLS-enabled", () => {
    expect(tables).toHaveLength(83);
    for (const table of tables) {
      const config = getTableConfig(table);
      expect(config.schema).toBe("clinzo");
      expect(config.enableRLS).toBe(true);
    }
  });
  test("a clinic owner is an account membership, not a required employee", () => {
    const config = getTableConfig(schema.organizationMember);
    expect(config.columns.map((c) => c.name)).toContain("identity_id");
    expect(schema.organizationMember.role.enumValues).toContain("owner");
    expect(Object.keys(schema)).not.toContain("staff");
    expect(config.uniqueConstraints.some((c) => c.nullsNotDistinct)).toBe(true);
  });
  test("protects active appointments and driver/vehicle/booking exclusivity", () => {
    expect(
      getTableConfig(schema.appointment).indexes.filter(
        (i) => i.config.unique && i.config.where
      )
    ).toHaveLength(1);
    expect(
      getTableConfig(schema.ambulanceAssignment).indexes.filter(
        (i) => i.config.unique && i.config.where
      )
    ).toHaveLength(3);
    expect(
      getTableConfig(schema.queueEntry).indexes.filter(
        (i) => i.config.unique && i.config.where
      )
    ).toHaveLength(1);
  });
  test("migration coverage and database-only protections are present", () => {
    const migrations = readMigrationFiles({
      migrationsFolder: migrationFolder,
    });
    expect(migrations.length).toBeGreaterThanOrEqual(2);
    const text = migrations.flatMap((m) => m.sql).join("\n");
    for (const table of tables) {
      expect(text).toContain(
        'CREATE TABLE "clinzo"."' + getTableConfig(table).name + '"'
      );
    }
    expect(text).toContain("CREATE EXTENSION IF NOT EXISTS postgis");
    expect(text).not.toContain('"extensions.geography(');
    expect(text).toContain("doctor_sessions_do_not_overlap");
    expect(text).toContain("can_manage_practice");
    expect(text).toContain("REVOKE ALL ON SCHEMA clinzo FROM PUBLIC");
    // Composite FK prerequisites must exist before ALTER TABLE adds the FK.
    const initial = migrations[0]!.sql.join("\n");
    const firstForeignKey = initial.indexOf("FOREIGN KEY");
    for (const name of [
      "doctor_facility_uq_2",
      "doctor_booking_day_uq_2",
      "appointment_window_uq_2",
      "session_service_uq_1",
      "driver_shift_uq_1",
    ]) {
      const indexAt = initial.indexOf('CREATE UNIQUE INDEX "' + name + '"');
      expect(indexAt).toBeGreaterThan(-1);
      expect(indexAt).toBeLessThan(firstForeignKey);
    }
  });
  test("the public directory is a bounded explicit projection over private tables", () => {
    const sql = readdirSync(migrationFolder)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => readFileSync(`${migrationFolder}/${name}`, "utf8"))
      .join("\n");
    expect(sql).toContain("public.list_public_practices");
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain("p_limit < 1 OR p_limit > 50");
    expect(sql).toContain("d.credential_status = 'verified'");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.list_public_practices(integer) FROM PUBLIC"
    );
  });
});
