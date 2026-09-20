const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");
// Compile only this app's TypeScript for Node's test runner, without adding a test runtime.
require.extensions[".ts"] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(result.outputText, filename);
};
const { initialSchedule } = require("../src/data/demo.ts");
const { scheduleError, previewSlots } = require("../src/features/schedule/utils/schedule.ts");
const { lookupPatient } = require("../src/features/patients/utils/patientLookup.ts");
const { useDoctorStore } = require("../src/stores/useDoctorStore.ts");

test("slots fit fully inside working hours and change with duration", () => {
  assert.equal(previewSlots(initialSchedule).length, 16);
  assert.equal(previewSlots(initialSchedule).at(-1), "04:30 PM");
  assert.deepEqual(
    previewSlots({
      ...initialSchedule,
      start: "12:00",
      end: "13:10",
      duration: 30,
    }),
    ["12:00 PM", "12:30 PM"]
  );
  assert.equal(previewSlots({ ...initialSchedule, duration: 60 }).length, 8);
});
test("invalid times, fees and no working days are rejected", () => {
  assert.ok(scheduleError({ ...initialSchedule, end: "08:00" }));
  assert.ok(scheduleError({ ...initialSchedule, start: "25:00" }));
  assert.ok(scheduleError({ ...initialSchedule, clinicFee: "-1" }));
  assert.ok(scheduleError({ ...initialSchedule, days: [] }));
  assert.equal(scheduleError(initialSchedule), undefined);
});
test("QR lookup accepts supported IDs and refuses arbitrary payloads", () => {
  assert.equal(lookupPatient(" clz-0001 ").name, "Meera Sharma");
  assert.equal(lookupPatient('{"patientId":"CLZ-0002"}').name, "Akashadeepa");
  for (const invalid of [
    "{broken",
    '{"patientId":7}',
    '{"patientId":"unknown"}',
    "https://example.com",
    "unknown",
  ])
    assert.equal(lookupPatient(invalid), undefined);
});
test("notes and prescriptions remain isolated by visit, including the same patient", () => {
  useDoctorStore.getState().reset();
  useDoctorStore
    .getState()
    .updateConsultation("clinic-meera", "CLZ-0001", {
      notes: "Clinic draft",
      signed: true,
    });
  const state = useDoctorStore.getState();
  assert.equal(state.consultations["clinic-meera"].notes, "Clinic draft");
  assert.equal(state.consultations["clinic-meera"].signed, true);
  assert.notEqual(state.consultations["home-meera"].notes, "Clinic draft");
  assert.equal(state.consultations["home-meera"].signed, false);
  assert.equal(state.consultations["online-akasha"].notes, "");
});
test("completion is idempotent and new lookup visits are initialized", () => {
  useDoctorStore.getState().reset();
  const state = useDoctorStore.getState();
  state.complete("lookup-CLZ-0002-clinic", "CLZ-0002");
  state.complete("lookup-CLZ-0002-clinic", "CLZ-0002");
  assert.equal(
    useDoctorStore
      .getState()
      .completedIds.filter((id) => id === "lookup-CLZ-0002-clinic").length,
    1
  );
  assert.equal(
    useDoctorStore.getState().consultations["lookup-CLZ-0002-clinic"].completed,
    true
  );
});
test("messages stay in their own conversation and reset clears session changes", () => {
  useDoctorStore.getState().reset();
  useDoctorStore.getState().sendMessage("home-meera", "On my way");
  assert.equal(
    useDoctorStore.getState().messages["home-meera"][0].text,
    "On my way"
  );
  assert.equal(useDoctorStore.getState().messages["online-akasha"], undefined);
  useDoctorStore
    .getState()
    .saveSchedule({ ...initialSchedule, homeVisits: true });
  useDoctorStore.getState().reset();
  assert.deepEqual(useDoctorStore.getState().messages, {});
  assert.equal(useDoctorStore.getState().schedule.homeVisits, false);
});
