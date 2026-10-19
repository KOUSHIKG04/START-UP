const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, mocks, globals = {}) {
  const absolute = path.resolve(__dirname, file);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (!name.startsWith(".")) throw new Error(`Unmocked import: ${name}`);
      const target = path.resolve(path.dirname(absolute), name);
      const resolved = [target, `${target}.ts`, `${target}.tsx`].find(
        (file) => fs.existsSync(file) && fs.statSync(file).isFile()
      );
      if (!resolved) throw new Error(`Unresolved import: ${name}`);
      return load(path.relative(__dirname, resolved), mocks, globals);
    },
    ...globals,
  });
  return exports;
}

function hooks() {
  const state = [],
    effects = [];
  let cursor = 0;
  return {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state))
          state[index] = typeof initial === "function" ? initial() : initial;
        return [
          state[index],
          (next) => {
            state[index] =
              typeof next === "function" ? next(state[index]) : next;
          },
        ];
      },
      useEffect(effect) {
        effects.push(effect);
      },
    },
    effects,
    render(callback) {
      cursor = 0;
      effects.length = 0;
      return callback();
    },
  };
}

function home({ granted = true, failOffer = false } = {}) {
  const view = hooks(),
    calls = [],
    toasts = [],
    routes = [],
    timers = [],
    cleared = [];
  const offer = {
    id: "offer",
    status: "pending",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  const queryClient = {
    invalidateQueries: async ({ queryKey }) =>
      calls.push(["invalidate", ...queryKey]),
  };
  const { useDriverHome } = load(
    "../src/features/home/hooks/useDriverHome.ts",
    {
      react: view.react,
      "expo-router": {
        router: { prefetch() {}, push: (route) => routes.push(route) },
      },
      "react-native-safe-area-context": {
        useSafeAreaInsets: () => ({ top: 0 }),
      },
      "expo-location": {
        Accuracy: { High: "high" },
        requestForegroundPermissionsAsync: async () => {
          calls.push(["permission"]);
          return { granted };
        },
        getCurrentPositionAsync: async () => ({
          coords: { latitude: 12.9, longitude: 77.5 },
        }),
        requestBackgroundPermissionsAsync: async () => {
          calls.push(["background"]);
        },
      },
      "expo-haptics": {
        NotificationFeedbackType: { Success: "success" },
        notificationAsync: async () => {},
      },
      "@startup/mobile-ui": {
        useToast: () => ({ showToast: (toast) => toasts.push(toast) }),
        useToastFeedback() {},
        useTimeGreeting: () => "Good morning",
      },
      "@tanstack/react-query": {
        useQueryClient: () => queryClient,
        useQuery: ({ queryKey }) => ({
          data:
            queryKey[0] === "driver-fleet"
              ? [
                  {
                    vehicle_id: "vehicle",
                    desired_availability: "offline",
                    ready_to_go_available: true,
                  },
                ]
              : queryKey[0] === "driver-offers"
                ? [offer]
                : [],
        }),
      },
      "@startup/data-access": {
        setMyDriverAvailability: async (_client, input) =>
          calls.push(["availability", input]),
        respondMyDriverOffer: async (_client, id, accept) => {
          calls.push(["respond", id, accept]);
          if (failOffer) throw new Error("Expired");
        },
      },
      "../../../services/supabase": {
        supabase: {},
        useMobileSession: () => ({ profile: { driver: { id: "driver" } } }),
      },
    },
    {
      setTimeout: (callback, delay) => {
        const timer = { callback, delay };
        timers.push(timer);
        return timer;
      },
      setInterval: (callback, delay) => {
        const timer = { callback, delay };
        timers.push(timer);
        return timer;
      },
      clearTimeout: (timer) => cleared.push(timer),
      clearInterval: (timer) => cleared.push(timer),
    }
  );
  return {
    ...view,
    render: () => view.render(useDriverHome),
    calls,
    toasts,
    routes,
    timers,
    cleared,
  };
}

test("live availability keeps permission checks, vehicle coordinates, and fleet invalidation", async () => {
  const view = home();
  await view.render().changeAvailability(true);
  const input = view.calls.find(([kind]) => kind === "availability")[1];
  assert.equal(input.vehicleId, "vehicle");
  assert.equal(input.online, true);
  assert.equal(input.latitude, 12.9);
  assert.equal(input.longitude, 77.5);
  assert.ok(
    view.calls.some(
      (call) => call.join(":") === "invalidate:driver-fleet:driver"
    )
  );
  assert.equal(view.render().busy, false);
  const denied = home({ granted: false });
  await denied.render().changeAvailability(true);
  assert.equal(
    denied.calls.some(([kind]) => kind === "availability"),
    false
  );
  assert.equal(denied.toasts.at(-1).title, "Availability update failed");
});

test("accepting a live offer refreshes requests/trips and routes only after success", async () => {
  const view = home();
  await view.render().respond(true);
  assert.ok(view.calls.some((call) => call.join(":") === "respond:offer:true"));
  assert.ok(
    view.calls.some(
      (call) => call.join(":") === "invalidate:driver-offers:driver"
    )
  );
  assert.ok(
    view.calls.some(
      (call) => call.join(":") === "invalidate:my-driver-trips:driver"
    )
  );
  assert.deepEqual(view.routes, ["/trip"]);
  const expired = home({ failOffer: true });
  await expired.render().respond(true);
  assert.equal(expired.routes.length, 0);
  assert.equal(expired.toasts.at(-1).title, "Request unavailable");
});

test("offer expiry and countdown timers both dispose on unmount", () => {
  const view = home();
  view.render();
  const cleanups = view.effects
    .map((effect) => effect())
    .filter((cleanup) => typeof cleanup === "function");
  assert.equal(view.timers.length, 2);
  cleanups.forEach((cleanup) => cleanup());
  assert.equal(view.cleared.length, 2);
});

test("live trip actions preserve versions, failed PIN input, and completed-trip selection", async () => {
  const view = hooks(),
    calls = [],
    toasts = [];
  let verified = false;
  const trip = {
    id: "trip",
    status: "arrived_at_destination",
    row_version: "7",
  };
  const { useDriverTrip } = load(
    "../src/features/trips/hooks/useDriverTrip.ts",
    {
      react: view.react,
      "@tanstack/react-query": {
        useQuery: () => ({
          data: [trip],
          refetch: async () => calls.push(["refetch"]),
        }),
      },
      "@startup/mobile-ui": {
        useToast: () => ({ showToast: (toast) => toasts.push(toast) }),
        useToastFeedback() {},
      },
      "@startup/data-access": {
        transitionMyDriverTrip: async (_client, input) =>
          calls.push(["transition", input]),
        completeMyDriverTrip: async (_client, input) => {
          calls.push(["complete", input]);
          return verified;
        },
      },
      "../../../services/supabase": {
        supabase: {},
        useMobileSession: () => ({ profile: { driver: { id: "driver" } } }),
      },
    }
  );
  const render = () => view.render(useDriverTrip);
  await render().transition(trip, "arrive_destination");
  assert.equal(calls[0][1].tripId, "trip");
  assert.equal(calls[0][1].expectedVersion, 7);
  render().setPin("1234");
  await render().complete(trip);
  assert.equal(
    calls.find(([kind]) => kind === "complete")[1].patientPin,
    "1234"
  );
  assert.equal(render().pin, "1234");
  assert.equal(toasts.at(-1).title, "PIN not verified");
  verified = true;
  await render().complete(trip);
  trip.status = "completed";
  assert.equal(render().pin, "");
  assert.equal(render().trip.id, "trip");
  assert.equal(toasts.at(-1).title, "Trip completed");
});

function locationPicker(file, from) {
  const chosen = [],
    routes = [],
    cameras = [];
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const { default: Screen } = load(
    file,
    {
      react: {
        useState: (initial) => [
          typeof initial === "function" ? initial() : initial,
          () => {},
        ],
        useRef: (initial) => ({
          current:
            initial === null
              ? { setCameraPosition: (camera) => cameras.push(camera) }
              : initial,
        }),
        useMemo: (callback) => callback(),
        useCallback: (callback) => callback,
        useEffect() {},
      },
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "react-native": {
        View: "View",
        Text: "Text",
        Pressable: "Pressable",
        Platform: { OS: "android" },
        Keyboard: { dismiss() {} },
        StyleSheet: { create: (value) => value },
      },
      "expo-router": {
        useLocalSearchParams: () => ({
          latitude: "12.9",
          longitude: "77.5",
          id: "address-id",
          from,
        }),
        router: {
          back: () => routes.push("back"),
          replace: (route) => routes.push(route),
        },
      },
      "expo-constants": {
        __esModule: true,
        default: {
          appOwnership: "standalone",
          expoConfig: { extra: { googleMapsConfigured: true } },
        },
      },
      "expo-status-bar": {},
      "expo-location": {},
      "expo-maps": { GoogleMaps: { View: "GoogleMapView" } },
      "react-native-safe-area-context": {
        useSafeAreaInsets: () => ({ bottom: 0 }),
      },
      "lucide-react-native": {},
      "@startup/design-tokens": { colors: { driver: {} }, fontFamilies: {} },
      "@startup/mobile-ui": {
        Button: "Button",
        Header: "Header",
        Input: "Input",
        useToast: () => ({ showToast() {} }),
      },
      "@startup/data-access": {},
      "@startup/contracts": {
        mapPlaceSchema: { safeParse: () => ({ success: false }) },
      },
      "../../../services/supabase": { supabase: null },
      "../stores/locationDraft": {
        useDriverLocationDraft: (select) =>
          select({ choose: (value) => chosen.push(value) }),
      },
      "../stores/savedLocationDraft": {
        useLocationDraft: (select) =>
          select({ choose: (value) => chosen.push(value) }),
      },
      "../services/resolveAddress": {},
    },
    { setTimeout, clearTimeout }
  );
  const nodes = [];
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    nodes.push(node);
    walk(node.props?.children);
  }
  walk(Screen());
  return { chosen, routes, cameras, nodes };
}

