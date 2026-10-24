const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

// Execute shared UI with native hosts mocked; gestures/layout still need a device.
function harness({
  visible = true,
  mounted = visible,
  theme = "patient",
} = {}) {
  const effects = [],
    updates = [],
    animations = [],
    backHandlers = [];
  const jsx = (type, props) => ({ type, props });
  let filter = "all",
    stateIndex = 0;
  const react = {
    useState: (initial) => {
      const index = stateIndex++;
      return index === 0
        ? [mounted, (value) => updates.push(value)]
        : index === 1
          ? [
              filter,
              (value) => {
                filter = value;
              },
            ]
          : [initial, () => {}];
    },
    useEffect: (effect) => effects.push(effect),
    useRef: (value) => ({ current: value }),
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
  };
  const native = {
    Dimensions: { get: () => ({ width: 390 }) },
    StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    View: "View",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    PanResponder: { create: (handlers) => ({ panHandlers: handlers }) },
    BackHandler: {
      addEventListener: (_, callback) => {
        const entry = { callback, removed: false };
        backHandlers.push(entry);
        return {
          remove: () => {
            entry.removed = true;
          },
        };
      },
    },
    Animated: {
      View: "AnimatedView",
      Value: class {
        setValue() {}
        stopAnimation() {}
      },
      timing: () => ({}),
      spring: () => ({ start() {} }),
      parallel: () => {
        const animation = {
          stopped: false,
          start(callback) {
            this.callback = callback;
          },
          stop() {
            this.stopped = true;
          },
        };
        animations.push(animation);
        return animation;
      },
    },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    function requireMock(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (id === "react-native") return native;
      if (id === "react-native-safe-area-context")
        return { useSafeAreaInsets: () => ({ bottom: 0 }) };
      if (id === "lucide-react-native")
        return new Proxy({}, { get: (_, name) => name });
      if (id === "@startup/design-tokens")
        return {
          colors: {
            patient: {
              primary: "patient-primary",
              primaryDark: "patient-dark",
              accent: "patient-accent",
            },
            doctor: {
              primary: "doctor-primary",
              dark: "doctor-dark",
              accent: "doctor-accent",
            },
            driver: { primary: "driver-primary", dark: "driver-dark" },
            ui: { overlay: "#00000066" },
          },
          fontFamilies: {},
          radius: {},
          surfaces: { card: {} },
        };
      if (id.endsWith("/MobileThemeProvider"))
        return { useMobileThemeName: (override) => override ?? theme };
      for (const name of [
        "AppText",
        "Loader",
        "ModalSurface",
        "Dropdown",
        "Header",
      ])
        if (id.endsWith("/" + name)) return { [name]: name };
      const target = path.resolve(path.dirname(file), id);
      return load([target + ".ts", target + ".tsx"].find(fs.existsSync));
    }
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      require: requireMock,
    });
    cache.set(file, module.exports);
    return module.exports;
  }
  const { NotificationDrawer } = load(
    path.resolve(__dirname, "../src/components/NotificationDrawer.tsx")
  );
  const defaults = {
    visible,
    notifications: [],
    onClose() {},
    onMarkAllRead() {},
    onNotificationPress() {},
    onDelete() {},
  };
  function render(props = {}) {
    stateIndex = 0;
    effects.length = 0;
    return NotificationDrawer({ ...defaults, ...props });
  }
  function nodes(element, list = []) {
    if (!element || typeof element !== "object") return list;
    if (Array.isArray(element)) {
      element.forEach((child) => nodes(child, list));
      return list;
    }
    if (typeof element.type === "function")
      return nodes(element.type(element.props), list);
    list.push(element);
    nodes(element.props?.children, list);
    return list;
  }
  return { render, nodes, effects, updates, animations, backHandlers };
}

test("reload with a hidden drawer starts no native animation", () => {
  const h = harness({ visible: false });
  assert.equal(h.render(), null);
  h.effects[0]();
  assert.equal(h.animations.length, 0);
  assert.deepEqual(h.updates, []);
});

test("disposed closing animation cannot update drawer state", () => {
  const h = harness({ visible: false, mounted: true });
  h.render();
  const cleanup = h.effects[0]();
  cleanup();
  h.animations[0].callback({ finished: true });
  assert.equal(h.animations[0].stopped, true);
  assert.deepEqual(h.updates, []);
});

test("only a completed active close hides the drawer", () => {
  const h = harness({ visible: false, mounted: true });
  h.render();
  h.effects[0]();
  h.animations[0].callback({ finished: false });
  assert.deepEqual(h.updates, []);
  h.animations[0].callback({ finished: true });
  assert.deepEqual(h.updates, [false]);
});

