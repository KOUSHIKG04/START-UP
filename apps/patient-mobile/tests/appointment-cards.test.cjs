const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks) {
  const exports = {};
  const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(mocks, name), `Unmocked import: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

function nodesOf(tree) {
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    nodes.push(node);
    visit(node.props?.children);
    visit(node.props?.footer);
  }
  visit(tree);
  return nodes;
}

function renderCard(appointment, onPress, options = {}) {
  const routes = [],
    toasts = [];
  const jsx = (type, props) => ({ type, props });
  const { default: BookingCard } = load(
    "../src/features/appointments/components/BookingCard.tsx",
    {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "react-native": {
        Pressable: "Pressable",
        ActivityIndicator: "Spinner",
        View: "View",
        StyleSheet: { create: (value) => value, absoluteFill: {} },
      },
      "expo-router": { router: { push: (value) => routes.push(value) } },
      "expo-linear-gradient": { LinearGradient: "Gradient" },
      "lucide-react-native": {
        CalendarDays: "Calendar",
        ChevronRight: "Chevron",
        EllipsisVertical: "More",
        UserRound: "Avatar",
      },
      "@startup/design-tokens": {
        colors: {
          white: "white",
          patient: { primaryDark: "teal", surface: "pale-teal" },
        },
        fontFamilies: {},
        typography: {
          body: { fontSize: 16, lineHeight: 24 },
          caption: { fontSize: 13, lineHeight: 18 },
        },
        mobileTypography: { caption: { fontSize: 12, lineHeight: 16 } },
        gradients: { patientBanner: { colors: ["teal", "teal"] } },
        radius: { lg: 16 },
      },
      "@startup/mobile-ui": {
        AppText: "Text",
        Card: "Card",
        useToast: () => ({ showToast: (value) => toasts.push(value) }),
      },
    }
  );
  const tree = BookingCard({ appointment, onPress, ...options });
  const nodes = nodesOf(tree);
  const summary = nodes.find((node) => node.props.onAccessibilityAction);
  return { tree, summary, nodes, routes, toasts };
}

const appointment = {
  doctorName: "Dr. Michael Chen",
  specialty: "Cardiologist",
  consultationType: "Clinic Visit",
  date: "29-04-2026",
  time: "10:30 AM",
  status: "approved",
  practiceId: "booked-practice",
  serviceId: "booked-service",
};

test("only the doctor avatar and name navigate to the booked doctor without opening the appointment", () => {
  let detailsOpened = 0;
  const view = renderCard(appointment, () => detailsOpened++);
  const links = view.nodes.filter(
    (node) => node.props.accessibilityRole === "link"
  );
  assert.equal(links.length, 2);
  for (const link of links) {
    let stopped = false;
    link.props.onPress({
      stopPropagation: () => {
        stopped = true;
      },
    });
    if (!stopped) view.summary.props.onPress();
    assert.equal(stopped, true);
  }
  assert.equal(detailsOpened, 0);
  for (const route of view.routes) {
    assert.equal(route.pathname, "/doctor-profile");
    assert.equal(route.params.practiceId, appointment.practiceId);
    assert.equal(route.params.serviceId, appointment.serviceId);
    assert.equal(route.params.consultationType, "Clinic Visit");
  }
  view.summary.props.onPress();
  assert.equal(detailsOpened, 1);
  assert.equal(view.routes.length, 2);
  assert.equal(
    view.nodes.some(
      (node) => node.props.children === "View appointment details"
    ),
    false
  );
});

test("doctor links also work on appointment details and never guess a doctor for older responses", () => {
  const details = renderCard(appointment);
  assert.equal(details.summary.props.onPress, undefined);
  details.summary.props.onAccessibilityAction({
    nativeEvent: { actionName: "doctorProfile" },
  });
  assert.equal(details.routes[0].params.practiceId, appointment.practiceId);
  const older = renderCard({ ...appointment, practiceId: undefined });
  const avatar = older.nodes.find(
    (node) => node.props.accessibilityRole === "link"
  );
  let stopped = false;
  avatar.props.onPress({
    stopPropagation: () => {
      stopped = true;
    },
  });
  assert.equal(stopped, true);
  assert.equal(older.routes.length, 0);
  assert.equal(older.toasts[0].title, "Doctor details unavailable");
});

test("appointment display mapping retains the actual practice and service IDs", () => {
  const { clinicAppointmentCard } = load(
    "../src/features/appointments/utils/clinicAppointmentCard.ts",
    {
      "@startup/contracts": { formatDisplayDate: () => "29-04-2026" },
    }
  );
  const mapped = clinicAppointmentCard({
    id: "appointment",
    public_code: "A-1",
    practice_id: "booked-practice",
    practice_service_id: "booked-service",
    starts_at: "2026-04-29T05:00:00Z",
    doctor_name: "Doctor",
    service_name: "Cardiology",
    visit_mode: "clinic",
    facility_name: "Clinic",
    fee_minor: "50000",
    currency: "INR",
    status: "confirmed",
  });
  assert.equal(mapped.practiceId, "booked-practice");
  assert.equal(mapped.serviceId, "booked-service");
  assert.equal(mapped.backendId, "appointment");
});

test("card actions are separate from the summary press and overflow never opens appointment details", () => {
  let detailsOpened = 0,
    actionsOpened = 0,
    joined = 0;
  const footer = {
    type: "Button",
    props: { label: "Join consultation", onPress: () => joined++ },
  };
  const view = renderCard(appointment, () => detailsOpened++, {
    footer,
    onMorePress: () => actionsOpened++,
  });
  assert.equal(view.tree.props.onPress, undefined);
  assert.ok(
    view.tree.props.children.some((node) => node?.props?.children === footer)
  );
  footer.props.onPress();
  assert.equal(joined, 1);
  assert.equal(detailsOpened, 0);
  const more = view.nodes.find((node) =>
    node.props.accessibilityLabel?.startsWith("More booking actions for")
  );
  let stopped = false;
  more.props.onPress({
    stopPropagation: () => {
      stopped = true;
    },
  });
  if (!stopped) view.summary.props.onPress();
  assert.equal(stopped, true);
  assert.equal(actionsOpened, 1);
  assert.equal(detailsOpened, 0);
});

function bookingsView(rows, { cancelPending = false } = {}) {
  let menuId = null;
  const cancelled = [],
    routes = [];
  const jsx = (type, props) => ({ type, props });
  const { AppointmentsScreen } = load(
    "../src/features/appointments/screens/AppointmentsScreen.tsx",
    {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      react: {
        useState: () => [
          menuId,
          (value) => {
            menuId = value;
          },
        ],
      },
      "react-native": {
        View: "View",
        ScrollView: "ScrollView",
        StyleSheet: { create: (value) => value },
      },
      "expo-router": { router: { push: (value) => routes.push(value) } },
      "@startup/design-tokens": {
        colors: { white: "white", patient: {} },
        fontFamilies: {},
        spacing: { lg: 24 },
      },
      "@startup/mobile-ui": {
        AppText: "Text",
        Button: "Button",
        Chip: "Chip",
        FadedScrollView: "Scroll",
        Header: "Header",
        Skeleton: "Skeleton",
        ModalSurface: "Modal",
      },
      "../components/BookingCard": { __esModule: true, default: "BookingCard" },
      "../utils/appointmentsConstants": { bookingFilters: ["All"] },
      "../utils/clinicVisit": {
        canOpenClinicVisit: (item) =>
          item.visit_mode === "clinic" &&
          ["confirmed", "in_consultation"].includes(item.status),
        clinicVisitRoute: (item) => ({
          pathname: "/visit-session",
          params: { backendId: item.id, mode: "clinic-check-in" },
        }),
      },
      "../utils/clinicAppointmentCard": {
        clinicAppointmentCard: (item) => ({
          ...appointment,
          id: item.id,
          backendId: item.id,
        }),
      },
      "../hooks/useAppointments": {
        useAppointments: () => ({
          filter: "All",
          setFilter() {},
          visible: rows,
          appointments: { isLoading: false, isError: false },
          cancel: {
            isPending: cancelPending,
            variables: rows[0],
            mutate: (item) => cancelled.push(item),
          },
        }),
      },
    }
  );
  return {
    render: () => nodesOf(AppointmentsScreen({})),
    cancelled,
    routes,
  };
}

const bookingRows = [
  {
    id: "clinic",
    visit_mode: "clinic",
    status: "confirmed",
    queue_state: "awaiting_arrival",
  },
  {
    id: "online",
    visit_mode: "online",
    status: "confirmed",
    queue_state: null,
  },
  {
    id: "active",
    visit_mode: "online",
    status: "in_consultation",
    queue_state: null,
  },
  { id: "pending", visit_mode: "clinic", status: "pending", queue_state: null },
  {
    id: "completed",
    visit_mode: "clinic",
    status: "completed",
    queue_state: null,
  },
  {
    id: "cancelled",
    visit_mode: "clinic",
    status: "cancelled",
    queue_state: null,
  },
  {
    id: "waiting",
    visit_mode: "clinic",
    status: "confirmed",
    queue_state: "waiting",
    ticket_number: 7,
    ahead_count: 2,
  },
].map((row) => ({
  ...row,
  doctor_name: "Booked doctor",
  public_code: `APPOINTMENT-2026-${row.id}`,
}));

test("each booking opens its visit page while cancellation stays in its menu", () => {
  const view = bookingsView(bookingRows);
  const cards = view.render().filter((node) => node.type === "BookingCard");
  const actions = (card) =>
    nodesOf(card.props.footer).filter((node) => node.type === "Button");
  assert.deepEqual(
    actions(cards[0]).map((node) => node.props.label),
    ["Show check-in QR"]
  );
  assert.deepEqual(
    actions(cards[1]).map((node) => node.props.label),
    ["Join consultation"]
  );
  assert.deepEqual(
    actions(cards[2]).map((node) => node.props.label),
    ["Join consultation"]
  );
  assert.equal(cards[2].props.onMorePress, undefined);
  assert.equal(cards[3].props.footer, undefined);
  assert.equal(actions(cards[4])[0].props.label, "Rate doctor");
  const thankYou = nodesOf(cards[4].props.footer).find(
    (node) => node.type === "Text" && node.props.children === "Thank you"
  );
  assert.ok(thankYou);
  assert.equal(thankYou.props.onPress, undefined);
  actions(cards[4])[0].props.onPress();
  assert.equal(view.routes[0].pathname, "/rate-doctor/[id]");
  assert.equal(view.routes[0].params.id, "completed");
  view.routes.length = 0;
  assert.equal(cards[4].props.onMorePress, undefined);
  assert.equal(cards[5].props.footer, undefined);
  assert.equal(cards[5].props.onMorePress, undefined);
  assert.equal(actions(cards[6])[0].props.label, "View clinic queue");
  assert.equal(
    nodesOf(cards[0].props.footer).find((node) => node.type === "QRCode"),
    undefined
  );
  for (const card of cards)
    assert.equal(
      actions(card).some((node) => node.props.label === "Cancel booking"),
      false
    );
  actions(cards[0])[0].props.onPress();
  assert.equal(view.routes[0].pathname, "/visit-session");
  assert.equal(view.routes[0].params.backendId, "clinic");
  assert.equal(view.routes[0].params.mode, "clinic-check-in");
  view.routes.length = 0;
  actions(cards[1])[0].props.onPress();
  assert.equal(view.routes[0].pathname, "/visit-session");
  assert.equal(view.routes[0].params.backendId, "online");
  assert.equal(view.routes[0].params.mode, "online-video");
  cards[1].props.onMorePress();
  let nodes = view.render();
  assert.equal(nodes.find((node) => node.type === "Modal").props.visible, true);
  const menuReference = nodes.find(
    (node) =>
      node.type === "Text" &&
      Array.isArray(node.props.children) &&
      node.props.children[0] === "Booked doctor"
  );
  assert.equal(
    menuReference.props.children[1],
    ` · ${bookingRows[1].public_code.slice(-8)}`
  );
  nodes
    .find(
      (node) => node.type === "Button" && node.props.label === "Cancel booking"
    )
    .props.onPress();
  assert.equal(view.cancelled[0], bookingRows[1]);
  assert.equal(
    view.render().find((node) => node.type === "Modal").props.visible,
    false
  );
});

test("pending cancellation keeps its loading state without blocking navigation to the QR page", () => {
  const view = bookingsView(bookingRows, {
    cancelPending: true,
  });
  const cards = view.render().filter((node) => node.type === "BookingCard");
  assert.equal(cards[0].props.moreDisabled, true);
  assert.equal(cards[0].props.moreLoading, true);
  assert.equal(cards[1].props.moreLoading, false);
  const qrButton = nodesOf(cards[0].props.footer).find(
    (node) => node.type === "Button"
  );
  assert.notEqual(qrButton.props.disabled, true);
  qrButton.props.onPress();
  assert.equal(view.routes[0].params.mode, "clinic-check-in");
});