test("registration and saved-location pickers keep separate draft payloads and navigation", () => {
  const registration = locationPicker(
    "../src/features/locations/screens/DriverLocationScreen.tsx"
  );
  registration.nodes
    .find((node) => node.props.label === "Confirm Location")
    .props.onPress();
  assert.equal(registration.chosen[0].latitude, 12.9);
  assert.equal("addressId" in registration.chosen[0], false);
  assert.deepEqual(registration.routes, ["back"]);
  const saved = locationPicker(
    "../src/features/locations/screens/SavedLocationPickerScreen.tsx"
  );
  saved.nodes
    .find((node) => node.props.label === "Confirm Location")
    .props.onPress();
  assert.equal(saved.chosen[0].addressId, "address-id");
  assert.deepEqual(saved.routes, ["/address-details"]);
  const profile = locationPicker(
    "../src/features/locations/screens/SavedLocationPickerScreen.tsx",
    "profile"
  );
  profile.nodes
    .find((node) => node.props.label === "Confirm Location")
    .props.onPress();
  assert.deepEqual(profile.routes, ["back"]);
});

test("shared location helpers preserve map selection and nonanimated camera restoration", () => {
  for (const file of ["DriverLocationScreen", "SavedLocationPickerScreen"]) {
    const picker = locationPicker(
      `../src/features/locations/screens/${file}.tsx`
    );
    const map = picker.nodes.find((node) => node.type === "GoogleMapView");
    map.props.onMapClick({
      coordinates: { latitude: 12.902, longitude: 77.502 },
    });
    map.props.onMapLoaded();
    assert.equal(picker.cameras.at(-1).coordinates.latitude, 12.902);
    assert.equal(picker.cameras.at(-1).coordinates.longitude, 77.502);
    assert.equal(picker.cameras.at(-1).duration, 0);
  }
});

