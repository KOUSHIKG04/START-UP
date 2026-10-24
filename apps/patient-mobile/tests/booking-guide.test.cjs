const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");

function guide({ canGoBack = true } = {}) {
  let step = 0;
  const moves = [],
    routes = [],
    exports = {};
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const react = {
    useState: () => [
      step,
      (next) => {
        step = next;
      },
    ],
    useRef: () => ({
      current: { scrollToOffset: (options) => moves.push(options) },
    }),
    useEffect: () => {},
  };
  const mocks = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      BackHandler: {},
      FlatList: "FlatList",
      Image: "Image",
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      Text: "Text",
      View: "View",
      useWindowDimensions: () => ({ width: 360, height: 800 }),
      StyleSheet: { create: (styles) => styles },
    },
    "expo-router": {
      router: {
        canGoBack: () => canGoBack,
        back: () => routes.push("back"),
        replace: (route) => routes.push(route),
      },
      useLocalSearchParams: () => ({ consultationType: "Online" }),
    },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "lucide-react-native": { ChevronLeft: "ChevronLeft" },
    "@startup/design-tokens": {
      colors: { white: "#FFF", patient: {} },
      fontFamilies: {},
    },
    "@startup/mobile-ui": { Button: "Button", SafeAreaView: "SafeAreaView" },
    "../../appointments/utils/consultation": {
      parseConsultationType: (type) => type,
    },
  };
  function load(file) {
    const result = {};
    const source = fs.readFileSync(file, "utf8");
    vm.runInNewContext(
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      {
        exports: result,
        require: (name) => {
          if (name.endsWith(".png")) return name;
          if (name in mocks) return mocks[name];
          if (name.startsWith(".")) {
            const target = path.resolve(path.dirname(file), name);
            return load([target + ".ts", target + ".tsx"].find(fs.existsSync));
          }
          throw Error("Unmocked " + name);
        },
      }
    );
    return result;
  }
  Object.assign(
    exports,
    load(
      path.join(
        __dirname,
        "../src/features/doctors/screens/BookingGuideScreen.tsx"
      )
    )
  );
  const render = () => {
    const nodes = [];
    const walk = (n) => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!n || typeof n !== "object") return;
      nodes.push(n);
      walk(n.props?.children);
    };
    walk(exports.BookingGuideScreen());
    return nodes;
  };
  return { render, moves, routes, step: () => step };
}

test("Next advances all four steps and Start booking returns to the existing doctor search", () => {
  const g = guide();
  for (let i = 0; i < 3; i++)
    g.render()
      .find((n) => n.type === "Button" && n.props.label === "Next")
      .props.onPress();
  assert.equal(g.step(), 3);
  assert.equal(g.moves.at(-1).offset, 1080);
  g.render()
    .find((n) => n.props.label === "Start booking")
    .props.onPress();
  assert.deepEqual(g.routes, ["back"]);
});

test("Skip closes the guide and does not create or book anything", () => {
  const g = guide();
  g.render()
    .find((n) => n.props.label === "Skip")
    .props.onPress();
  assert.deepEqual(g.routes, ["back"]);
});

test("swiping and previous-step controls stay in sync", () => {
  const g = guide();
  g.render()
    .find((n) => n.type === "FlatList")
    .props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 720 } } });
  assert.equal(g.step(), 2);
  g.render()
    .find((n) => n.props.accessibilityLabel === "Previous step")
    .props.onPress();
  assert.equal(g.step(), 1);
  assert.equal(g.moves.at(-1).offset, 360);
});

test("a directly opened guide falls back to Find Doctors with the same consultation mode", () => {
  const g = guide({ canGoBack: false });
  g.render()
    .find((n) => n.props.label === "Skip")
    .props.onPress();
  assert.equal(g.routes[0].pathname, "/find-doctor");
  assert.equal(g.routes[0].params.consultationType, "Online");
});
