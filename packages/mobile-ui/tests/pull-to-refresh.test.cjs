const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

const jsx = (type, props) => ({ type, props });

function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(path.resolve(__dirname, "../src", file), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }
    ).outputText,
    {
      exports,
      require: (name) => {
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name in mocks) return mocks[name];
        throw new Error(`Unmocked import: ${name}`);
      },
    }
  );
  return exports;
}

function refreshView(onRefresh, theme = "patient", nativeProps = {}) {
  const state = [],
    refs = [],
    effects = [],
    updates = [],
    toasts = [];
  let stateIndex = 0,
    refIndex = 0;
  const { PullToRefresh } = load("primitives/PullToRefresh.tsx", {
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value) => {
            updates.push(value);
            state[index] = value;
          },
        ];
      },
      useRef(initial) {
        const index = refIndex++;
        return refs[index] ?? (refs[index] = { current: initial });
      },
      useEffect: (effect) => {
        if (!effects.length) effects.push(effect());
      },
    },
    "react-native": { RefreshControl: "RefreshControl" },
    "../theme/MobileThemeProvider": {
      useMobileTheme: (app) => ({
        primary: `${app}-primary`,
        surface: `${app}-surface`,
      }),
    },
    "./Toast": {
      useToast: () => ({ showToast: (toast) => toasts.push(toast) }),
    },
  });
  return {
    render() {
      stateIndex = 0;
      refIndex = 0;
      return PullToRefresh({
        onRefresh,
        theme,
        progressViewOffset: 120,
        ...nativeProps,
      }).props;
    },
    unmount() {
      effects.forEach((cleanup) => cleanup?.());
    },
    updates,
    toasts,
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("Android's injected scroll content and outer layout reach the native refresh layout", () => {
  const children = { type: "NativeScrollView" };
  const style = { flex: 1, marginTop: 8 };
  const props = refreshView(async () => {}, "driver", {
    children,
    style,
  }).render();
  assert.equal(props.children, children);
  assert.equal(props.style, style);
});

test("a failed request in a group waits for the remaining requests before stopping", async () => {
  let finish;
  const view = refreshView(() => [
    Promise.reject(new Error("Offline")),
    new Promise((resolve) => {
      finish = resolve;
    }),
  ]);
  view.render().onRefresh();
  await flush();
  assert.equal(view.render().refreshing, true);
  assert.equal(view.toasts.length, 0);
  finish();
  await flush();
  assert.equal(view.render().refreshing, false);
  assert.equal(view.toasts.length, 1);
});

test("manual refresh stays busy until completion and ignores repeated gestures", async () => {
  let finish,
    requests = 0;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const view = refreshView(() => {
    requests++;
    return pending;
  });
  const props = view.render();
  assert.equal(props.refreshing, false);
  props.onRefresh();
  props.onRefresh();
  assert.equal(requests, 1);
  assert.equal(view.render().refreshing, true);
  finish();
  await flush();
  assert.equal(view.render().refreshing, false);
  view.render().onRefresh();
  await flush();
  assert.equal(requests, 2);
});

test("failed refresh clears the spinner, shows safe recovery copy, and can retry", async () => {
  let fail = true;
  const view = refreshView(async () => {
    if (fail) throw new Error("Private backend error");
  });
  view.render().onRefresh();
  await flush();
  assert.equal(view.render().refreshing, false);
  assert.equal(view.toasts.length, 1);
  assert.equal(view.toasts[0].type, "error");
  assert.doesNotMatch(JSON.stringify(view.toasts), /Private backend/);
  fail = false;
  view.render().onRefresh();
  await flush();
  assert.equal(view.toasts.length, 1);
  assert.equal(view.render().refreshing, false);
});

test("leaving the screen suppresses pending state and error updates", async () => {
  let fail;
  const view = refreshView(
    () =>
      new Promise((_, reject) => {
        fail = reject;
      })
  );
  view.render().onRefresh();
  view.unmount();
  fail(new Error("Network error"));
  await flush();
  assert.deepEqual(view.updates, [true]);
  assert.equal(view.toasts.length, 0);
});

test("the native refresh indicator follows each app palette and header offset", () => {
  for (const app of ["patient", "doctor", "driver"]) {
    const props = refreshView(async () => {}, app).render();
    assert.equal(props.tintColor, `${app}-primary`);
    assert.equal(props.colors[0], `${app}-primary`);
    assert.equal(props.progressBackgroundColor, `${app}-surface`);
    assert.equal(props.progressViewOffset, 120);
  }
});

test("short vertical lists can refresh; horizontal strips preserve their scrolling", () => {
  const { FadedScrollView } = load("primitives/FadedScrollView.tsx", {
    react: { useRef: (value) => ({ current: value }) },
    "react-native": {
      Animated: {
        Value: class {
          setValue() {}
        },
        View: "AnimatedView",
      },
      ScrollView: "ScrollView",
      View: "View",
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    },
    "expo-linear-gradient": { LinearGradient: "Gradient" },
    "@startup/design-tokens": { colors: { ui: { fade: "#ffffff" } } },
    "./PullToRefresh": { PullToRefresh: "PullToRefresh" },
  });
  const refresh = async () => {};
  const vertical = FadedScrollView({
    onRefresh: refresh,
    refreshTheme: "doctor",
    refreshOffset: 100,
  }).props.children[0].props;
  assert.equal(vertical.alwaysBounceVertical, true);
  assert.equal(vertical.refreshControl.type, "PullToRefresh");
  assert.equal(vertical.refreshControl.props.onRefresh, refresh);
  assert.equal(vertical.refreshControl.props.progressViewOffset, 100);
  const horizontal = FadedScrollView({ horizontal: true, onRefresh: refresh })
    .props.children[0].props;
  assert.equal(horizontal.refreshControl, undefined);
  assert.equal(horizontal.alwaysBounceVertical, false);
  const custom = FadedScrollView({ refreshControl: "custom" }).props.children[0]
    .props;
  assert.equal(custom.refreshControl, "custom");
});
