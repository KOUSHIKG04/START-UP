import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function harness(loadDay) {
  const states = [];
  let cursor = 0;
  const tasks = [];
  const requests = [];
  const host = { exports: {} };
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const day = {
    local_day: today,
    timezone: "Asia/Kolkata",
    walkin_remaining: 3,
    slots: [
      { windowId: "window", practiceServiceId: "service", state: "open" },
    ],
  };
  const actions = {
    loadPortalWalkInPractices: async () => [],
    loadPortalWalkInSlots: loadDay || (async () => day),
    createPortalWalkInAppointment: async (input) => {
      requests.push(input);
      return { error: null };
    },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        new URL(
          "../../src/features/appointments/hooks/useNewAppointment.ts",
          import.meta.url
        ),
        "utf8"
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText,
    {
      module: host,
      exports: host.exports,
      Date,
      Intl,
      crypto,
      require(name) {
        if (name === "react")
          return {
            useState(initial) {
              const index = cursor++;
              if (!(index in states))
                states[index] =
                  typeof initial === "function" ? initial() : initial;
              return [
                states[index],
                (value) => {
                  states[index] = value;
                },
              ];
            },
            useRef(initial) {
              const index = cursor++;
              return (states[index] ||= { current: initial });
            },
            useTransition() {
              return [false, (callback) => tasks.push(callback())];
            },
          };
        if (name === "next/navigation")
          return { useRouter: () => ({ refresh() {} }) };
        if (name.includes("toast")) return { toast: { add() {} } };
        if (name === "../server/actions") return actions;
        throw new Error(name);
      },
    }
  );
  return {
    day,
    requests,
    render() {
      cursor = 0;
      return host.exports.useNewAppointment({ onCreated() {} });
    },
    finish: () => Promise.all(tasks),
  };
}

test("reception only registers an open time with remaining walk-in capacity", async () => {
  for (const unavailable of ["quota", "booked"]) {
    const h = harness();
    if (unavailable === "quota") h.day.walkin_remaining = 0;
    else h.day.slots[0].state = "booked";
    await h.render().choosePractice("practice");
    let form = h.render();
    form.setWindowId("window");
    form.setPatientName("Patient");
    h.render().submit({ preventDefault() {} });
    await h.finish();
    assert.equal(h.requests.length, 0);
  }
});

test("demographics reach registration and check-in is limited to the selected clinic day", async () => {
  for (const future of [false, true]) {
    const h = harness();
    if (future) h.day.local_day = "2099-01-01";
    await h.render().choosePractice("practice");
    const form = h.render();
    form.setWindowId("window");
    form.setPatientName(" Patient ");
    form.setPatientAge("29");
    form.setPatientGender("Other");
    h.render().submit({ preventDefault() {} });
    await h.finish();
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].patientName, "Patient");
    assert.equal(h.requests[0].patientAge, 29);
    assert.equal(h.requests[0].patientGender, "Other");
    assert.equal(h.requests[0].checkIn, !future);
  }
});

test("a slower previous doctor request cannot replace the selected doctor's clinic day", async () => {
  const resolvers = {};
  const h = harness(
    (id) =>
      new Promise((resolve) => {
        resolvers[id] = resolve;
      })
  );
  const first = h.render().choosePractice("first");
  const second = h.render().choosePractice("second");
  resolvers.second({ ...h.day, local_day: "2099-02-02" });
  await second;
  resolvers.first({ ...h.day, local_day: "2099-01-01" });
  await first;
  assert.equal(h.render().practiceId, "second");
  assert.equal(h.render().clinicDay.local_day, "2099-02-02");
});
