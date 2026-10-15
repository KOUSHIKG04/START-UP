import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const source = fs.readFileSync(new URL("../utils/scheduleEditor.ts", import.meta.url), "utf8");
const moduleHost = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: moduleHost.exports, module: moduleHost, Intl, Date, Error, Number });
const { practiceSlotIso, previewClocks, suggestConsultationDuration } = moduleHost.exports;
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

test("duration suggestion follows working hours and daily cap without exceeding duration bounds", () => {
  assert.equal(suggestConsultationDuration("09:00", "17:00", 12), 40);
  assert.equal(suggestConsultationDuration("09:00", "17:00", 8), 60);
  assert.equal(suggestConsultationDuration("22:00", "24:00", 7), 15);
  assert.equal(suggestConsultationDuration("09:00", "17:00", 0), null);
  assert.equal(suggestConsultationDuration("17:00", "09:00", 12), null);
});

function load(relative, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(relative, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => mocks[name] });
  return exports;
}

function editor({ mode = "clinic", published = false } = {}) {
  const state = [], publications = [], tasks = [], toasts = []; let cursor = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const settings = { practice_id: "practice-a", row_version: "8", working_days: [1], online_working_days: [2], home_working_days: [3],
    clinic_start: "09:00", clinic_end: "17:00", online_start: "16:00", online_end: "18:00", home_start: "18:00", home_end: "19:00",
    slot_minutes: 60, online_slot_minutes: 30, home_slot_minutes: 60, walkin_daily_limit: 12, online_daily_limit: 8,
    auto_accept: false, auto_accept_limit: 0, home_visits: false, home_radius_km: null,
    clinic_fee_minor: 10000, online_fee_minor: 20000, home_fee_minor: 30000, published_modes: published ? [mode] : [] };
  const { FacilityDoctorScheduleScreen } = load("../screens/FacilityDoctorScheduleScreen.tsx", {
    react: {
      useState: initial => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === "function" ? initial() : initial; return [state[i], next => { state[i] = typeof next === "function" ? next(state[i]) : next; }]; },
      useTransition: () => [false, fn => tasks.push(fn())],
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { default: "Link" }, "next/navigation": { useRouter: () => ({ refresh: () => {} }) },
    "@tanstack/react-query": { useQueryClient: () => ({ setQueryData: () => {}, invalidateQueries: async () => {} }),
      useQuery: () => ({ data: { ok: true, doctor: { name: "Doctor", booking_timezone: "Asia/Kolkata" }, settings } }) },
    "lucide-react": {},
    "@startup/web-ui/components/ui/button": { Button: "Button" },
    "@startup/web-ui/components/ui/input": { Input: "Input" },
    "@startup/web-ui/components/ui/skeleton": {}, "@startup/web-ui/components/ui/spinner": {},
    "@startup/web-ui/components/ui/dialog": { Dialog: "Dialog", DialogContent: "DialogContent", DialogTitle: "DialogTitle", DialogDescription: "DialogDescription" },
    "@startup/web-ui/components/ui/toast": { toast: { add: value => toasts.push(value) } },
    "@startup/contracts": { doctorScheduleSettingsSchema: { safeParse: () => ({ success: true }) }, formatDisplayDate: value => value },
    "../components/ClockTimePicker": { ClockTimePicker: "Time" },
    "../components/ClockDurationPicker": { ClockDurationPicker: "Duration" },
    "../components/UnavailableDatePicker": { UnavailableDatePicker: "DatePicker" },
    "../components/FacilityUnavailableTime": {},
    "../server/scheduleActions": { publishFacilityDoctorSchedule: async (...args) => { publications.push(args); return { ok: true, settings: { ...settings, published_modes: [mode] } }; } },
    "../utils/facilityScheduleEditorConstants": load("../utils/facilityScheduleEditorConstants.ts"),
    "../utils/scheduleEditor": moduleHost.exports,
  });
  function render() {
    cursor = 0; const nodes = [];
    function walk(node) { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== "object") return; nodes.push(node); walk(node.props?.children); }
    const entry = FacilityDoctorScheduleScreen({ practiceId: "practice-a", mode });
    walk(entry.type(entry.props)); return nodes;
  }
  return { render, publications, toasts, finish: () => Promise.all(tasks) };
}

for (const mode of ["clinic", "online"]) test(`${mode} setup previews before applying, keeps duration on cap edits, and publishes the chosen date`, async () => {
  const view = editor({ mode }); let nodes = view.render();
  const initialDuration = nodes.find(node => node.type === "Duration").props.value;
  nodes.find(node => node.props.children === "Suggest duration").props.onClick();
  nodes = view.render();
  assert.equal(nodes.find(node => node.type === "Duration").props.value, initialDuration);
  assert.equal(nodes.filter(node => node.type === "Dialog").at(-1).props.open, true);
  nodes.find(node => node.props.children === "Use this duration").props.onClick();
  nodes = view.render();
  const duration = mode === "clinic" ? 40 : 15;
  assert.equal(nodes.find(node => node.type === "Duration").props.value, duration);
  nodes.find(node => node.props.title === "Daily booking limit").props.onChange(20);
  nodes = view.render();
  assert.equal(nodes.find(node => node.type === "Duration").props.value, duration);
  const picker = nodes.find(node => node.type === "DatePicker");
  const chosen = new Date(Date.parse(`${picker.props.value}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  picker.props.onChange(chosen);
  nodes = view.render();
  nodes.find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  await view.finish();
  const [practice, selectedMode, settings, version, date] = view.publications[0];
  assert.equal(practice, "practice-a"); assert.equal(selectedMode, mode); assert.equal(version, 8); assert.equal(date, chosen);
  assert.equal(settings[mode === "clinic" ? "slotMinutes" : "onlineSlotMinutes"], duration);
  assert.equal(settings[mode === "clinic" ? "onlineSlotMinutes" : "slotMinutes"], mode === "clinic" ? 30 : 60);
  assert.equal(view.toasts.at(-1).type, "success");
});

test("published schedule keeps a sixty-minute duration and hides setup recalculation", async () => {
  const view = editor({ published: true }); let nodes = view.render();
  assert.equal(nodes.find(node => node.props.children === "Suggest duration"), undefined);
  nodes.find(node => node.props.title === "Daily booking limit").props.onChange(30);
  nodes = view.render();
  assert.equal(nodes.find(node => node.type === "Duration").props.value, 60);
  nodes.find(node => node.type === "form").props.onSubmit({ preventDefault() {} }); await view.finish();
  assert.equal(view.publications[0][2].slotMinutes, 60);
});
