const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");

function load(file, mocks) {
  const exports = {};
  const absolute = path.resolve(__dirname, file);
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (!name.startsWith(".")) return undefined;
        const target = path.resolve(path.dirname(absolute), name);
        const resolved = [target, target + ".ts", target + ".tsx"].find(
          (file) => fs.existsSync(file) && fs.statSync(file).isFile()
        );
        if (!resolved) throw new Error("Unmocked import: " + name);
        return load(path.relative(__dirname, resolved), mocks);
      },
    }
  );
  return exports;
}

function review({
  expired = false,
  error,
  status = "pending",
  queueState = null,
  visitMode = "clinic",
  paymentPending = false,
} = {}) {
  const state = [];
  let cursor = 0;
  const calls = [],
    toasts = [],
    refreshes = [],
    routes = [];
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const item = {
    id: "booking",
    patient_name: "Test patient",
    patient_public_code: "PAT-TEST",
    patient_age_years: 30,
    patient_gender: "Male",
    row_version: "7",
    status,
    confirmation_payment_pending: paymentPending,
    can_consult: true,
    visit_mode: visitMode,
    starts_at: new Date(
      Date.now() + (expired ? -3600000 : 86400000)
    ).toISOString(),
    request_expires_at: new Date(
      Date.now() + (expired ? -3600000 : 3600000)
    ).toISOString(),
    timezone: "Asia/Kolkata",
    facility_name: "Test clinic",
    public_code: "APT-LONG-12345678",
    queue_state: queueState,
  };
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in state))
        state[index] = typeof initial === "function" ? initial() : initial;
      return [
        state[index],
        (next) => {
          state[index] = typeof next === "function" ? next(state[index]) : next;
        },
      ];
    },
    useEffect: () => {},
    useCallback: (fn) => fn,
  };
  const mocks = {
    "@startup/contracts": load(
      "../../../packages/contracts/src/appointment-recovery.ts",
      { zod: require("../../../packages/contracts/node_modules/zod") }
    ),
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View" },
    "expo-router": {
      router: { push: (route) => routes.push(route) },
      useFocusEffect: () => {},
      useLocalSearchParams: () => ({ appointmentId: "booking" }),
    },
    "expo-haptics": {
      NotificationFeedbackType: { Success: "success" },
      notificationAsync: async () => {},
    },
    "@tanstack/react-query": {
      useQueryClient: () => ({
        invalidateQueries: async (options) => refreshes.push(options.queryKey),
      }),
      useQuery: () => ({
        data: [item],
        refetch: async () => refreshes.push("refetch"),
      }),
      useMutation: (options) => ({
        isPending: false,
        mutate: async (args) => {
          try {
            const result = await options.mutationFn(args);
            options.onSuccess?.(result, args);
          } catch (cause) {
            options.onError?.(cause);
          }
        },
      }),
    },
    "@startup/data-access": {
      listMyPracticeAppointments: async () => [
        { ...item, row_version: "8", queue_state: "called" },
      ],
      transitionClinicAppointment: async (_client, args) => {
        calls.push(args);
        if (error) throw { message: error };
        return args.appointmentId;
      },
    },
    "@startup/mobile-ui": {
      Button: "Button",
      Input: "Input",
      Loader: "Loader",
      useToast: () => ({ showToast: (toast) => toasts.push(toast) }),
    },
    "../../../components/DoctorScreen": {
      DoctorScreen: "Screen",
      Heading: "Heading",
      Label: "Label",
      Panel: "Panel",
    },
    "../../../components/theme": { ui: {} },
    "../../../services/supabase": { supabase: {} },
  };
  const { AppointmentDetailScreen } = load(
    "../src/features/appointments/screens/AppointmentDetailScreen.tsx",
    mocks
  );
  const render = () => {
    cursor = 0;
    const nodes = [];
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== "object") return;
      nodes.push(node);
      walk(node.props?.children);
    };
    walk(AppointmentDetailScreen());
    return nodes;
  };
  return { render, calls, toasts, refreshes, routes };
}

test("payment reservations show their payment state without manual Accept or Reject", () => {
  const nodes = review({ paymentPending: true, visitMode: "online" }).render();
  assert.match(JSON.stringify(nodes), /Awaiting patient payment/);
  assert.ok(
    !nodes.some((node) =>
      ["Accept", "Reject", "Start consultation"].includes(node.props.label)
    )
  );
});

test("separate appointment page accepts a current request and refreshes the home/list data", async () => {
  const view = review();
  const nodes = view.render();
  assert.equal(nodes[0].props.title, "Appointment details");
  assert.equal(nodes[0].props.bottomNav, false);
  const accept = nodes.find((node) => node.props.label === "Accept");
  assert.equal(accept.props.disabled, false);
  await accept.props.onPress();
  assert.equal(view.calls[0].action, "approve");
  assert.equal(view.calls[0].expectedVersion, 7);
  assert.equal(view.calls[0].note, null);
  assert.equal(view.toasts[0].type, "success");
  assert.equal(view.refreshes[0][0], "doctor-clinic-appointments");
});

