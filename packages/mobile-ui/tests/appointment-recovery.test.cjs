const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

function harness(extra = {}) {
  const state = ["", "", ""];
  let cursor = 0;
  let submitted;
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: {
      useState: () => {
        const i = cursor++;
        return [
          state[i],
          (value) => {
            state[i] = value;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      View: "View",
      ScrollView: "ScrollView",
      KeyboardAvoidingView: "KeyboardAvoidingView",
      Platform: { OS: "android" },
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 24, bottom: 24 }),
    },
    "@startup/design-tokens": {
      colors: { white: "#fff", border: "#ccc", ui: { overlay: "#0008" } },
    },
  };
  for (const name of [
    "AppText",
    "Button",
    "Dropdown",
    "Input",
    "Loader",
    "ModalSurface",
  ]) {
    const group = name === "AppText" ? "primitives" : "primitives";
    mocks[`../${group}/${name}`] = { [name]: name };
  }
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../src/components/AppointmentRecoveryDialog.tsx"),
        "utf8"
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText,
    {
      exports,
      require: (name) => {
        if (!mocks[name]) throw Error(name);
        return mocks[name];
      },
      Map,
    }
  );
  const props = {
    visible: true,
    title: "Reschedule",
    description: "Choose a time",
    actionLabel: "Confirm",
    theme: "patient",
    onClose() {},
    onSubmit(value) {
      submitted = value;
    },
    times: [
      {
        value: "one",
        day: "2026-11-01",
        dayLabel: "1 Nov",
        label: "10:00 AM",
        fee: "₹500",
      },
      {
        value: "two",
        day: "2026-11-02",
        dayLabel: "2 Nov",
        label: "10:00 AM",
        fee: "₹500",
      },
    ],
    ...extra,
  };
  function render() {
    cursor = 0;
    return exports.AppointmentRecoveryDialog(props);
  }
  function nodes(node, type) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap((child) => nodes(child, type));
    return [
      ...(node.type === type ? [node] : []),
      ...nodes(node.props?.children, type),
    ];
  }
  return { render, nodes, props, submitted: () => submitted };
}

test("reschedule requires a selected time and reason; changing date clears the previous time", () => {
  const h = harness();
  let tree = h.render();
  const confirm = () =>
    h.nodes(tree, "Button").find((node) => node.props.label === "Confirm");
  assert.equal(confirm().props.disabled, true);
  h.nodes(tree, "Dropdown")[0].props.onValueChange("2026-11-01");
  tree = h.render();
  h.nodes(tree, "Dropdown")[1].props.onValueChange("one");
  h.nodes(tree, "Input")[0].props.onChangeText("  Move to tomorrow  ");
  tree = h.render();
  assert.equal(confirm().props.disabled, false);
  confirm().props.onPress();
  assert.equal(h.submitted().targetWindowId, "one");
  assert.equal(h.submitted().reason, "Move to tomorrow");
  h.nodes(tree, "Dropdown")[0].props.onValueChange("2026-11-02");
  tree = h.render();
  assert.equal(confirm().props.disabled, true);
});

test("busy, failed and empty availability block confirmation; busy modal cannot dismiss", () => {
  for (const extra of [
    { busy: true },
    { error: "Time taken" },
    { times: [] },
    { loading: true },
  ]) {
    const h = harness(extra),
      tree = h.render();
    assert.equal(
      h.nodes(tree, "Button").find((node) => node.props.label === "Confirm")
        .props.disabled,
      true
    );
    if (extra.busy) {
      assert.equal(tree.props.onClose, undefined);
      assert.equal(h.nodes(tree, "Input")[0].props.disabled, true);
    }
  }
});

test("attendance confirmation allows an optional note and uses a shrinkable keyboard layout", () => {
  const h = harness({ times: undefined, requireReason: false });
  const tree = h.render();
  assert.equal(
    h.nodes(tree, "Button").find((node) => node.props.label === "Confirm").props
      .disabled,
    false
  );
  assert.equal(
    h.nodes(tree, "KeyboardAvoidingView")[0].props.behavior,
    "height"
  );
  assert.equal(h.nodes(tree, "ScrollView")[0].props.style.flexShrink, 1);
});
