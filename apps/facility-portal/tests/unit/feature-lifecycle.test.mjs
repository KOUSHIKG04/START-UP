import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadTestModule } from "../../scripts/load-test-module.mjs";

const settle = () => new Promise((resolve) => setImmediate(resolve));

function load(file, mocks, globals) {
  return loadTestModule(
    fileURLToPath(new URL(`../../src/features/${file}`, import.meta.url)),
    { mocks, globals }
  );
}

function hooks() {
  const effects = [],
    refs = [],
    states = [];
  return {
    effects,
    refs,
    react: {
      useState(initial) {
        const i = states.length;
        states.push(typeof initial === "function" ? initial() : initial);
        return [
          states[i],
          (value) => {
            states[i] = value;
          },
        ];
      },
      useRef(initial) {
        const ref = { current: initial };
        refs.push(ref);
        return ref;
      },
      useEffect(callback) {
        effects.push(callback);
      },
      useMemo: (callback) => callback(),
      useCallback: (callback) => callback,
    },
  };
}

test("live facility changes stay scoped, coalesce refreshes and unsubscribe", async () => {
  const host = hooks(),
    queries = [],
    messages = [];
  let callbacks,
    scope,
    refreshes = 0,
    cleanups = 0;
  const { useLiveFacilityUpdates } = load(
    "dashboard/hooks/useLiveFacilityUpdates.ts",
    {
      react: host.react,
      "next/navigation": {
        usePathname: () => "/appointments",
        useRouter: () => ({ refresh: () => refreshes++ }),
      },
      "@tanstack/react-query": {
        useQueryClient: () => ({
          invalidateQueries: async ({ queryKey }) =>
            queries.push(Array.from(queryKey)),
        }),
      },
      "@/lib/supabase/browser": { createBrowserSupabaseClient: () => "client" },
      "@startup/data-access": {
        subscribeAppChanges(client, input, handlers) {
          assert.equal(client, "client");
          scope = input;
          callbacks = handlers;
          return () => cleanups++;
        },
      },
      "@startup/web-ui/components/ui/toast": {
        toast: { add: (message) => messages.push(message) },
      },
    }
  );
  useLiveFacilityUpdates({ facilityIds: ["b", "a"] });
  host.effects[0]();
  const cleanup = host.effects[1]();
  assert.deepEqual(Array.from(scope.facilityIds), ["a", "b"]);
  callbacks.onChange({ topic: "facility:a", kind: "appointments" });
  callbacks.onChange({ topic: "facility:a", kind: "appointments" });
  await settle();
  assert.equal(refreshes, 1);
  assert.deepEqual(queries, [
    ["facility-practice-schedule"],
    ["facility-recovery-policy"],
    ["appointment-billing"],
    ["portal-reschedule-options"],
    ["doctors", "directory"],
  ]);
  // Schedule edits from Doctor must refresh the separate policy cache on a
  // nested schedule screen too, without requiring a page reload.
  host.refs[0].current = "/doctor-schedules/practice/online";
  queries.length = 0;
  callbacks.onChange({ topic: "facility:a", kind: "schedule" });
  await settle();
  assert.ok(queries.some(([key]) => key === "facility-recovery-policy"));
  assert.ok(queries.some(([key]) => key === "portal-reschedule-options"));
  assert.equal(refreshes, 1);
  queries.length = 0;
  callbacks.onConnected();
  await settle();
  assert.ok(queries.some(([key]) => key === "facility-recovery-policy"));
  queries.length = 0;
  callbacks.onChange({ topic: "facility:a", kind: "tracking" });
  await settle();
  assert.equal(queries.length, 0);
  callbacks.onError();
  callbacks.onError();
  assert.equal(messages.length, 1);
  callbacks.onChange({ topic: "facility:a", kind: "beds" });
  cleanup();
  await settle();
  assert.equal(cleanups, 1);
  assert.equal(refreshes, 1);
  assert.equal(queries.length, 0);
});

function mapPicker() {
  const host = hooks(),
    listeners = [],
    centers = [];
  let resolveMaps,
    creations = 0,
    removed = 0;
  const maps = new Promise((resolve) => {
    resolveMaps = resolve;
  });
  class Map {
    constructor() {
      creations++;
    }
    addListener(event, callback) {
      listeners.push({ event, callback });
      return {
        remove() {
          removed++;
        },
      };
    }
    setCenter(point) {
      centers.push(point);
    }
    setZoom() {}
  }
  const { useFacilityLocationMap: runMapHook } = load(
    "facilities/hooks/useFacilityLocationMap.ts",
    {
      react: host.react,
      "../services/googleMaps": { loadMaps: () => maps },
    }
  );
  const api = runMapHook({
    apiKey: "map-key",
    selected: null,
    onUnavailable() {},
    onConfirm: async () => {},
    getCurrentLocation: async () => ({ latitude: 12, longitude: 77 }),
  });
  api.containerRef.current = {};
  return {
    ...host,
    api,
    listeners,
    centers,
    resolve: () => resolveMaps({ Map }),
    get creations() {
      return creations;
    },
    get removed() {
      return removed;
    },
  };
}