function locationReporter({ lateWatch = false, shiftId = "shift-1" } = {}) {
  const effects = [],
    calls = [],
    timers = [],
    cleared = [];
  let callback,
    releaseWatch,
    removes = 0,
    starts = 0,
    stops = 0;
  const subscription = {
    remove() {
      removes++;
    },
  };
  const watch = lateWatch
    ? new Promise((resolve) => {
        releaseWatch = resolve;
      })
    : Promise.resolve(subscription);
  const appState = { currentState: "active" };
  const position = {
    coords: { latitude: 12.9, longitude: 77.5, accuracy: 15 },
    timestamp: 1_700_000_000_000,
  };
  const { useDriverLocationReporter } = load(
    "../src/features/tracking/hooks/useDriverLocationReporter.ts",
    {
      react: {
        useEffect(effect, dependencies) {
          assert.deepEqual(Array.from(dependencies), [shiftId]);
          effects.push(effect);
        },
      },
      "react-native": { AppState: appState },
      "expo-crypto": { randomUUID: () => "stream-epoch" },
      "expo-location": {
        Accuracy: { Balanced: "balanced" },
        getForegroundPermissionsAsync: async () => ({ granted: true }),
        watchPositionAsync: async (options, publish) => {
          assert.equal(options.timeInterval, 15000);
          callback = publish;
          return watch;
        },
        getCurrentPositionAsync: async () => position,
      },
      "@tanstack/react-query": {
        useQuery: () => ({
          data: [{ desired_availability: "online", active_shift_id: shiftId }],
        }),
      },
      "@startup/data-access": {
        updateMyDriverLocation: async (_client, input) => {
          calls.push(input);
        },
      },
      "../../../services/supabase": {
        supabase: {},
        useMobileSession: () => ({ profile: { driver: { id: "driver-1" } } }),
      },
      "../services/backgroundLocationTask": {
        startDriverBackgroundLocation: async () => {
          starts++;
        },
        stopDriverBackgroundLocation: async () => {
          stops++;
        },
      },
    },
    {
      setInterval(fn, delay) {
        assert.equal(delay, 45000);
        timers.push(fn);
        return "location-timer";
      },
      clearInterval(timer) {
        cleared.push(timer);
      },
    }
  );
  useDriverLocationReporter();
  return {
    start: () => effects[0](),
    calls,
    timers,
    cleared,
    appState,
    position,
    publish: (value) => callback(value),
    release: () => releaseWatch(subscription),
    get removes() {
      return removes;
    },
    get starts() {
      return starts;
    },
    get stops() {
      return stops;
    },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("tracking keeps its stream sequence and removes foreground/background work on unmount", async () => {
  const reporter = locationReporter(),
    cleanup = reporter.start();
  await settle();
  assert.equal(reporter.starts, 1);
  assert.equal(reporter.calls.length, 1);
  assert.equal(reporter.calls[0].shiftId, "shift-1");
  assert.equal(reporter.calls[0].streamEpoch, "stream-epoch");
  reporter.publish(reporter.position);
  await settle();
  assert.deepEqual(
    reporter.calls.map((call) => call.sequence),
    [1, 2]
  );
  reporter.appState.currentState = "background";
  reporter.publish(reporter.position);
  reporter.timers[0]();
  await settle();
  assert.equal(reporter.calls.length, 2);
  cleanup();
  assert.equal(reporter.removes, 1);
  assert.equal(reporter.stops, 1);
  assert.deepEqual(reporter.cleared, ["location-timer"]);
  reporter.appState.currentState = "active";
  reporter.publish(reporter.position);
  await settle();
  assert.equal(reporter.calls.length, 2);
});

test("a location watcher resolving after unmount is immediately removed without publishing", async () => {
  const reporter = locationReporter({ lateWatch: true }),
    cleanup = reporter.start();
  await settle();
  cleanup();
  reporter.release();
  await settle();
  assert.equal(reporter.removes, 1);
  assert.equal(reporter.calls.length, 0);
  assert.equal(reporter.stops, 1);
});

test("an offline driver stops background tracking without starting a watcher or timer", async () => {
  const offline = locationReporter({ shiftId: null });
  assert.equal(offline.start(), undefined);
  assert.equal(offline.stops, 1);
  assert.equal(offline.starts, 0);
  assert.equal(offline.timers.length, 0);
});
