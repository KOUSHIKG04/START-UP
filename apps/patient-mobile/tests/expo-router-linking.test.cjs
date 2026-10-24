const assert = require("node:assert/strict");

const fs = require("node:fs");

const { createRequire } = require("node:module");

const path = require("node:path");

const vm = require("node:vm");

const { test } = require("node:test");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((fulfill, fail) => {
    resolve = fulfill;
    reject = fail;
  });
  return { promise, resolve, reject };
}

// Execute the installed native linking hook. Effects are deliberately delayed so
// URL resolution can be exercised before commit, after commit and after cleanup.
function linking({
  app = "patient-mobile",
  initialURL,
  currentPath,
  enabled = true,
} = {}) {
  const appRequire = createRequire(
    path.resolve(__dirname, "../..", app, "package.json")
  );
  const filename = path.join(
    path.dirname(appRequire.resolve("expo-router/package.json")),
    "build/fork/useLinking.native.js"
  );
  const effects = [];
  const reports = [];
  const dispatches = [];
  let cleanups = [];
  let listener;
  let initialLookups = 0;
  let removals = 0;
  const mocks = {
    react: {
      useRef: (value) => ({ current: value }),
      useCallback: (callback) => callback,
      useEffect: (effect) => effects.push(effect),
    },
    "react-native": { Linking: {}, Platform: { OS: "android" } },
    "expo-linking": {},
    "./extractPathFromURL": {
      extractExpoPathFromURL: (_prefixes, url) =>
        url.startsWith("clinzo://")
          ? `/${url.slice("clinzo://".length)}`
          : undefined,
    },
    "../react-navigation/native": {
      useNavigationIndependentTree: () => false,
      getStateFromPath: (routePath) => ({
        routes: [{ name: "detail", path: routePath }],
      }),
      getActionFromState: (state) => ({ type: "NAVIGATE", payload: state }),
    },
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    exports,
    process: { env: { NODE_ENV: "test" } },
    console,
    require: (name) => {
      assert.ok(name in mocks, `Unexpected dependency: ${name}`);
      return mocks[name];
    },
  });
  const hook = exports.useLinking(
    {
      current: {
        getCurrentRoute: () =>
          currentPath ? { name: "detail", path: currentPath } : undefined,
        getRootState: () => ({ routeNames: ["detail"] }),
        dispatch: (action) => dispatches.push(action),
      },
    },
    {
      enabled,
      prefixes: ["clinzo://"],
      getInitialURL: () => {
        initialLookups += 1;
        return initialURL;
      },
      subscribe: (callback) => {
        listener = callback;
        return () => {
          removals += 1;
          listener = undefined;
        };
      },
    },
    (routePath) => reports.push(routePath)
  );
  return {
    ...hook,
    reports,
    dispatches,
    commit() {
      cleanups = effects.map((effect) => effect()).filter(Boolean);
    },
    cleanup() {
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
    },
    emit: (url) => listener?.(url),
    get initialLookups() {
      return initialLookups;
    },
    get removals() {
      return removals;
    },
  };
}

for (const app of ["patient-mobile", "doctor-mobile", "driver-mobile"]) {
  test(`${app}: an initial URL resolved before commit waits for its effect`, async () => {
    const url = deferred();
    const hook = linking({ app, initialURL: url.promise });
    const initialState = hook.getInitialState();
    url.resolve("clinzo://appointments");
    assert.equal((await initialState).routes[0].path, "/appointments");
    assert.deepEqual(hook.reports, []);
    hook.commit();
    await Promise.resolve();
    assert.deepEqual(hook.reports, ["/appointments"]);
    hook.cleanup();
  });
}

test("an initial URL resolved after commit retains its navigation state and tracking", async () => {
  const url = deferred();
  const hook = linking({ initialURL: url.promise });
  const initialState = hook.getInitialState();
  hook.commit();
  url.resolve("clinzo://appointment-details/123");
  assert.equal((await initialState).routes[0].path, "/appointment-details/123");
  assert.deepEqual(hook.reports, ["/appointment-details/123"]);
  hook.cleanup();
});

test("a late initial URL cannot update tracking after cleanup", async () => {
  const url = deferred();
  const hook = linking({ initialURL: url.promise });
  const initialState = hook.getInitialState();
  hook.commit();
  hook.cleanup();
  url.resolve("clinzo://appointments");
  await initialState;
  assert.deepEqual(hook.reports, []);
});

test("a synchronous initial URL keeps synchronous state resolution without a render-time update", () => {
  const hook = linking({ initialURL: "clinzo://profile" });
  let state;
  hook.getInitialState().then((value) => {
    state = value;
  });
  assert.equal(state.routes[0].path, "/profile");
  assert.deepEqual(hook.reports, []);
  hook.commit();
  assert.deepEqual(hook.reports, ["/profile"]);
  hook.cleanup();
});

test("initial tracking does not restore a link already handled by the current route", async () => {
  for (const initialURL of [
    "clinzo://profile",
    Promise.resolve("clinzo://profile"),
  ]) {
    const hook = linking({ initialURL, currentPath: "/profile" });
    await hook.getInitialState();
    hook.commit();
    await Promise.resolve();
    assert.deepEqual(hook.reports, []);
    hook.cleanup();
  }
});

test("Strict Mode effect replay cancels the old pending delivery", async () => {
  const url = deferred();
  const hook = linking({ initialURL: url.promise });
  const initialState = hook.getInitialState();
  hook.commit();
  hook.cleanup();
  hook.commit();
  url.resolve("clinzo://appointments");
  await initialState;
  assert.deepEqual(hook.reports, ["/appointments"]);
  hook.cleanup();
});

test("live URL subscriptions still navigate and are removed on cleanup", async () => {
  const hook = linking({ initialURL: null });
  await hook.getInitialState();
  hook.commit();
  hook.emit("clinzo://profile");
  assert.deepEqual(hook.reports, ["/profile"]);
  assert.equal(hook.dispatches[0].type, "NAVIGATE");
  assert.equal(hook.dispatches[0].payload.routes[0].path, "/profile");
  hook.cleanup();
  hook.emit("clinzo://appointments");
  assert.equal(hook.dispatches.length, 1);
  assert.equal(hook.removals, 1);
});

test("disabled linking never requests or reports an initial URL", async () => {
  const hook = linking({ initialURL: "clinzo://profile", enabled: false });
  assert.equal(await hook.getInitialState(), undefined);
  hook.commit();
  assert.equal(hook.initialLookups, 0);
  assert.deepEqual(hook.reports, []);
  hook.cleanup();
});

test("URL lookup errors remain visible to initial-state resolution", async () => {
  const url = deferred();
  const hook = linking({ initialURL: url.promise });
  const failure = assert.rejects(hook.getInitialState(), /URL lookup failed/);
  hook.commit();
  url.reject(new Error("URL lookup failed"));
  await failure;
  assert.deepEqual(hook.reports, []);
  hook.cleanup();
});
