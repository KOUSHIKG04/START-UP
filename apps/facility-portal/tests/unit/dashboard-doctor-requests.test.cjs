const { test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
function compile(file, mocks) {
  const absolute = path.resolve(__dirname, "../../src", file),
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
        if (!name.startsWith(".")) throw Error("Unmocked import: " + name);
        const target = path.resolve(path.dirname(absolute), name),
          resolved = [target, target + ".ts", target + ".tsx"].find(
            (file) => fs.existsSync(file) && fs.statSync(file).isFile()
          );
        if (!resolved) throw Error("Unresolved import: " + name);
        return compile(
          path.relative(path.resolve(__dirname, "../../src"), resolved),
          mocks
        );
      },
      Date,
      Set,
    }
  );
  return exports;
}
const { incomingDoctorRequests } = compile(
  "features/doctors/utils/incomingDoctorRequests.ts",
  {}
);
const request = (
  id,
  status = "pending",
  initiated_by = "doctor",
  created_at = "2026-10-13T09:00:00Z"
) => ({
  id,
  status,
  initiated_by,
  created_at,
  doctor_name: "Test Doctor",
  facility_name: "Test Clinic",
});
test("dashboard includes incoming associations only, newest first", () => {
  const rows = [
    request("old"),
    request("approved", "approved"),
    request("invite", "pending", "facility"),
    request("new", "pending", "doctor", "2026-10-13T10:00:00Z"),
  ];
  assert.deepEqual(
    Array.from(incomingDoctorRequests(rows), (row) => row.id),
    ["new", "old"]
  );
});
test("dashboard alerts once for a new incoming request and keeps its query facility-scoped", () => {
  let data = [request("old")],
    index = 0;
  const refs = [],
    effects = [],
    messages = [],
    queryKeys = [];
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: {
      useRef: (initial) => {
        const slot = index++;
        refs[slot] ??= { current: initial };
        return refs[slot];
      },
      useEffect: (fn) => effects.push(fn),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { __esModule: true, default: "Link" },
    "@tanstack/react-query": {
      useQuery: (options) => {
        queryKeys.push(options.queryKey);
        assert.equal(options.refetchInterval, undefined);
        assert.equal(options.staleTime, Infinity);
        return { data, isLoading: false, isError: false };
      },
    },
    "@startup/web-ui/components/ui/toast": {
      toast: { add: (message) => messages.push(message) },
    },
    "../utils/incomingDoctorRequests": { incomingDoctorRequests },
    "@startup/web-ui/components/ui/skeleton": {},
    "@startup/data-access": {},
    "@/lib/supabase/browser": {},
    "../hooks/useFacilityDoctorRequestEvents": {
      useFacilityDoctorRequestEvents() {},
    },
    "./useFacilityDoctorRequestEvents": { useFacilityDoctorRequestEvents() {} },
  };
  const { DashboardDoctorRequests } = compile(
    "features/doctors/components/DashboardDoctorRequests.tsx",
    mocks
  );
  const render = () => {
    index = 0;
    effects.length = 0;
    const tree = DashboardDoctorRequests({
      scope: "facility-a",
      initialRequests: [request("old")],
    });
    effects.forEach((fn) => fn());
    return tree;
  };
  render();
  assert.equal(messages.length, 0);
  data = [request("old"), request("new")];
  render();
  assert.equal(messages.length, 1);
  assert.match(messages[0].title, /New doctor association/);
  render();
  assert.equal(messages.length, 1);
  data = [request("old"), request("invite", "pending", "facility")];
  render();
  assert.equal(messages.length, 1);
  data = [request("old"), request("new")];
  render();
  assert.equal(messages.length, 2);
  assert.deepEqual(Array.from(queryKeys[0]), [
    "facility-doctor-requests",
    "facility-a",
  ]);
});
