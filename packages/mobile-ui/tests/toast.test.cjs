const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

const jsx = (type, props) => ({ type, props });

function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      Date,
      Map,
      Set,
      Infinity,
      require(name) {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name in mocks) return mocks[name];
        if (name === "@startup/design-tokens")
          return load(
            path.join(__dirname, "../../design-tokens/src/index.ts"),
            mocks,
            cache
          );
        if (name.startsWith("."))
          return load(
            path.resolve(
              path.dirname(file),
              name +
                (fs.existsSync(path.resolve(path.dirname(file), name + ".ts"))
                  ? ".ts"
                  : ".tsx")
            ),
            mocks,
            cache
          );
        throw new Error("Unmocked import: " + name);
      },
    }
  );
  return exports;
}

const source = (file) => path.resolve(__dirname, "../src", file);

const api = load(source("utils/toast.ts"));

function note(id, extra = {}) {
  return { id, message: id, ...extra };
}

test("rapid feedback stacks without loss; pending updates retain their ID and reset their lifetime", () => {
  let now = 0;
  const store = api.createToastStore(() => now);
  store.show(note("upload", { state: "pending", lifetime: Infinity }));
  store.show(note("saved"));
  now = 10000;
  store.advance();
  assert.deepEqual(
    Array.from(store.getSnapshot().notes, (item) => item.id),
    ["upload"]
  );
  store.show(note("upload", { state: "success", lifetime: 1000 }));
  assert.equal(store.getSnapshot().notes.length, 1);
  now += 999;
  store.advance();
  assert.equal(store.getSnapshot().notes[0].state, "success");
  now++;
  store.advance();
  assert.equal(store.getSnapshot().notes.length, 0);
});

test("background/reading pause preserves the exact remaining time", () => {
  let now = 0;
  const store = api.createToastStore(() => now);
  store.show(note("review", { lifetime: 1000 }));
  now = 400;
  store.pause(true);
  now = 3600400;
  store.advance();
  assert.equal(store.getSnapshot().notes.length, 1);
  assert.equal(store.nextDelay(), undefined);
  store.pause(false);
  assert.equal(store.nextDelay(), 600);
  now += 599;
  store.advance();
  assert.equal(store.getSnapshot().notes.length, 1);
  now++;
  store.advance();
  assert.equal(store.getSnapshot().notes.length, 0);
});

test("default success, error and pending messages expire after five visible seconds", () => {
  let now = 0;
  const store = api.createToastStore(() => now);
  for (const state of ["success", "error", "pending", "info", "warning"])
    store.show(note(state, { state }));
  assert.equal(store.nextDelay(), 5000);
  now = 4999;
  store.advance();
  assert.equal(store.getSnapshot().notes.length, 5);
  now = 5000;
  store.advance();
  assert.equal(store.getSnapshot().notes.length, 0);
});

test("an action that updates its own toast does not dismiss its replacement", () => {
  const store = api.createToastStore(() => 0);
  const update = note("retry", { state: "pending" });
  const original = note("retry", {
    state: "error",
    action: { label: "Retry", run: () => store.show(update) },
  });
  store.show(original);
  store.act(original);
  assert.equal(store.getSnapshot().notes[0], update);
  const close = note("done", { action: { label: "Open", run() {} } });
  store.show(close);
  store.act(close);
  store.act(close);
  assert.deepEqual(
    Array.from(store.getSnapshot().notes, (item) => item.id),
    ["retry"]
  );
});

test("native event subscriptions clean up and dismiss-one preserves other messages", () => {
  const store = api.createToastStore(() => 0);
  const stop = api.subscribeToasts((event) =>
    event.kind === "show" ? store.show(event.note) : store.dismiss(event.id)
  );
  const one = api.toast("One");
  const two = api.toast({ id: "two", message: "Two", description: "Details" });
  api.dismissToast(one);
  assert.equal(store.getSnapshot().notes[0].id, two);
  api.dismissToast();
  assert.equal(store.getSnapshot().notes.length, 0);
  stop();
  api.toast("After unmount");
  assert.equal(store.getSnapshot().notes.length, 0);
});

test("all default toast states last five seconds; measured cards fan without overlap", () => {
  assert.equal(api.dismissDelay("pending", true), 5000);
  assert.equal(api.dismissDelay("info", false, Infinity), null);
  assert.equal(api.dismissDelay("info", true), 5000);
  assert.equal(api.dismissDelay("info", false, undefined, true), 5000);
  assert.equal(api.dismissDelay(undefined, false), 5000);
  assert.equal(api.fanSlot(2, [80, 140]).y, 236);
  assert.equal(api.pileSlot(3).opacity, 0);
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        api.toastCopy({ title: "Booked", message: "With your doctor" })
      )
    ),
    { title: "Booked", description: "With your doctor" }
  );
});

