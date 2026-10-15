const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
const exportsForSchedule = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.resolve(__dirname, "../src/features/schedule/utils/schedule.ts"),
      "utf8"
    ),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }
  ).outputText,
  { exports: exportsForSchedule }
);
const { suggestConsultationDuration, slotStartTimes, scheduleError } =
  exportsForSchedule;

test("setup suggestion divides working hours by the booking limit and uses five-minute increments", () => {
  assert.equal(suggestConsultationDuration("09:00", "17:00", 12), 40);
  assert.equal(suggestConsultationDuration("09:00", "17:00", 8), 60);
  assert.equal(suggestConsultationDuration("22:00", "24:00", 7), 15);
  assert.equal(suggestConsultationDuration("09:00", "17:00", 0), null);
  assert.equal(suggestConsultationDuration("17:00", "09:00", 12), null);
  assert.equal(suggestConsultationDuration("bad", "17:00", 12), null);
  assert.equal(suggestConsultationDuration("09:00", "17:00", 100), 5);
});

test("saved sixty-minute consultations remain valid when increasing the booking limit", () => {
  const draft = {
    days: [0],
    start: "09:00",
    end: "17:00",
    duration: 60,
    onlineDuration: 15,
    homeDuration: 60,
    online: 8,
    walkIn: 12,
    autoLimit: 1,
    homeVisits: false,
    clinicFee: "100",
    onlineFee: "100",
    homeFee: "100",
  };
  const before = slotStartTimes(draft.start, draft.end, draft.duration);
  const changed = { ...draft, walkIn: 20 };
  assert.equal(scheduleError(changed, "clinic"), undefined);
  assert.equal(changed.duration, 60);
  assert.deepEqual(
    slotStartTimes(changed.start, changed.end, changed.duration),
    before
  );
});

function scheduleView({ published = false } = {}) {
  const state = [],
    memo = [],
    effects = [];
  let cursor = 0;
  const publications = [];
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const prefs = {
    practice_id: "practice",
    row_version: "1",
    working_days: [1],
    online_working_days: [2],
    home_working_days: [3],
    clinic_start: "09:00",
    clinic_end: "17:00",
    slot_minutes: 60,
    online_slot_minutes: 30,
    home_slot_minutes: 60,
    walkin_daily_limit: 12,
    online_daily_limit: 8,
    auto_accept: false,
    auto_accept_limit: 1,
    home_visits: false,
    home_radius_km: null,
    clinic_fee_minor: 10000,
    online_fee_minor: 20000,
    home_fee_minor: 30000,
    published_modes: published ? ["clinic"] : [],
    published_from: {},
  };
  function changed(index, deps) {
    return (
      !memo[index] || deps.some((value, i) => value !== memo[index].deps[i])
    );
  }
  const mocks = {
    react: {
      useState: (initial) => {
        const i = cursor++;
        if (!(i in state))
          state[i] = typeof initial === "function" ? initial() : initial;
        return [
          state[i],
          (next) => {
            state[i] = typeof next === "function" ? next(state[i]) : next;
          },
        ];
      },
      useRef: (initial) => {
        const i = cursor++;
        return state[i] ?? (state[i] = { current: initial });
      },
      useCallback: (fn, deps) => {
        const i = cursor++;
        if (changed(i, deps)) memo[i] = { deps, value: fn };
        return memo[i].value;
      },
      useEffect: (fn, deps) => {
        const i = cursor++;
        if (changed(i, deps)) {
          memo[i] = { deps };
          effects.push(fn);
        }
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", Switch: "Switch", Pressable: "Pressable" },
    "expo-router": { useFocusEffect: () => {} },
    "lucide-react-native": {},
    "@startup/mobile-ui": {
      Button: "Button",
      ClockDurationPicker: "Duration",
      ModalSurface: "Modal",
      useToast: () => ({ showToast: () => {} }),
      useToastFeedback: () => {},
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({ setQueryData: () => {} }),
      useQuery: ({ queryKey }) => ({
        data:
          queryKey[0] === "my-practices"
            ? [{ practice_id: "practice", verified: true }]
            : queryKey[0] === "my-doctor-schedule"
              ? prefs
              : queryKey[0] === "my-doctor-profile"
                ? { booking_timezone: "Asia/Kolkata" }
                : undefined,
      }),
    },
    "@startup/data-access": {
      publishMyDoctorSchedule: async (...args) => {
        publications.push(args);
        return { settings: prefs };
      },
    },
    "@startup/contracts": { formatDisplayDate: (value) => value },
    "../../../services/supabase": {
      supabase: {},
      useMobileSession: () => ({ profile: { doctor: { id: "doctor" } } }),
    },
    "../../practices/selectedPractice": {
      selectedPracticeQueryKey: () => ["selected-practice"],
    },
    "../../../components/DoctorScreen": {
      DoctorScreen: "Screen",
      Label: "Label",
      Heading: "Heading",
    },
    "../../../components/theme": { palette: {}, ui: {} },
    "../../../components/DatePicker": { DatePicker: "DatePicker" },
    "../utils/schedule": exportsForSchedule,
    "../components/ScheduleOperationsPanels": {
      ScheduleSection: "Section",
      WorkingDaysPanel: "Days",
      ClinicHoursPanel: "Hours",
      ConsultationChargesPanel: "Charges",
    },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../src/features/schedule/screens/ScheduleScreen.tsx"
        ),
        "utf8"
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }
    ).outputText,
    { exports, require: (name) => mocks[name] }
  );
  function render() {
    cursor = 0;
    effects.length = 0;
    const nodes = [];
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      nodes.push(node);
      walk(node.props?.children);
    }
    walk(exports.ScheduleScreen({ mode: "clinic" }));
    effects.forEach((fn) => fn());
    return nodes;
  }
  render();
  return { render, publications };
}

