const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

function harness() {
  const state = [],
    refs = [],
    effects = [],
    toasts = [];
  let si = 0,
    ri = 0;
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) {
      const i = si++;
      if (!(i in state))
        state[i] = typeof initial === "function" ? initial() : initial;
      return [
        state[i],
        (value) => {
          state[i] = typeof value === "function" ? value(state[i]) : value;
        },
      ];
    },
    useRef(value) {
      const i = ri++;
      return (refs[i] ??= { current: value });
    },
    useEffect(fn) {
      effects.push(fn);
    },
    useMemo(fn) {
      return fn();
    },
  };
  const native = {
    StyleSheet: { create: (value) => value, absoluteFill: {} },
    Platform: { OS: "android" },
    Animated: {
      View: "AnimatedView",
      ValueXY: class {
        setValue() {}
        getTranslateTransform() {
          return [];
        }
      },
    },
    PanResponder: { create: (value) => ({ panHandlers: value }) },
  };
  for (const name of [
    "ActivityIndicator",
    "FlatList",
    "KeyboardAvoidingView",
    "Pressable",
    "Text",
    "View",
  ])
    native[name] = name;
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/components/ConsultationCall.tsx"),
      "utf8"
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  function localRequire(
    id,
    parent = path.join(__dirname, "../src/components/ConsultationCall.tsx")
  ) {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "react-native") return native;
    if (id.includes("AppText"))
      return { AppText: "Text", AppTextInput: "TextInput" };
    if (id === "react-native-safe-area-context")
      return { useSafeAreaInsets: () => ({ top: 24, bottom: 12 }) };
    if (id === "lucide-react-native")
      return new Proxy({}, { get: (_, key) => String(key) });
    if (id === "@startup/design-tokens")
      return {
        colors: {
          white: "#fff",
          danger: "#f00",
          patient: { primary: "#087f78", text: "#123", surface: "#eff" },
          doctor: { primary: "#087f8c", text: "#123", surface: "#eff" },
        },
        fontFamilies: {},
      };
    if (id.includes("Toast"))
      return { useToast: () => ({ showToast: (toast) => toasts.push(toast) }) };
    if (id.includes("Input")) return { Input: "Input" };
    if (id.startsWith(".")) {
      const base = path.resolve(path.dirname(parent), id);
      const target = [base, base + ".ts", base + ".tsx"].find(
        (file) => fs.existsSync(file) && fs.statSync(file).isFile()
      );
      if (!target) throw new Error(`Missing local module ${id}`);
      const child = { exports: {} };
      const output = ts.transpileModule(fs.readFileSync(target, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText;
      vm.runInNewContext(output, {
        module: child,
        exports: child.exports,
        require: (name) => localRequire(name, target),
      });
      return child.exports;
    }
    throw new Error(id);
  }
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: localRequire,
  });
  return {
    ...module.exports,
    toasts,
    render(props) {
      si = 0;
      ri = 0;
      effects.length = 0;
      const tree = module.exports.ConsultationCall(props);
      effects.forEach((fn) => fn());
      return tree;
    },
  };
}

function nodes(tree, result = []) {
  if (!tree || typeof tree !== "object") return result;
  if (Array.isArray(tree)) tree.forEach((item) => nodes(item, result));
  else {
    result.push(tree);
    nodes(tree.props?.children, result);
  }
  return result;
}

const props = {
  theme: "patient",
  name: "Doctor",
  remoteVideo: "remote",
  localVideo: "local",
  cameraEnabled: true,
  microphoneEnabled: true,
  connected: true,
  chatAllowed: true,
  deviceBusy: false,
  sending: false,
  identityId: "me",
  messages: [],
  onSend: async () => {},
  onCamera() {},
  onMicrophone() {},
  onFlipCamera() {},
  onBack() {},
  onEnd() {},
};

test("both themes wire four controls and chat stays inside the call surface", () => {
  for (const theme of ["patient", "doctor"]) {
    const h = harness(),
      actions = [];
    const p = {
      ...props,
      theme,
      onCamera: () => actions.push("camera"),
      onMicrophone: () => actions.push("mic"),
      onEnd: () => actions.push("end"),
    };
    let all = nodes(h.render(p));
    for (const label of ["Turn camera off", "Mute microphone", "End call"])
      all
        .find((node) => node.props?.accessibilityLabel === label)
        .props.onPress();
    assert.deepEqual(actions, ["camera", "mic", "end"]);
    all
      .find(
        (node) => node.props?.accessibilityLabel === "Open consultation chat"
      )
      .props.onPress();
    all = nodes(h.render(p));
    assert.ok(all.some((node) => node.type === "FlatList"));
    assert.ok(
      all.some(
        (node) =>
          node.props?.accessibilityLabel === "Close chat and return to video"
      )
    );
  }
});

test("chat toasts ignore history and own messages, deduplicate, and stay quiet in chat", () => {
  const h = harness();
  const message = (id, sender = "other") => ({
    id,
    sender_id: sender,
    body: id,
    created_at: "2026-10-10T10:00:00Z",
  });
  h.render({ ...props, messages: [message("history")] });
  h.render({
    ...props,
    messages: [message("history"), message("new"), message("own", "me")],
  });
  assert.equal(h.toasts.length, 1);
  h.render({
    ...props,
    messages: [message("history"), message("new"), message("own", "me")],
  });
  assert.equal(h.toasts.length, 1);
  const all = nodes(h.render(props));
  all
    .find((node) => node.props?.accessibilityLabel === "Open consultation chat")
    .props.onPress();
  h.render({ ...props, messages: [message("while-chat-open")] });
  assert.equal(h.toasts.length, 1);
});

test("preview movement is bounded to the visible call area after keyboard/layout changes", () => {
  const { clampCallPreview } = harness();
  const outside = clampCallPreview(900, -90, 390, 600, 132, 172);
  assert.equal(outside.x, 250);
  assert.equal(outside.y, 8);
  const resized = clampCallPreview(250, 400, 390, 260, 132, 172);
  assert.equal(resized.y, 80);
});

test("tapping the video in chat restores full-screen video for both apps", () => {
  for (const theme of ["patient", "doctor"]) {
    const h = harness();
    const p = { ...props, theme, initialChat: true };
    let all = nodes(h.render(p));
    assert.ok(all.some((node) => node.type === "FlatList"));
    const preview = all.find(
      (node) => node.props?.accessibilityLabel === "Return to full-screen video"
    );
    assert.equal(preview.props.accessibilityRole, "button");
    assert.equal(preview.props.disabled, false);
    preview.props.onPress();
    all = nodes(h.render(p));
    assert.equal(
      all.some((node) => node.type === "FlatList"),
      false
    );
    assert.ok(
      all.some(
        (node) => node.props?.accessibilityLabel === "Open consultation chat"
      )
    );
    all
      .find(
        (node) => node.props?.accessibilityLabel === "Open consultation chat"
      )
      .props.onPress();
    assert.ok(nodes(h.render(p)).some((node) => node.type === "FlatList"));
  }
});
