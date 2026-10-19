const { test } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  path = require("node:path");
const defer = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const row = (id, occupied = 3, version = "1") => ({
  facilityId: "facility",
  bedTypeId: id,
  bedTypeCode: id,
  bedTypeName: id,
  total: 10,
  occupied,
  maintenance: 1,
  available: 9 - occupied,
  rowVersion: version,
  configured: true,
});
function fixture() {
  let index = 0;
  const slots = [],
    requests = [],
    messages = [],
    exports = {};
  class BedSaveError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  }
  const react = {
    useState: (initial) => {
      const key = index++;
      if (!(key in slots))
        slots[key] = typeof initial === "function" ? initial() : initial;
      return [
        slots[key],
        (next) => {
          slots[key] = typeof next === "function" ? next(slots[key]) : next;
        },
      ];
    },
    useRef: (initial) => {
      const key = index++;
      if (!(key in slots)) slots[key] = { current: initial };
      return slots[key];
    },
    useMemo: (fn) => {
      index++;
      return fn();
    },
    useCallback: (fn) => {
      index++;
      return fn;
    },
    useEffect: () => {
      index++;
    },
  };
  const mocks = {
    react,
    "@tanstack/react-query": {
      useQuery: (options) => ({ data: options.initialData }),
    },
    "@startup/web-ui/components/ui/toast": {
      toast: { add: (message) => messages.push(message) },
    },
    "../utils/bedRowColor": { bedRowColor: () => "" },
    "../client/bedInventory": {
      BedSaveError,
      saveBedCounts: (form) => {
        const d = defer();
        requests.push({ form, ...d });
        return d.promise;
      },
      reloadBedCounts: async () => [row("a", 1, "8")],
    },
  };
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../../src/features/facilities/hooks/useBedManagement.ts"
    ),
    "utf8"
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (n) => mocks[n], FormData, Error, BigInt }
  );
  return {
    requests,
    messages,
    BedSaveError,
    render: (inventory = [row("a"), row("b")]) => {
      index = 0;
      return exports.useBedManagement(inventory);
    },
  };
}
test("bed rows save independently and duplicate saves for one row are blocked", async () => {
  const f = fixture(),
    api = f.render();
  const first = api.handleSetCount("a", "available", 7),
    second = api.handleSetCount("b", "occupied", 4);
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[0].form.get("occupied"), "2");
  assert.equal(f.requests[1].form.get("occupied"), "4");
  await api.handleSetCount("a", "occupied", 5);
  assert.equal(f.requests.length, 2);
  assert.equal(f.render().pendingIds.size, 2);
  f.requests[0].resolve(row("a", 2, "2"));
  await first;
  assert.equal(f.render().pendingIds.has("b"), true);
  assert.equal(f.render().pendingIds.has("a"), false);
  f.requests[1].resolve(row("b", 4, "2"));
  await second;
  const result = f.render();
  assert.equal(result.totalAvailable, 12);
  assert.equal(result.totalOccupied, 6);
  assert.equal(result.pendingIds.size, 0);
});
test("a failed bed save keeps confirmed counts and releases only its own row", async () => {
  const f = fixture(),
    api = f.render(),
    save = api.handleSetCount("a", "occupied", 5);
  f.requests[0].reject(new Error("Offline"));
  await save;
  assert.equal(f.render().departments[0].occupied, 3);
  assert.equal(f.render().pendingIds.size, 0);
  assert.equal(f.messages[0].type, "error");
});
test("conflicting versions reload real counts before a retry", async () => {
  const f = fixture(),
    save = f.render().handleSetCount("a", "occupied", 5);
  f.requests[0].reject(new f.BedSaveError("Conflict", "PT409"));
  await save;
  const api = f.render();
  assert.equal(api.departments[0].rowVersion, "8");
  assert.equal(api.departments[0].occupied, 1);
  const retry = api.handleSetCount("a", "occupied", 2);
  assert.equal(f.requests[1].form.get("expectedRowVersion"), "8");
  f.requests[1].resolve(row("a", 2, "9"));
  await retry;
});
test("older action responses cannot replace newer inventory props", async () => {
  const f = fixture(),
    save = f.render().handleSetCount("a", "occupied", 5);
  f.requests[0].resolve(row("a", 5, "2"));
  await save;
  const api = f.render([row("a", 1, "3"), row("b")]);
  assert.equal(api.departments[0].occupied, 1);
  assert.equal(api.departments[0].rowVersion, "3");
});
