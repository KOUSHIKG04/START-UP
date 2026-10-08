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
  StyleSheet: { create: (value) => value, absoluteFill: {}, flatten: (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) },
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
  "ActivityIndicator",
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

test("Loading buttons hide text and icons, preserve their label, and block repeat presses", () => {
  const Button = component("Button");
  for (const theme of ["patient", "doctor", "driver"]) {
    const nodes = themed(theme, jsx(Button, {
      label: "Save profile", loading: true, disabled: true,
      leftIcon: jsx("Icon", {}), children: jsx("Text", { children: "Saving…" }),
    }));
    const host = nodes.find(n => n.type === "Pressable");
    assert.equal(host.props.disabled, true);
    assert.equal(host.props.accessibilityState.busy, true);
    assert.equal(host.props.accessibilityLabel, "Save profile");
    assert.equal(nodes.filter(n => n.type === "Text" || n.type === "Icon").length, 0);
    assert.equal(nodes.find(n => n.type === "ActivityIndicator").props.color, mobileThemes[theme].onPrimary);
    assert.equal(flatten(host.props.style({ pressed: false })).backgroundColor, mobileThemes[theme].primary);
  }
});

test("Loading outline buttons use the text colour, including caller overrides", () => {
  const Button = component("Button");
  for (const override of [undefined, { color: "#123456" }]) {
    const nodes = themed("patient", jsx(Button, { label: "Upload", variant: "outline", loading: true, labelStyle: override }));
    assert.equal(nodes.find(n => n.type === "ActivityIndicator").props.color, override?.color ?? mobileThemes.patient.primaryText);
  }
  const nodes = themed("patient", jsx(Button, { label: "Save", loading: false }));
  assert.equal(nodes.some(n => n.type === "ActivityIndicator"), false);
  assert.equal(nodes.find(n => n.type === "Pressable").props.disabled, false);
});

test("Loading buttons preserve intrinsic width without expanding flex or fixed-width controls", () => {
  const Button = component("Button");
  const originalRef = react.useRef;
  react.useRef = () => ({ current: { width: 160, height: 54 } });
  try {
    for (const style of [{ flex: 1 }, { width: 96 }, state => ({ flexGrow: 1 })]) {
      const nodes = themed("patient", jsx(Button, { label: "Use current location", loading: true, style }));
      const host = nodes.find(n => n.type === "Pressable");
      assert.equal(flatten(host.props.style({ pressed: false })).minWidth, undefined);
    }
    const nodes = themed("patient", jsx(Button, { label: "Save", loading: true }));
    const host = nodes.find(n => n.type === "Pressable");
    assert.equal(flatten(host.props.style({ pressed: false })).minWidth, 160);
  } finally {
    react.useRef = originalRef;
  }
});

test("Input preserves embedded layout, native focus refs and OTP behavior", () => {
  const Input = component("Input");
  const ref = { current: null };
  const onChangeText = () => {};
  const style = { flex: 1, height: 1, opacity: 0 };
  const element = Input({ variant: "unstyled", ref, style, onChangeText,
    keyboardType: "number-pad", textContentType: "oneTimeCode", maxLength: 6,
    accessibilityLabel: "Verification code" });
  assert.equal(element.type, "TextInput");
  assert.equal(element.props.ref, ref);
  assert.equal(element.props.onChangeText, onChangeText);
  assert.equal(element.props.textContentType, "oneTimeCode");
  assert.equal(element.props.maxLength, 6);
  assert.deepEqual(flatten(element.props.style), style);
  assert.equal(element.props.placeholderTextColor, undefined);
});

test("Input supports labels with legacy styling and blocks editing when disabled", () => {
  const Input = component("Input");
  const nodes = render(jsx(Input, { variant: "unstyled", label: "Clinic name",
    labelStyle: { fontSize: 14 }, disabled: true }));
  assert.ok(nodes.some(n => n.type === "Text" && n.props.children === "Clinic name"));
  const nativeInput = nodes.find(n => n.type === "TextInput");
  assert.equal(nativeInput.props.accessibilityLabel, "Clinic name");
  assert.equal(nativeInput.props.editable, false);
  assert.equal(nativeInput.props.accessibilityState.disabled, true);
});

test("Input error outline overrides caller borders without inline toast messages", () => {
  const Input = component("Input");
  const { colors } = load(path.resolve(__dirname, "../../design-tokens/src/index.ts"));
  const nodes = render(jsx(Input, { invalid: true, style: { borderColor: "#D1D1D1" } }));
  const nativeInput = nodes.find(n => n.type === "TextInput");
  assert.equal(flatten(nativeInput.props.style).borderColor, colors.danger);
  assert.equal(nodes.filter(n => n.type === "Text").length, 0);
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

test("Checkbox shows its checkmark and toggles the controlled value", () => {
  const Checkbox = component("Checkbox");
  let next;
  const nodes = render(jsx(Checkbox, { checked: true, label: "Emergency updates", onCheckedChange: value => { next = value; } }));
  const control = nodes.find(n => n.type === "Pressable");
  assert.equal(control.props.accessibilityState.checked, true);
  assert.equal(nodes.some(n => n.type === "Check"), true);
  control.props.onPress();
  assert.equal(next, false);
  const unchecked = render(jsx(Checkbox, { checked: false, label: "Emergency updates", disabled: true, onCheckedChange: () => {} }));
  assert.equal(unchecked.some(n => n.type === "Check"), false);
  assert.equal(unchecked.find(n => n.type === "Pressable").props.disabled, true);
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

test("ModalSurface uses neutral dimming and Android close handling", () => {
  const { colors } = load(path.resolve(__dirname, "../../design-tokens/src/index.ts"));
  const ModalSurface = component("ModalSurface");
  let closed = false;
  const nodes = render(jsx(ModalSurface, { visible: true, onClose: () => { closed = true; }, children: jsx("Text", { children: "Help" }) }));
  const modal = nodes.find(node => node.type === "Modal");
  assert.equal(modal.props.transparent, true);
  modal.props.onRequestClose();
  assert.equal(closed, true);
  assert.ok(nodes.some(node => node.type === "View" && flatten(node.props.style).backgroundColor === colors.ui.overlay));
  assert.equal(colors.ui.overlay, "#00000066");
});

test("custom ModalSurface preserves full-screen and drawer transparency", () => {
  const ModalSurface = component("ModalSurface");
  const fullscreen = render(jsx(ModalSurface, { layout: "custom", visible: true, children: jsx("Text", { children: "Search" }) }));
  assert.equal(fullscreen.find(node => node.type === "Modal").props.transparent, false);
  const drawer = render(jsx(ModalSurface, { layout: "custom", visible: true, transparent: true, children: jsx("Text", { children: "Address" }) }));
  assert.equal(drawer.find(node => node.type === "Modal").props.transparent, true);
});
