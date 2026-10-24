const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  path = require("node:path");

function fixture({
  viewportTop = 100,
  viewportHeight = 700,
  inputTop = 650,
  inputHeight = 44,
} = {}) {
  const exports = {},
    listeners = {},
    frames = [],
    insets = [],
    scrolls = [],
    effects = [];
  let visible = true;
  const input = {
    measureLayout: (_view, success) => success(),
    measureInWindow: (callback) => callback(0, inputTop, 100, inputHeight),
  };
  const viewport = {
    measureInWindow: (callback) =>
      callback(0, viewportTop, 300, viewportHeight),
  };
  const react = {
    useRef: (v) => ({ current: v }),
    useState: (v) => [v, (n) => insets.push(n)],
    useCallback: (f) => f,
    useEffect: (effect) => effects.push(effect),
  };
  const native = {
    Keyboard: {
      isVisible: () => visible,
      metrics: () => ({ screenY: 450 }),
      addListener: (name, fn) => {
        listeners[name] = fn;
        return { remove: () => delete listeners[name] };
      },
    },
    TextInput: { State: { currentlyFocusedInput: () => input } },
  };
  const source = fs.readFileSync(
    path.join(__dirname, "../src/hooks/useKeyboardAwareScroll.ts"),
    "utf8"
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (n) => {
        if (n === "react") return react;
        if (n === "react-native") return native;
        if (n === "../utils/keyboardScroll") {
          const helper = {};
          vm.runInNewContext(
            ts.transpileModule(
              fs.readFileSync(
                path.join(__dirname, "../src/utils/keyboardScroll.ts"),
                "utf8"
              ),
              {
                compilerOptions: {
                  module: ts.ModuleKind.CommonJS,
                  target: ts.ScriptTarget.ES2022,
                },
              }
            ).outputText,
            { exports: helper }
          );
          return helper;
        }
        throw Error(`Unmocked import ${n}`);
      },
      requestAnimationFrame: (fn) => {
        frames.push(fn);
        return frames.length;
      },
      cancelAnimationFrame() {},
    }
  );
  const hook = exports.useKeyboardAwareScroll();
  hook.scrollRef.current = {
    getNativeScrollRef: () => viewport,
    scrollTo: (options) => scrolls.push(options),
  };
  const cleanups = effects.map((effect) => effect());
  const flush = () => {
    while (frames.length) frames.shift()();
  };
  return {
    hook,
    scrolls,
    insets,
    flush,
    input,
    show: () => {
      visible = true;
      listeners.keyboardDidShow({
        endCoordinates: { screenY: 450, height: 350 },
      });
      flush();
    },
    hide: () => {
      visible = false;
      listeners.keyboardDidHide();
    },
    cleanup: () => cleanups.forEach((fn) => fn?.()),
  };
}

test("an overlay keyboard supplies scroll room and reveals a lower schedule input", () => {
  const f = fixture();
  f.show();
  assert.equal(f.insets.at(-1), 374);
  assert.equal(f.scrolls.at(-1).y, 268);
  assert.equal(f.scrolls.at(-1).animated, true);
});

test("a resized Android viewport does not add the keyboard height twice", () => {
  const f = fixture({ viewportHeight: 350, inputTop: 400 });
  f.show();
  assert.equal(f.insets.at(-1), 24);
  assert.equal(f.scrolls.at(-1).y, 18);
});

test("switching fields with the keyboard already open reveals the next field from the current offset", () => {
  const f = fixture({ inputTop: 250 });
  f.show();
  assert.equal(f.scrolls.length, 0);
  f.hook.onScroll({ nativeEvent: { contentOffset: { y: 120 } } });
  f.input.measureInWindow = (callback) => callback(0, 600, 100, 44);
  f.hook.revealFocusedInput();
  f.flush();
  assert.equal(f.scrolls.at(-1).y, 338);
});

test("closing the keyboard restores padding and unmounted callbacks cannot scroll", () => {
  const f = fixture();
  f.show();
  f.hide();
  assert.equal(f.insets.at(-1), 0);
  const count = f.scrolls.length;
  f.hook.revealFocusedInput();
  f.cleanup();
  f.flush();
  assert.equal(f.scrolls.length, count);
});