test("completed online appointments reopen their signed consultation record", () => {
  const view = review({ status: "completed", visitMode: "online" });
  const nodes = view.render();
  nodes
    .find((node) => node.props.label === "View consultation record")
    .props.onPress();
  assert.equal(view.routes[0].pathname, "/clinical-notes");
  assert.equal(view.routes[0].params.appointmentId, "booking");
  assert.equal(view.routes[0].params.mode, "online");
  assert.equal(
    nodes.some((node) => String(node.props.label).includes("QR")),
    false
  );
});

test("expired request cannot be accepted and explains how to recover", async () => {
  const view = review({ expired: true });
  const nodes = view.render();
  const accept = nodes.find((node) => node.props.label === "Accept");
  assert.equal(accept.props.disabled, true);
  assert.match(JSON.stringify(nodes), /Request expired/);
  await accept.props.onPress();
  assert.equal(view.calls.length, 0);
  assert.equal(view.toasts[0].title, "Request expired");
});

test("rejection requires and submits the doctor reason", async () => {
  const view = review();
  let nodes = view.render();
  assert.equal(
    nodes.find((node) => node.props.label === "Reject").props.disabled,
    true
  );
  nodes
    .find((node) => node.type === "Input")
    .props.onChangeText("  Please choose another time  ");
  nodes = view.render();
  const reject = nodes.find((node) => node.props.label === "Reject");
  assert.equal(reject.props.disabled, false);
  await reject.props.onPress();
  assert.equal(view.calls[0].action, "reject");
  assert.equal(view.calls[0].note, "Please choose another time");
});

test("stale updates show a useful message and load the latest state", async () => {
  const view = review({ error: "Appointment changed; refresh and retry" });
  await view
    .render()
    .find((node) => node.props.label === "Accept")
    .props.onPress();
  assert.match(view.toasts[0].message, /updated elsewhere/);
  assert.ok(view.refreshes.includes("refetch"));
});

test("notification destination accepts only an appointment UUID", () => {
  const { appointmentDetailsRoute } = load(
    "../src/features/appointments/utils/appointmentNavigation.ts",
    {
      "@startup/contracts": {
        uuidSchema: {
          safeParse: (value) => ({
            success:
              typeof value === "string" &&
              /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value),
            data: value,
          }),
        },
      },
    }
  );
  assert.equal(appointmentDetailsRoute("/other-screen"), null);
  assert.equal(appointmentDetailsRoute(undefined), null);
  const route = appointmentDetailsRoute("65d508a2-4a3f-4e6c-8594-02045f04a3dc");
  assert.equal(route.pathname, "/appointment-details");
  assert.equal(
    route.params.appointmentId,
    "65d508a2-4a3f-4e6c-8594-02045f04a3dc"
  );
});

test("one Start consultation action calls the queue, uses its new version, and opens the first consultation step", async () => {
  const view = review({ status: "confirmed", queueState: "waiting" });
  const nodes = view.render();
  assert.equal(
    nodes.find((node) => node.type === "Input"),
    undefined
  );
  assert.equal(
    nodes.find((node) => node.props.label === "Hold"),
    undefined
  );
  assert.match(JSON.stringify(nodes), /12345678/);
  assert.doesNotMatch(
    JSON.stringify(
      nodes
        .filter((node) => ["Label", "Heading"].includes(node.type))
        .map((node) => node.props.children)
    ),
    /APT-LONG-/
  );
  assert.equal(
    nodes.find((node) => node.props.label === "Call patient"),
    undefined
  );
  await nodes
    .find((node) => node.props.label === "Start consultation")
    .props.onPress();
  assert.equal(view.calls[0].action, "call");
  assert.equal(view.calls[0].expectedVersion, 7);
  assert.equal(view.calls[1].action, "start");
  assert.equal(view.calls[1].expectedVersion, 8);
  assert.equal(view.routes[0].pathname, "/clinical-notes");
  assert.equal(view.routes[0].params.appointmentId, "booking");
});

test("record-visit and prescription routes hide the parent navbar while normal tabs retain it", () => {
  const jsx = (type, props) => ({ type, props });
  const { default: TabsLayout } = load("../src/app/(app)/(tabs)/_layout.tsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", StyleSheet: { create: (value) => value } },
    "expo-router": {
      Tabs: Object.assign(() => null, { Screen: "TabScreen" }),
      router: {},
    },
    "lucide-react-native": {},
    "@startup/mobile-ui": { BottomNavBar: "NavBar" },
    "../../../components/DoctorScreen": { IconButton: "IconButton" },
    "../../../components/theme": { palette: {} },
  });
  const tabs = TabsLayout().props.children;
  for (const route of [
    "clinical-notes/index",
    "prescription/index",
    "scan-qr/index",
  ]) {
    assert.equal(
      tabs.props.tabBar({ state: { index: 0, routes: [{ name: route }] } }),
      null
    );
  }
  assert.equal(
    tabs.props.tabBar({
      state: { index: 0, routes: [{ name: "appointments/index" }] },
    }).type,
    "NavBar"
  );
});
