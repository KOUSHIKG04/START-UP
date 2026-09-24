const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Contract tests execute real component functions with lightweight native hosts.
// They verify props/styles/context; they do not emulate native layout or gestures.
const cache = new Map();
const jsx = (type, props) => ({ type, props: props ?? {} });
const react = {
  createElement: (type, props, ...children) =>
    jsx(type, { ...props, children }),
  createContext: (value) => {
    const context = { value };
    context.Provider = { context };
    return context;
  },
  useContext: (context) => context.value,
  useState: (initial) => [
    typeof initial === "function" ? initial() : initial,
    () => {},
  ],
  useRef: (value) => ({ current: value }),
  forwardRef: (fn) => (props) => fn(props, null),
};
const native = {
  StyleSheet: { create: (value) => value, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
};
for (const name of [
  "View",
  "Text",
  "TextInput",
  "Pressable",
  "TouchableOpacity",
  "ScrollView",
  "Modal",
])
  native[name] = name;

function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  function localRequire(id) {
    if (id === "react") return react;
    if (id === "react/jsx-runtime")
      return { jsx, jsxs: jsx, Fragment: "Fragment" };
    if (id === "react-native") return native;
    if (id === "react-native-safe-area-context")
      return {
        useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      };
    if (id === "react-native-svg")
      return { __esModule: true, default: "Svg", Path: "Path" };
    if (id === "expo-linear-gradient")
      return { LinearGradient: "LinearGradient" };
    if (id === "lucide-react-native")
      return new Proxy({}, { get: (_, key) => String(key) });
    let target =
      id === "@startup/design-tokens"
        ? path.resolve(__dirname, "../../design-tokens/src/index.ts")
        : path.resolve(path.dirname(file), id);
    if (!fs.existsSync(target))
      target = [".ts", ".tsx", "/index.ts"]
        .map((ext) => target + ext)
        .find(fs.existsSync);
    if (!target) throw Error(`Unmocked import ${id} in ${file}`);
    return load(target);
  }
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
    filename: file,
  })(localRequire, module, module.exports);
  return module.exports;
}

function render(element, nodes = []) {
  if (!element || typeof element !== "object") return nodes;
  if (Array.isArray(element)) {
    element.forEach((child) => render(child, nodes));
    return nodes;
  }
  if (element.type?.context) {
    const context = element.type.context;
    const previous = context.value;
    context.value = element.props.value;
    try {
      render(element.props.children, nodes);
    } finally {
      context.value = previous;
    }
  } else if (typeof element.type === "function") {
    render(element.type(element.props), nodes);
  } else {
    nodes.push(element);
    render(element.props.children, nodes);
  }
  return nodes;
}
const component = (name) =>
  load(path.resolve(__dirname, `../src/primitives/${name}.tsx`))[name];
const { MobileThemeProvider } = load(
  path.resolve(__dirname, "../src/theme/MobileThemeProvider.tsx")
);
const { mobileThemes } = load(
  path.resolve(__dirname, "../../design-tokens/src/index.ts")
);
const flatten = (style) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const themed = (theme, element) =>
  render(jsx(MobileThemeProvider, { theme, children: element }));

test("Chip inherits each app palette and supports explicit overrides", () => {
  const Chip = component("Chip");
  for (const theme of ["patient", "doctor", "driver"]) {
    const nodes = themed(
      theme,
      jsx(Chip, { label: "Selected", variant: "radio", selected: true })
    );
    const host = nodes.find((n) => n.type === "Pressable");
    assert.equal(
      flatten(host.props.style({ pressed: false })).backgroundColor,
      mobileThemes[theme].primaryText
    );
    assert.equal(host.props.accessibilityState.checked, true);
  }
  const nodes = themed(
    "driver",
    jsx(Chip, {
      label: "Override",
      theme: "patient",
      variant: "radio",
      selected: true,
    })
  );
  assert.equal(
    flatten(
      nodes.find((n) => n.type === "Pressable").props.style({ pressed: false })
    ).backgroundColor,
    mobileThemes.patient.primaryText
  );
});

test("Button inherits app palette and keeps disabled state and caller overrides", () => {
  const Button = component("Button");
  const host = themed("driver", jsx(Button, { label: "Continue" })).find(
    (n) => n.type === "Pressable"
  );
  assert.equal(
    flatten(host.props.style({ pressed: false })).backgroundColor,
    mobileThemes.driver.primary
  );
  const disabled = themed(
    "doctor",
    jsx(Button, { label: "Continue", disabled: true, style: { minHeight: 60 } })
  ).find((n) => n.type === "Pressable");
  assert.equal(disabled.props.accessibilityState.disabled, true);
  assert.equal(flatten(disabled.props.style({ pressed: false })).minHeight, 60);
});

test("Input derives its accessible name and preserves explicit labels", () => {
  const Input = component("Input");
  const field = (props) =>
    render(jsx(Input, props)).find((n) => n.type === "TextInput").props;
  assert.equal(
    field({ label: "Date of birth", value: "2000-01-01" }).accessibilityLabel,
    "Date of birth"
  );
  assert.equal(
    field({ label: "DOB", accessibilityLabel: "Your date of birth" })
      .accessibilityLabel,
    "Your date of birth"
  );
  assert.equal(field({ label: "Name", disabled: true }).editable, false);
});

test("navigation exposes current tab and badge meaning", () => {
  const { BottomNavBar } = load(
    path.resolve(__dirname, "../src/components/BottomNavBar.tsx")
  );
  const tabs = themed(
    "driver",
    jsx(BottomNavBar, {
      items: [
        { key: "home", label: "Home" },
        { key: "trips", label: "Trips", badge: 2 },
      ],
      activeTab: "trips",
      onTabChange: () => {},
    })
  ).filter((n) => n.type === "TouchableOpacity");
  assert.equal(tabs[0].props.accessibilityRole, "tab");
  assert.equal(tabs[0].props.accessibilityState.selected, false);
  assert.equal(tabs[1].props.accessibilityState.selected, true);
  assert.match(tabs[1].props.accessibilityLabel, /Trips.*2/);
});
