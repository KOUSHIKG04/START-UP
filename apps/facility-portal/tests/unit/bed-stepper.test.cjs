const { test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
function fixture() {
  let draft,
    committed = [],
    messages = [];
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: {
      useState: (initial) => {
        if (draft === undefined) draft = initial;
        return [
          draft,
          (next) => {
            draft = next;
          },
        ];
      },
      useEffect: () => {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "lucide-react": { ChevronDown: "Down", ChevronUp: "Up" },
    "@startup/web-ui/components/ui/toast": {
      toast: { add: (m) => messages.push(m) },
    },
  };
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../../src/features/facilities/components/BedCountStepper.tsx"
    ),
    "utf8"
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (n) => mocks[n], Number }
  );
  return {
    committed,
    messages,
    render: (extra = {}) =>
      exports.BedCountStepper({
        label: "Occupied beds",
        value: 3,
        max: 10,
        disabled: false,
        onCommit: (v) => committed.push(v),
        ...extra,
      }).props.children,
  };
}
test("manual bed entry saves once on blur and arrows adjust the entered number", () => {
  const f = fixture();
  f.render()[1].props.onChange({ target: { value: "7" } });
  f.render()[1].props.onBlur();
  assert.deepEqual(f.committed, [7]);
  let prevented = false;
  f.render()[0].props.onPointerDown({
    preventDefault: () => {
      prevented = true;
    },
  });
  f.render()[0].props.onClick();
  assert.equal(prevented, true);
  assert.deepEqual(f.committed, [7, 6]);
});
test("invalid and out-of-capacity bed counts never reach persistence", () => {
  const f = fixture();
  f.render()[1].props.onChange({ target: { value: "11" } });
  f.render()[1].props.onBlur();
  assert.equal(f.committed.length, 0);
  assert.equal(f.messages.length, 1);
  f.render()[1].props.onChange({ target: { value: "" } });
  f.render()[1].props.onKeyDown({ key: "Enter", preventDefault() {} });
  assert.equal(f.committed.length, 0);
});
test("saving disables both arrows and the number input in that row", () => {
  const children = fixture().render({ disabled: true });
  assert.equal(children[0].props.disabled, true);
  assert.equal(children[1].props.disabled, true);
  assert.equal(children[2].props.disabled, true);
});
