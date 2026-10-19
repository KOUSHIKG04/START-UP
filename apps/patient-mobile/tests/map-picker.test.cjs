const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  path = require("node:path");
function picker(sourcePath) {
  const cameras = [];
  const updates = [],
    exports = {};
  const jsx = (type, props) => ({ type, props: props || {} });
  const mocks = {
    react: {
      useRef: (v) => ({
        current:
          v === null
            ? {
                setCameraPosition(config) {
                  cameras.push(config);
                  if (config.duration !== 0) throw Error("Animation cancelled");
                },
              }
            : v,
      }),
      useState: (v) => [
        typeof v === "function" ? v() : v,
        (n) => updates.push(n),
      ],
      useMemo: (f) => f(),
      useCallback: (f) => f,
      useEffect: () => {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      View: "View",
      Text: "Text",
      Pressable: "Pressable",
      ActivityIndicator: "ActivityIndicator",
      Platform: { OS: "android" },
      Keyboard: { dismiss() {} },
      StyleSheet: {
        create: (v) => v,
        absoluteFill: {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
    },
    "expo-router": {
      router: { back() {}, replace() {} },
      useLocalSearchParams: () => ({ latitude: "12.9", longitude: "77.5" }),
    },
    "expo-constants": {
      __esModule: true,
      default: {
        appOwnership: "standalone",
        expoConfig: { extra: { googleMapsConfigured: true } },
      },
    },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "expo-location": {},
    "expo-maps": {
      GoogleMaps: { View: "GoogleMapView" },
      AppleMaps: { View: "AppleMapView" },
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ bottom: 0 }),
    },
    "lucide-react-native": { LocateFixed: "LocateFixed", MapPin: "MapPin" },
    "@startup/design-tokens": {
      colors: {
        white: "#FFF",
        border: "#DDD",
        patient: { primary: "#008877", surface: "#E6F5F4", background: "#FFF" },
        doctor: { primary: "#008877", surface: "#E6F5F4" },
        driver: { primary: "#087F8C", surface: "#EAF8F7" },
      },
      fontFamilies: {},
    },
    "@startup/mobile-ui": {
      Button: "Button",
      Header: "Header",
      Input: "Input",
      useToast: () => ({ showToast() {} }),
    },
    "@startup/data-access": { searchMapPlaces() {} },
    "../../../services/supabase": { supabase: null },
    "../../services/supabase": { supabase: null },
    "@startup/contracts": {
      mapPlaceSchema: {
        safeParse: (value) => ({ success: Boolean(value), data: value }),
      },
    },
    "../resolveAddress": {
      resolveDoctorAddress() {},
      resolvePatientAddress() {},
      resolveDriverAddress() {},
    },
    "../../features/locations/resolveAddress": { resolveDoctorAddress() {} },
    "../locationDraft": {
      useLocationDraft: (select) => select({ choose() {} }),
      useDriverLocationDraft: (select) => select({ choose() {} }),
    },
    "../savedLocationDraft": {
      useLocationDraft: (select) => select({ choose() {} }),
    },
    "../../features/locations/clinicLocationDraft": {
      useClinicLocationDraft: (select) => select({ choose() {} }),
    },
    "../locationDisplay": { formatGeocodedAddress() {} },
    "../savedLocationDisplay": { formatGeocodedAddress() {} },
    "../../features/locations/locationDisplay": { formatGeocodedAddress() {} },
  };
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../..", sourcePath),
    "utf8"
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  function load(file) {
    const result = {};
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    vm.runInNewContext(code, {
      exports: result,
      require: (name) => {
        if (name in mocks) return mocks[name];
        if (sourcePath.startsWith("apps/patient-mobile/")) {
          if (name.endsWith("/services/resolveAddress"))
            return { resolvePatientAddress() {} };
          if (name.endsWith("/stores/locationDraft"))
            return { useLocationDraft: (select) => select({ choose() {} }) };
          if (name.startsWith(".")) {
            const target = path.resolve(path.dirname(file), name);
            return load([target + ".ts", target + ".tsx"].find(fs.existsSync));
          }
        }
        throw Error(name);
      },
      setTimeout,
      clearTimeout,
      Promise,
      Error,
    });
    return result;
  }
  Object.assign(exports, load(path.resolve(__dirname, "../../..", sourcePath)));
  const nodes = [];
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    nodes.push(n);
    walk(n.props?.children);
  }
  walk(exports.default());
  return {
    updates,
    cameras,
    map: nodes.find((n) => n.type === "GoogleMapView"),
    frame: nodes.find((n) => n.props.onTouchStart),
  };
}
for (const [label, sourcePath] of [
  [
    "Patient",
    "apps/patient-mobile/src/features/locations/screens/PickLocationScreen.tsx",
  ],
  [
    "Doctor personal",
    "apps/doctor-mobile/src/features/locations/screens/PickLocationScreen.tsx",
  ],
  ["Doctor clinic", "apps/doctor-mobile/src/app/(auth)/clinic-location.tsx"],
  [
    "Driver saved",
    "apps/driver-mobile/src/features/locations/screens/SavedLocationPickerScreen.tsx",
  ],
  [
    "Driver registration",
    "apps/driver-mobile/src/features/locations/screens/DriverLocationScreen.tsx",
  ],
]) {
  test(
    label +
      ": map-ready callback restores the latest selection without animation",
    () => {
      const p = picker(sourcePath);
      p.map.props.onMapClick({
        coordinates: { latitude: 12.902, longitude: 77.502 },
      });
      p.map.props.onMapLoaded();
      const camera = p.cameras.at(-1);
      assert.equal(camera.coordinates.latitude, 12.902);
      assert.equal(camera.coordinates.longitude, 77.502);
      assert.equal(camera.duration, 0);
    }
  );
  test(
    label + ": programmatic camera events cannot overwrite selection",
    () => {
      const p = picker(sourcePath);
      for (let i = 0; i < 100; i++)
        p.map.props.onCameraMove({
          coordinates: { latitude: 0, longitude: 0 },
        });
      assert.equal(p.updates.length, 0);
    }
  );
  test(
    label + ": duplicate camera events are suppressed before React rerenders",
    () => {
      const p = picker(sourcePath);
      p.frame.props.onTouchStart();
      const event = { coordinates: { latitude: 12.902, longitude: 77.502 } };
      p.map.props.onCameraMove(event);
      const count = p.updates.length;
      assert.ok(count > 0);
      for (let i = 0; i < 100; i++) p.map.props.onCameraMove(event);
      assert.equal(p.updates.length, count);
    }
  );
  test(
    label +
      ": tap recenter suppresses feedback and viewport fills available area",
    () => {
      const p = picker(sourcePath);
      p.frame.props.onTouchStart();
      p.map.props.onMapClick({
        coordinates: { latitude: 12.902, longitude: 77.502 },
      });
      const count = p.updates.length;
      p.map.props.onCameraMove({
        coordinates: { latitude: 12.904, longitude: 77.504 },
      });
      assert.equal(p.updates.length, count);
      assert.equal(p.cameras.length, 1);
      assert.equal(p.cameras[0].duration, 0);
      assert.equal(p.frame.props.style.position, "absolute");
      assert.equal(p.frame.props.style.bottom, 0);
    }
  );
}
