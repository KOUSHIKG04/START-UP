const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const token = "a".repeat(72);

function scanner({ failure, refreshFails = false, waitForRedemption } = {}) {
  const state = [],
    refs = [],
    pending = [],
    routes = [],
    errors = [];
  let cursor = 0,
    refCursor = 0,
    redemptions = 0,
    refreshes = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const mocks = {
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value) => {
            state[index] = value;
          },
        ];
      },
      useRef: (initial) =>
        refs[refCursor++] ?? (refs[refCursor - 1] = { current: initial }),
      useCallback: (fn) => fn,
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", Platform: { OS: "android" }, Linking: {} },
    "expo-camera": {
      CameraView: "Camera",
      useCameraPermissions: () => [
        { granted: true },
        async () => ({ granted: true }),
      ],
    },
    "expo-router": {
      router: { push: (route) => routes.push(route) },
      useFocusEffect: (fn) => fn(),
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({
        invalidateQueries: async () => {
          refreshes++;
          if (refreshFails) throw Error("Offline");
        },
      }),
      useQuery: () => ({ data: [], isLoading: false }),
      useMutation: (options) => ({
        isPending: false,
        mutate: (value) => {
          assert.equal(options.retry, false);
          pending.push(
            (async () => {
              try {
                const result = await options.mutationFn(value);
                await options.onSuccess?.(result);
              } catch (error) {
                errors.push(error);
                await options.onError?.(error);
              } finally {
                await options.onSettled?.();
              }
            })()
          );
        },
      }),
    },
    "@startup/data-access": {
      redeemClinicCheckinToken: async () => {
        redemptions++;
        if (waitForRedemption) await waitForRedemption;
        if (failure) throw failure;
        return "appointment-id";
      },
      // A successful redemption must not depend on this follow-up request.
      listMyPracticeAppointments: async () => {
        throw Error("Could not load patient details");
      },
    },
    "@startup/contracts": {
      clinicCheckinTokenSchema: {
        safeParse: (value) => ({ success: value === token, data: value }),
      },
    },
    "@startup/mobile-ui": {
      Button: "Button",
      Input: "Input",
      useToastFeedback: () => {},
    },
    "lucide-react-native": { ScanLine: "ScanLine", User: "User" },
    "../../../components/DoctorScreen": {
      DoctorScreen: "Screen",
      Heading: "Heading",
      Label: "Label",
      Panel: "Panel",
    },
    "../../../components/theme": { palette: {}, ui: {} },
    "../../../services/supabase": { supabase: {} },
  };
  function load(file) {
    const absolute = path.resolve(file),
      exports = {};
    vm.runInNewContext(
      ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
      {
        exports,
        require(name) {
          if (Object.hasOwn(mocks, name)) return mocks[name];
          if (!name.startsWith("."))
            throw new Error("Unmocked import: " + name);
          const target = path.resolve(path.dirname(absolute), name);
          const resolved = [target, target + ".ts", target + ".tsx"].find(
            (file) => fs.existsSync(file) && fs.statSync(file).isFile()
          );
          if (!resolved) throw new Error("Unresolved import: " + name);
          return load(resolved);
        },
      }
    );
    return exports;
  }
  const exports = load(
    path.resolve(__dirname, "../src/features/patients/screens/ScanQrScreen.tsx")
  );
  const render = () => {
    cursor = 0;
    refCursor = 0;
    const nodes = [];
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      nodes.push(node);
      walk(node.props?.children);
    }
    walk(exports.ScanQrScreen());
    return nodes;
  };
  return {
    render,
    routes,
    errors,
    finish: () => Promise.all(pending),
    get redemptions() {
      return redemptions;
    },
    get refreshes() {
      return refreshes;
    },
    get error() {
      return state[4];
    },
    get message() {
      return state[3];
    },
  };
}

test("successful check-in opens the appointment even when the following refresh fails", async () => {
  const view = scanner({ refreshFails: true });
  // Enter a check-in token through the same shared lookup used by the camera.
  view
    .render()
    .find((node) => node.type === "Input")
    .props.onChangeText(token);
  view
    .render()
    .find((node) => node.type === "Input")
    .props.onSubmitEditing();
  await view.finish();
  assert.equal(view.redemptions, 1);
  assert.equal(view.refreshes, 1);
  assert.equal(view.routes[0].pathname, "/appointment-details");
  assert.equal(view.routes[0].params.appointmentId, "appointment-id");
  assert.equal(view.error, "");
  assert.match(view.message, /checked in/);
  assert.equal(view.errors.length, 0);
});

test("repeated camera events and keyboard submission redeem only once while pending", async () => {
  let release;
  const view = scanner({
    waitForRedemption: new Promise((resolve) => {
      release = resolve;
    }),
  });
  await view
    .render()
    .find((node) => node.props.label === "Open camera")
    .props.onPress();
  const scan = view.render().find((node) => node.type === "Camera")
    .props.onBarcodeScanned;
  scan({ data: token });
  scan({ data: token });
  view
    .render()
    .find((node) => node.type === "Input")
    .props.onChangeText(token);
  view
    .render()
    .find((node) => node.type === "Input")
    .props.onSubmitEditing();
  assert.equal(view.redemptions, 1);
  release();
  await view.finish();
  assert.equal(view.routes.length, 1);
});

for (const [message, expected] of [
  ["Check-in token unavailable for this practice", /expired, already used/],
  ["Network request failed", /Check your connection/],
]) {
  test(`check-in failure is explained correctly: ${message}`, async () => {
    const view = scanner({ failure: { message } });
    view
      .render()
      .find((node) => node.type === "Input")
      .props.onChangeText(token);
    view
      .render()
      .find((node) => node.type === "Input")
      .props.onSubmitEditing();
    await view.finish();
    assert.match(view.error, expected);
    assert.equal(view.routes.length, 0);
    assert.equal(view.refreshes, 0);
    // A new attempt is allowed after the failed request has settled.
    view
      .render()
      .find((node) => node.type === "Input")
      .props.onSubmitEditing();
    await view.finish();
    assert.equal(view.redemptions, 2);
  });
}
