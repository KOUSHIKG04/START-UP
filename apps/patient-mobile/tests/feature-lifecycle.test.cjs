const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.resolve(__dirname, file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in mocks, `Unmocked import ${name}`);
      return mocks[name];
    },
    ...globals,
  });
  return exports;
}

test("device notification cleanup removes every listener and ignores a late response", async () => {
  const effects = [],
    removed = [],
    opened = [],
    toasts = [];
  let resolveResponse,
    foreground,
    registrations = 0;
  const Notifications = {
    addPushTokenListener: () => ({ remove: () => removed.push("token") }),
    addNotificationResponseReceivedListener: () => ({
      remove: () => removed.push("response"),
    }),
    addNotificationReceivedListener: (callback) => {
      foreground = callback;
      return { remove: () => removed.push("foreground") };
    },
    getLastNotificationResponseAsync: () =>
      new Promise((resolve) => {
        resolveResponse = resolve;
      }),
    clearLastNotificationResponseAsync: () => {
      throw Error("Disposed listener cleared a response");
    },
  };
  const { useDeviceNotifications } = load(
    "../src/features/notifications/hooks/useDeviceNotifications.ts",
    {
      react: { useEffect: (effect) => effects.push(effect) },
      "react-native": { Platform: { OS: "android" } },
      "../services/deviceNotifications": {
        Notifications,
        register: async () => {
          registrations++;
        },
        openNotification: (response) => opened.push(response),
      },
    }
  );
  useDeviceNotifications("patient", (toast) => toasts.push(toast));
  const cleanup = effects[0]();
  foreground({
    request: { content: { title: "Appointment confirmed", body: "Ready" } },
  });
  assert.equal(toasts[0].type, "success");
  cleanup();
  resolveResponse({ notification: {} });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(registrations, 1);
  assert.deepEqual(removed, ["token", "response", "foreground"]);
  assert.deepEqual(opened, []);
});

test("OTP verification retains its route, resend cooldown and timer cleanup", async () => {
  const effects = [],
    updates = [],
    calls = [],
    routes = [],
    cleared = [];
  let index = 0;
  const client = {};
  const { useVerifyOtp } = load(
    "../src/features/auth/hooks/useVerifyOtp.ts",
    {
      "@startup/mobile-ui": { useToastFeedback() {} },
      react: {
        useState: (value) => {
          const key = index++;
          return [value, (next) => updates.push({ key, next })];
        },
        useRef: (value) => ({ current: value }),
        useEffect: (effect) => effects.push(effect),
      },
      "expo-router": {
        useLocalSearchParams: () => ({ phone: "+919876543210" }),
        router: { replace: (route) => routes.push(route) },
      },
      "@startup/data-access": {
        verifyPhoneOtp: async (...args) => calls.push(args),
        sendPhoneOtp: async () => {
          throw Error("Resent during cooldown");
        },
      },
      "../../../services/supabase": { supabase: client },
    },
    { setTimeout: () => 42, clearTimeout: (id) => cleared.push(id) }
  );
  const state = useVerifyOtp();
  const cleanup = effects[0]();
  cleanup();
  assert.deepEqual(cleared, [42]);
  await state.resend();
  assert.equal(calls.length, 0);
  await state.verify("12345");
  assert.equal(calls.length, 0);
  await state.verify("123456");
  assert.deepEqual(calls, [[client, "+919876543210", "123456"]]);
  assert.deepEqual(routes, ["/setup"]);
  assert.equal(updates.at(-1).next, false);
});
