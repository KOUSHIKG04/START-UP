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
  test("domain tables use RLS and only online chat is public for Realtime", () => {
    expect(tables).toHaveLength(98);
    for (const table of tables) {
      const config = getTableConfig(table);
      expect(config.schema ?? "public").toBe(config.name === "online_message" ? "public" : "clinzo");
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
    const activeAppointmentIndex = getTableConfig(schema.appointment).indexes.find(
      (index) => index.config.name === "appointment_active_uq_1"
    );
    expect(activeAppointmentIndex?.config.columns.map((column) => "name" in column ? column.name : null)).toEqual([
      "patient_id",
      "window_id",
    ]);
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
    const text = readdirSync(migrationFolder)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => readFileSync(`${migrationFolder}/${name}`, "utf8"))
      .join("\n");
    for (const table of tables) {
      const name = getTableConfig(table).name;
      expect(
        text.includes(`CREATE TABLE "clinzo"."${name}"`) ||
        text.includes(`CREATE TABLE clinzo.${name}`) ||
        (name === "online_message" && text.includes("CREATE TABLE public.online_message"))
      ).toBe(true);
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
