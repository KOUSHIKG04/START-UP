const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

function load(file, requireFn = require, extra = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: requireFn,
    ...extra,
  });
  return module.exports;
}

const { greetingForTime } = load("utils/greeting.ts");

test("greetings use the device-local hour across every boundary", () => {
  for (const [hour, minute, expected] of [
    [0, 0, "Night"],
    [4, 59, "Night"],
    [5, 0, "Morning"],
    [11, 59, "Morning"],
    [12, 0, "Afternoon"],
    [16, 59, "Afternoon"],
    [17, 0, "Evening"],
    [20, 59, "Evening"],
    [21, 0, "Night"],
    [23, 59, "Night"],
  ]) {
    assert.equal(
      greetingForTime(new Date(2026, 9, 10, hour, minute)),
      `Good ${expected}`
    );
  }
});

test("clock refreshes on a timer and resume, with no updates after cleanup", () => {
  let effect,
    timer,
    resume,
    cleanup,
    removed = false,
    cleared = false,
    now = "Good Morning";
  const updates = [];
  const { useTimeGreeting } = load(
    "hooks/useTimeGreeting.ts",
    (id) => {
      if (id === "react")
        return {
          useState: (init) => [init(), (value) => updates.push(value)],
          useEffect: (fn) => {
            effect = fn;
          },
        };
      if (id === "react-native")
        return {
          AppState: {
            addEventListener: (event, callback) => {
              resume = callback;
              return {
                remove: () => {
                  removed = true;
                },
              };
            },
          },
        };
      return { greetingForTime: () => now };
    },
    {
      setInterval: (fn) => {
        timer = fn;
        return 1;
      },
      clearInterval: () => {
        cleared = true;
      },
    }
  );
  assert.equal(useTimeGreeting(), "Good Morning");
  cleanup = effect();
  now = "Good Afternoon";
  timer();
  now = "Good Evening";
  resume("active");
  resume("background");
  assert.deepEqual(updates, ["Good Morning", "Good Afternoon", "Good Evening"]);
  cleanup();
  assert.equal(removed && cleared, true);
});
