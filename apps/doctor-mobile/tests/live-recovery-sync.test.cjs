const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const vm = require("node:vm");

const ts = require("typescript");

function mount() {
  const invalidated = [];
  let listener;
  let cleanup;
  let disconnects = 0;
  const exports = {};
  const mocks = {
    react: {
      useEffect: (fn) => {
        cleanup = fn();
      },
    },
    "react-native": {
      AppState: {
        currentState: "active",
        addEventListener: () => ({ remove() {} }),
      },
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({
        invalidateQueries: ({ queryKey }) => {
          invalidated.push(queryKey[0]);
          return Promise.resolve();
        },
      }),
    },
    "@startup/data-access": {
      subscribeAppChanges: (_client, _scope, handlers) => {
        listener = handlers;
        return () => disconnects++;
      },
    },
    "@startup/mobile-ui": { useToast: () => ({ showToast() {} }) },
    "./supabase": { supabase: {}, mobileSession: { refresh: async () => {} } },
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        require.resolve("../src/services/LiveUpdatesBridge.tsx"),
        "utf8"
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText,
    { exports, require: (name) => mocks[name], queueMicrotask }
  );
  exports.LiveUpdatesBridge({ identityId: "doctor" });
  return {
    invalidated,
    listener,
    cleanup: () => cleanup(),
    get disconnects() {
      return disconnects;
    },
  };
}

test("Facility policy changes refresh Doctor attendance deadlines and reschedule availability", async () => {
  const app = mount();
  app.listener.onChange({ kind: "schedule" });
  await new Promise(queueMicrotask);
  for (const key of [
    "my-doctor-schedule",
    "doctor-clinic-appointments",
    "doctor-reschedule-options",
  ])
    assert.ok(app.invalidated.includes(key), `${key} must refresh`);
  app.cleanup();
  assert.equal(app.disconnects, 1);
});

test("appointment changes refresh the Doctor replacement slots without resetting schedule data", async () => {
  const app = mount();
  app.listener.onChange({ kind: "appointments" });
  await new Promise(queueMicrotask);
  assert.ok(app.invalidated.includes("doctor-reschedule-options"));
  assert.ok(app.invalidated.includes("doctor-clinic-appointments"));
  assert.equal(app.invalidated.includes("my-doctor-schedule"), false);
  app.cleanup();
});