test("facility map removes both listeners and releases its instance on unmount", async () => {
  const map = mapPicker(),
    cleanup = map.effects[0]();
  map.resolve();
  await settle();
  assert.equal(map.creations, 1);
  assert.deepEqual(
    map.listeners.map((item) => item.event),
    ["dragend", "click"]
  );
  map.listeners[1].callback({ latLng: { lat: () => 12.9, lng: () => 77.5 } });
  assert.equal(map.centers[0].lat, 12.9);
  cleanup();
  assert.equal(map.removed, 2);
  assert.equal(map.refs[1].current, null);
});

test("a map library resolving after unmount cannot create a map or listeners", async () => {
  const map = mapPicker(),
    cleanup = map.effects[0]();
  cleanup();
  map.resolve();
  await settle();
  assert.equal(map.creations, 0);
  assert.equal(map.listeners.length, 0);
});

test("appointment scanner stops a late camera and clears its timer on unmount", async () => {
  const host = hooks(),
    cleared = [],
    tasks = [];
  let resolveCamera,
    decodes = 0,
    stops = 0;
  const camera = new Promise((resolve) => {
    resolveCamera = resolve;
  });
  const { useAppointments } = load(
    "appointments/hooks/useAppointments.ts",
    {
      react: {
        ...host.react,
        useTransition: () => [false, (callback) => tasks.push(callback())],
      },
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@startup/web-ui/components/ui/toast": { toast: { add() {} } },
      "../server/actions": {},
      "@startup/contracts": { formatDisplayDate: (value) => String(value) },
      "@zxing/browser": {
        BrowserQRCodeReader: class {
          decodeFromConstraints() {
            decodes++;
            return camera;
          }
        },
      },
    },
    {
      navigator: { mediaDevices: { getUserMedia() {} } },
      window: {
        setInterval: () => "appointment-timer",
        clearInterval: (timer) => cleared.push(timer),
      },
    }
  );
  const api = useAppointments({ appointments: [] });
  const cleanups = host.effects.map((effect) => effect()).filter(Boolean);
  api.videoRef.current = { srcObject: "camera-stream" };
  const opening = api.startCamera();
  await settle();
  assert.equal(decodes, 1);
  cleanups.forEach((cleanup) => cleanup());
  resolveCamera({
    stop() {
      stops++;
    },
  });
  await opening;
  assert.equal(stops, 1);
  assert.equal(api.videoRef.current.srcObject, null);
  assert.deepEqual(cleared, ["appointment-timer"]);
});

test("appointment reason modal cancels without writes, keeps failed drafts and submits the same versioned action", async () => {
  const states = [],
    tasks = [],
    writes = [];
  let cursor = 0,
    pending = false,
    refreshes = 0,
    resolveWrite;
  let response = new Promise((resolve) => {
    resolveWrite = resolve;
  });
  const { useAppointments } = load("appointments/hooks/useAppointments.ts", {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states))
          states[index] = typeof initial === "function" ? initial() : initial;
        return [
          states[index],
          (value) => {
            states[index] =
              typeof value === "function" ? value(states[index]) : value;
          },
        ];
      },
      useTransition: () => [
        pending,
        (callback) => {
          pending = true;
          tasks.push(
            Promise.resolve(callback()).finally(() => {
              pending = false;
            })
          );
        },
      ],
      useRef: (current) => ({ current }),
      useEffect() {},
      useMemo: (callback) => callback(),
      useCallback: (callback) => callback,
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@startup/web-ui/components/ui/toast": { toast: { add() {} } },
    "@startup/contracts": { formatDisplayDate: (value) => String(value) },
    "../server/actions": {
      changePortalAppointment: async (input) => {
        writes.push(JSON.parse(JSON.stringify(input)));
        return response;
      },
    },
  });
  const render = () => {
    cursor = 0;
    return useAppointments({ appointments: [] });
  };
  const item = { id: "appointment", row_version: "7" };
  let api = render();
  api.act(item, "hold");
  api = render();
  assert.equal(api.reasonRequest.action, "hold");
  api.closeReason();
  assert.equal(render().reasonRequest, null);
  assert.equal(writes.length, 0);
  api.act(item, "reject");
  api = render();
  api.setActionReason("  ");
  api = render();
  api.submitReason();
  assert.equal(writes.length, 0);
  api.setActionReason("Patient requested another day");
  api = render();
  api.submitReason();
  api = render();
  api.closeReason();
  assert.ok(render().reasonRequest);
  api.submitReason();
  assert.equal(writes.length, 1);
  resolveWrite({ error: "Appointment changed. Refresh and retry." });
  await tasks[0];
  api = render();
  assert.equal(api.actionError, "Appointment changed. Refresh and retry.");
  assert.equal(api.actionReason, "Patient requested another day");
  assert.equal(refreshes, 0);
  response = Promise.resolve({});
  api.submitReason();
  await tasks[1];
  api = render();
  assert.equal(api.reasonRequest, null);
  assert.equal(api.actionReason, "");
  assert.equal(refreshes, 1);
  assert.deepEqual(writes[1], {
    appointmentId: "appointment",
    expectedVersion: 7,
    action: "reject",
    note: "Patient requested another day",
  });
});
