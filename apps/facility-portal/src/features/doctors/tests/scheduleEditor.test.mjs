import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const source = fs.readFileSync(new URL("../utils/scheduleEditor.ts", import.meta.url), "utf8");
const moduleHost = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: moduleHost.exports, module: moduleHost, Intl, Date, Error, Number });
const { practiceSlotIso, previewClocks } = moduleHost.exports;
test("practice timezone is independent of browser timezone", () => {
  assert.equal(practiceSlotIso("2026-10-20","09:00","Asia/Kolkata"),"2026-10-20T03:30:00.000Z");
  assert.equal(practiceSlotIso("2026-10-20","09:00","America/New_York"),"2026-10-20T13:00:00.000Z");
});
test("nonexistent DST times are rejected", () => assert.throws(() => practiceSlotIso("2026-03-08","02:30","America/New_York"), /does not exist/));
test("24:00 closes the day; incomplete slots and invalid windows are excluded", () => {
  assert.equal(JSON.stringify(previewClocks("23:00","24:00",30)), JSON.stringify(["23:00","23:30"]));
  assert.equal(JSON.stringify(previewClocks("09:00","09:40",30)), JSON.stringify(["09:00"]));
  assert.equal(previewClocks("24:00","24:00",15).length,0);
});
