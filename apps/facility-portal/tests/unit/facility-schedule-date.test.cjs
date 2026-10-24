const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

const file = path.join(
  __dirname,
  "../../src/features/doctors/utils/facilitySchedule.ts"
);

const compiled = {};

vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  {
    exports: compiled,
    require: () => ({}),
    Date,
    Intl,
    Map,
    Set,
    Number,
    Array,
  }
);

const { facilitySchedule } = compiled;

test("a newly published future session is shown on its date, not today", () => {
  const now = new Date("2026-10-15T08:00:00Z");
  const doctor = {
    id: "doctor-1",
    practice_id: "practice-1",
    name: "Test Doctor",
    specialization: "General Medicine",
    phone: "123",
    present: true,
    on_leave: false,
  };
  const session = {
    id: "session-1",
    starts_at: "2026-10-16T03:30:00Z",
    ends_at: "2026-10-16T07:30:00Z",
    timezone: "Asia/Kolkata",
    service_mode: "clinic",
    state: "published",
  };
  const sessions = [{ practiceId: "practice-1", session }];

  const today = facilitySchedule([doctor], sessions, now, "2026-10-15");
  assert.equal(today.assignments.length, 0);
  assert.equal(today.departments.length, 0);
  assert.equal(today.nextScheduledDay, "2026-10-16");

  const tomorrow = facilitySchedule([doctor], sessions, now, "2026-10-16");
  assert.equal(tomorrow.assignments[0].name, "Test Doctor");
  assert.equal(tomorrow.departments[0].shifts[0].doctor, "Test Doctor");
});

test("home visit sessions also appear in the published schedule view", () => {
  const now = new Date("2026-10-15T08:00:00Z");
  const doctor = {
    id: "doctor-1",
    practice_id: "practice-1",
    name: "Test Doctor",
    specialization: "General Medicine",
    phone: "123",
    present: true,
    on_leave: false,
  };
  const session = {
    id: "home-1",
    starts_at: "2026-10-16T10:30:00Z",
    ends_at: "2026-10-16T11:30:00Z",
    timezone: "Asia/Kolkata",
    service_mode: "home",
    state: "published",
  };
  const view = facilitySchedule(
    [doctor],
    [{ practiceId: "practice-1", session }],
    now,
    "2026-10-16"
  );
  assert.equal(view.assignments.length, 1);
  assert.equal(view.departments[0].shifts.length, 1);
});
