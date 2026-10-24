const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

const jsx = (type, props) => ({ type, props });

function load(file, mocks) {
  const absolute = path.resolve(__dirname, file),
    exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (!name.startsWith(".")) throw new Error("Unmocked import: " + name);
        const target = path.resolve(path.dirname(absolute), name);
        const resolved = [target, target + ".ts", target + ".tsx"].find(
          (file) => fs.existsSync(file) && fs.statSync(file).isFile()
        );
        if (!resolved) throw new Error("Unresolved import: " + name);
        return load(resolved, mocks);
      },
      Date,
      Number,
    }
  );
  return exports;
}

function nodes(tree) {
  if (!tree) return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}

const components = Object.fromEntries(
  [
    "Button",
    "Chip",
    "FadedScrollView",
    "Input",
    "Loader",
    "Skeleton",
    "ClockDurationPicker",
    "ModalSurface",
  ].map((name) => [name, name])
);

const base = {
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "react-native": { View: "View", Switch: "Switch", Pressable: "Pressable" },
  "@startup/mobile-ui": components,
  "../../../components/DoctorScreen": {
    Heading: "Heading",
    Label: "Label",
    Panel: "Panel",
    DoctorScreen: "DoctorScreen",
    Choice: "Choice",
  },
  "../../../components/theme": { palette: {}, ui: {} },
};

for (const mode of ["clinic", "online", "home"]) {
  test(`${mode} editor publishes through its own controller`, () => {
    let receivedMode,
      saves = 0;
    const { ScheduleScreen } = load(
      "../src/features/schedule/screens/ScheduleScreen.tsx",
      {
        ...base,
        "../components/AppointmentRecoveryPolicy": {
          AppointmentRecoveryPolicy: "AppointmentRecoveryPolicy",
        },
        "lucide-react-native": { Calendar: "Calendar", Check: "Check" },
        "../../../components/DatePicker": { DatePicker: "DatePicker" },
        "../components/NumberSetting": { NumberSetting: "NumberSetting" },
        "../hooks/useScheduleEditor": {
          useScheduleEditor({ mode }) {
            receivedMode = mode;
            return {
              practices: { data: [], isLoading: false, isFetching: false },
              doctorProfile: {},
              associationRequests: {},
              saved: {},
              selectedPracticeId: "practice",
              selectedPractice: { verified: true },
              draft: { days: [0], autoAccept: false, homeVisits: false },
              zone: "Asia/Kolkata",
              busy: false,
              suggestion: null,
              suggestedTimes: [],
              suggestedDuration: null,
              availabilityDuration: null,
              save() {
                saves++;
              },
            };
          },
        },
      }
    );
    const buttons = nodes(ScheduleScreen({ mode })).filter(
      (node) =>
        node.type === "Button" &&
        /^(Publish|Save) Schedule$/.test(node.props.label)
    );
    assert.equal(receivedMode, mode);
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].props.label, "Publish Schedule");
    assert.equal(buttons[0].props.disabled, false);
    buttons[0].props.onPress();
    assert.equal(saves, 1);
  });
  test(`${mode} charges editor hides other service fees`, () => {
    const { ConsultationChargesPanel } = load(
      "../src/features/schedule/components/ConsultationChargesPanel.tsx",
      base
    );
    const inputs = nodes(
      ConsultationChargesPanel({
        mode,
        draft: { clinicFee: "100", onlineFee: "200", homeFee: "300" },
      })
    ).filter((node) => node.type === "Input");
    assert.equal(inputs.length, 1);
    assert.equal(
      inputs[0].props.value,
      { clinic: "100", online: "200", home: "300" }[mode]
    );
  });
}