test("initial setup previews a suggestion, applies it only on confirmation, and sends the chosen date", async () => {
  const view = scheduleView();
  let nodes = view.render();
  assert.equal(nodes.find((node) => node.type === "Duration").props.value, 60);
  nodes.find((node) => node.props.label === "Suggest duration").props.onPress();
  nodes = view.render();
  assert.equal(nodes.find((node) => node.type === "Duration").props.value, 60);
  assert.equal(
    nodes.filter((node) => node.type === "Modal").at(-1).props.visible,
    true
  );
  nodes
    .find((node) => node.props.label === "Use this duration")
    .props.onPress();
  nodes = view.render();
  assert.equal(nodes.find((node) => node.type === "Duration").props.value, 40);
  nodes
    .find((node) => node.props.title === "Daily booking limit")
    .props.onChange(20);
  nodes = view.render();
  assert.equal(nodes.find((node) => node.type === "Duration").props.value, 40);
  const initialDate = nodes.find((node) => node.type === "DatePicker").props
    .value;
  const chosenDate = new Date(
    new Date(`${initialDate}T12:00:00Z`).getTime() + 7 * 86400000
  )
    .toISOString()
    .slice(0, 10);
  nodes.find((node) => node.type === "DatePicker").props.onChange(chosenDate);
  nodes = view.render();
  await nodes
    .find((node) => node.props.label === "Publish Schedule")
    .props.onPress();
  assert.equal(view.publications.length, 1);
  assert.equal(view.publications[0][1], "practice");
  assert.equal(view.publications[0][2], "clinic");
  assert.equal(view.publications[0][3].slotMinutes, 40);
  assert.equal(view.publications[0][3].walkinDailyLimit, 20);
  assert.equal(view.publications[0][3].onlineSlotMinutes, 30);
  assert.equal(view.publications[0][5], chosenDate);
});

test("published schedule keeps its saved duration and does not offer setup recalculation", () => {
  const view = scheduleView({ published: true });
  let nodes = view.render();
  assert.equal(
    nodes.find((node) => node.props.label === "Suggest duration"),
    undefined
  );
  nodes
    .find((node) => node.props.title === "Daily booking limit")
    .props.onChange(30);
  nodes = view.render();
  assert.equal(nodes.find((node) => node.type === "Duration").props.value, 60);
});