test("opening mounts before animation and closing reports visibility until hidden", () => {
  const opening = harness({ visible: true, mounted: false });
  opening.render();
  opening.effects[0]();
  assert.deepEqual(opening.updates, [true]);
  assert.equal(opening.animations.length, 0);
  for (const mounted of [true, false]) {
    const h = harness({ visible: false, mounted });
    const changes = [];
    h.render({ onVisibilityChange: (value) => changes.push(value) });
    h.effects[3]();
    assert.deepEqual(changes, [mounted]);
  }
});

test("hardware back closes and removes its listener on cleanup", () => {
  const h = harness();
  let closed = 0;
  h.render({ onClose: () => closed++ });
  const cleanup = h.effects[2]();
  assert.equal(h.backHandlers[0].callback(), true);
  assert.equal(closed, 1);
  cleanup();
  assert.equal(h.backHandlers[0].removed, true);
});

const notification = (id, read = false) => ({
  id,
  title: id,
  message: "Update",
  time: "Just now",
  type: "general",
  read,
  important: false,
  emergency: false,
});

test("filters retain state and dispatch read, press and delete actions by id", () => {
  const h = harness();
  const pressed = [],
    deleted = [];
  let marked = 0;
  const props = {
    notifications: [notification("new"), notification("old", true)],
    onMarkAllRead: () => marked++,
    onNotificationPress: (id) => pressed.push(id),
    onDelete: (id) => deleted.push(id),
  };
  let nodes = h.nodes(h.render(props));
  nodes
    .find((n) => n.props.accessibilityLabel === "Mark all as read")
    .props.onPress();
  nodes.find((n) => n.type === "Dropdown").props.onValueChange("unread");
  nodes = h.nodes(h.render(props));
  assert.equal(
    nodes.filter((n) => n.props.accessibilityLabel?.endsWith("Unread")).length,
    1
  );
  assert.equal(
    nodes.some((n) => n.props.accessibilityLabel?.startsWith("old.")),
    false
  );
  nodes
    .find((n) => n.props.accessibilityLabel?.startsWith("new."))
    .props.onPress();
  nodes
    .find((n) => n.props.accessibilityLabel?.startsWith("new."))
    .props.onAccessibilityAction({ nativeEvent: { actionName: "delete" } });
  assert.deepEqual(pressed, ["new"]);
  assert.deepEqual(deleted, ["new"]);
  assert.equal(marked, 1);
});

test("loading and load errors suppress the empty message, deletion disables the target", () => {
  const h = harness();
  for (const props of [{ loading: true }, { loadFailed: true }]) {
    const nodes = h.nodes(h.render(props));
    assert.equal(
      nodes.some((n) => n.props.children === "No notifications yet."),
      false
    );
  }
  const nodes = h.nodes(
    h.render({
      notifications: [notification("one"), notification("two")],
      deletingId: "one",
    })
  );
  assert.equal(
    nodes.find((n) => n.props.accessibilityLabel === "Delete notification: one")
      .props.disabled,
    true
  );
  assert.equal(
    nodes.find((n) => n.props.accessibilityLabel === "Delete notification: two")
      .props.disabled,
    false
  );
});

test("a swiped card closes its delete action before opening the notification", () => {
  const h = harness();
  const pressed = [];
  const nodes = h.nodes(
    h.render({
      notifications: [notification("one")],
      onNotificationPress: (id) => pressed.push(id),
    })
  );
  const pan = nodes.find((n) => n.props.onPanResponderRelease).props;
  assert.equal(pan.onMoveShouldSetPanResponder(null, { dx: -40, dy: 2 }), true);
  assert.equal(pan.onMoveShouldSetPanResponder(null, { dx: 2, dy: 40 }), false);
  pan.onPanResponderRelease(null, { dx: -60 });
  const card = nodes.find((n) =>
    n.props.accessibilityLabel?.startsWith("one.")
  );
  card.props.onPress();
  assert.deepEqual(pressed, []);
  card.props.onPress();
  assert.deepEqual(pressed, ["one"]);
});

test("drawer inherits or overrides its theme and preserves each app's icon colors", () => {
  for (const theme of ["patient", "doctor", "driver"]) {
    const h = harness({ theme });
    const nodes = h.nodes(h.render({ notifications: [notification("one")] }));
    assert.equal(nodes.find((n) => n.type === "Header").props.app, theme);
    assert.equal(nodes.find((n) => n.type === "Dropdown").props.theme, theme);
    assert.equal(
      nodes.find((n) => n.type === "Bell").props.color,
      theme === "driver" ? "driver-primary" : `${theme}-accent`
    );
    assert.equal(
      h.nodes(h.render({ theme: "doctor" })).find((n) => n.type === "Header")
        .props.app,
      "doctor"
    );
  }
});