function componentHarness() {
  const haptics = [];
  const native = {
    StyleSheet: {
      create: (value) => value,
      flatten: (value) =>
        Object.assign({}, ...[value].flat(Infinity).filter(Boolean)),
    },
    useWindowDimensions: () => ({ width: 320, height: 640 }),
    View: "View",
    Pressable: "Pressable",
    ActivityIndicator: "ActivityIndicator",
    Animated: {
      View: "Animated.View",
      Value: class {},
      ValueXY: class {
        getTranslateTransform() {
          return [];
        }
      },
    },
    PanResponder: { create: (value) => ({ panHandlers: value }) },
  };
  const mocks = {
    react: {
      useRef: (value) => ({ current: value }),
      useMemo: (fn) => fn(),
      useEffect() {},
      useCallback: (fn) => fn,
      createContext: (value) => ({ value, Provider: "Provider" }),
      useContext: (value) => value.value,
    },
    "react-native": native,
    "expo-haptics": { selectionAsync: async () => haptics.push("tap") },
    "react-native-safe-area-context": {},
    "lucide-react-native": Object.fromEntries(
      ["CircleAlert", "CircleCheck", "Info", "TriangleAlert", "X"].map(
        (name) => [name, name]
      )
    ),
    "../primitives/AppText": { AppText: "Text" },
    "../theme/MobileThemeProvider": {
      useMobileTheme: () => ({ primaryText: "#087F8C", soft: "#EAF8F7" }),
    },
    "../primitives/Sound": { useSoundEffects: () => () => haptics.push("tap") },
  };
  const card = load(source("components/ToastCard.tsx"), mocks).ToastCard;
  return { card, native, mocks, haptics };
}

function nodes(tree) {
  return !tree || typeof tree !== "object"
    ? []
    : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}

test("native card exposes real action/close buttons, theme overrides, full copy and press-only haptics", () => {
  const harness = componentHarness();
  const events = [];
  const style = { backgroundColor: "custom-surface" };
  const input = note("appointment", {
    title: "Appointment confirmed",
    message: "Your consultation is booked",
    type: "success",
    action: { label: "Open", run() {} },
  });
  const tree = harness.card({
    note: input,
    slot: api.pileSlot(0),
    behind: false,
    bottom: false,
    exiting: false,
    layer: 1,
    colorScheme: "light",
    reducedMotion: true,
    style,
    onInteraction() {},
    onAction: (value) => events.push(value),
    onDismiss: (id) => events.push(id),
    onExpand() {},
    onHeight() {},
    onExit() {},
  });
  const all = nodes(tree);
  const card = all.find((node) => node.props.testID === "toast-appointment");
  assert.equal(
    harness.native.StyleSheet.flatten(card.props.style).backgroundColor,
    "custom-surface"
  );
  assert.equal(harness.haptics.length, 0);
  const action = all.find((node) => node.props.testID === "toast-action");
  const close = all.find((node) => node.props.testID === "toast-close");
  assert.equal(action.props.accessibilityRole, "button");
  action.props.onPress();
  assert.equal(events[0], input);
  close.props.onPress();
  assert.equal(events[1], input.id);
  assert.equal(harness.haptics.length, 2);
  assert.ok(
    !all.some((node) => node.props.accessibilityRole === "progressbar")
  );
  assert.ok(
    all.some((node) => node.props.children === "Your consultation is booked")
  );
});

test("hidden cards cannot be read, focused or swiped instead of the foreground card", () => {
  const { card } = componentHarness();
  const tree = card({
    note: note("hidden"),
    slot: api.pileSlot(1),
    behind: true,
    bottom: false,
    exiting: false,
    layer: 1,
    colorScheme: "dark",
    reducedMotion: true,
    onInteraction() {},
    onAction() {},
    onDismiss() {},
    onExpand() {},
    onHeight() {},
    onExit() {},
  });
  assert.equal(tree.props.pointerEvents, "none");
  assert.equal(tree.props.importantForAccessibility, "no-hide-descendants");
  assert.equal(
    tree.props.onMoveShouldSetPanResponder(null, { dx: 50, dy: 0 }),
    false
  );
});

test("the provider uses five seconds for success and errors and installs one feedback layer", () => {
  const harness = componentHarness();
  const cache = new Map();
  const mocks = {
    ...harness.mocks,
    "./AppText": { AppText: "Text" },
    "../components/ToastCard": { ToastCard: "ToastCard" },
  };
  const storeApi = load(source("utils/toast.ts"), mocks, cache);
  const component = load(source("primitives/Toast.tsx"), mocks, cache);
  const seen = [];
  const stop = storeApi.subscribeToasts((event) => seen.push(event));
  const provider = component.ToastProvider({ children: "App", haptics: false });
  provider.props.value.showToast({ title: "Saved", type: "success" });
  provider.props.value.showToast({
    title: "Failed",
    message: "Retry",
    type: "error",
  });
  provider.props.value.showToast({ title: "Custom", lifetime: 500 });
  assert.deepEqual(
    seen.map((event) =>
      storeApi.dismissDelay(
        event.note.state ?? event.note.type,
        Boolean(event.note.action),
        event.note.lifetime
      )
    ),
    [5000, 5000, 500]
  );
  assert.equal(provider.props.children.props.enabled, false);
  stop();
});

test("the native SoundEffects layer stays silent until its press callback runs", async () => {
  const harness = componentHarness();
  const sound = load(source("primitives/Sound.tsx"), harness.mocks);
  const enabled = sound.SoundEffects({ children: "App" });
  assert.equal(harness.haptics.length, 0);
  enabled.props.value();
  assert.equal(harness.haptics.length, 1);
  sound.SoundEffects({ children: "App", enabled: false }).props.value();
  assert.equal(harness.haptics.length, 1);
});
