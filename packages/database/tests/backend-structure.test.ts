import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../../../", import.meta.url));

const smokeRoot = join(root, "supabase/tests/smoke");

const runner = readFileSync(
  join(root, "packages/database/tooling/verify-disposable.ps1"),
  "utf8"
);

describe("shared backend structure", () => {
  test("every selected disposable smoke fixture resolves from the canonical directory", () => {
    const names = [...runner.matchAll(/File = "([^"]+\.cli-smoke\.sql)"/g)].map(
      (match) => match[1]!
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).not.toContain("/");
      expect(existsSync(join(smokeRoot, name))).toBe(true);
    }
    expect(runner).toContain('"supabase/tests/smoke/$($smoke.File)"');
  });

  test("smoke fixtures retain explicit rollback transactions", () => {
    const fixtures = readdirSync(smokeRoot).filter((name) =>
      name.endsWith(".cli-smoke.sql")
    );
    expect(fixtures.length).toBeGreaterThan(0);
    for (const name of fixtures) {
      const sql = readFileSync(join(smokeRoot, name), "utf8");
      expect(sql).toMatch(/\bBEGIN\s*;/i);
      expect(sql).toMatch(/\bROLLBACK\s*;/i);
    }
  });

  test("enabled local functions have real entry points while planned handlers remain disabled", () => {
    const config = readFileSync(join(root, "supabase/config.toml"), "utf8");
    const functions = [
      ...config.matchAll(/\[functions\.([^\]]+)\]\s*([\s\S]*?)(?=\n\[|$)/g),
    ];
    expect(functions.length).toBeGreaterThan(0);
    for (const [, name, settings] of functions) {
      if (!/enabled\s*=\s*true/.test(settings!)) continue;
      const entry = join(root, "supabase/functions", name!, "index.ts");
      expect(existsSync(entry)).toBe(true);
      expect(statSync(entry).size).toBeGreaterThan(0);
    }
    for (const name of ["dispatch-ambulance", "reserve-appointment"]) {
      const settings = functions.find(
        ([, candidate]) => candidate === name
      )?.[2];
      expect(settings).toMatch(/enabled\s*=\s*false/);
    }
    expect(config).toMatch(/\[db\.seed\]\s*enabled\s*=\s*false/);
  });

  test("the verification runner retains the linked-target rejection and apply opt-in", () => {
    expect(runner).toContain("$testRef -eq $linkedRef");
    expect(runner).toContain("if (-not $Apply)");
    expect(runner).toContain("--project-ref $testRef");
    expect(runner).toContain("$LASTEXITCODE -ne 0");
    expect(runner).toContain("$queryRows[0].$resultField -ne $true");
  });
});
