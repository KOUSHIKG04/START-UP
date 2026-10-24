const { test } = require("node:test");

const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  path = require("node:path");

function load(name, mocks = {}) {
  const exports = {};
  const source = fs.readFileSync(
    path.join(__dirname, "../src/locations", name),
    "utf8"
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (n) => mocks[n], Error }
  );
  return exports;
}

const errors = load("functionErrors.ts");

const schema = { parse: (v) => v };

const search = load("search.ts", {
  "./functionErrors": errors,
  "@startup/contracts": {
    mapSearchInputSchema: schema,
    mapSearchResultSchema: schema,
    mapPointInputSchema: schema,
    mapAddressResultSchema: schema,
  },
});

const failure = (status, body) => ({
  context: { status, clone: () => ({ json: async () => body }) },
});

test("cross-constructor HTTP responses preserve specific Google errors", async () => {
  const message = await errors.mapFunctionError(
    failure(502, { error: "Enable Places API (New)" }),
    "Place search"
  );
  assert.equal(message, "Enable Places API (New)");
});

test("JWT gateway messages, missing deployment and transport errors are distinguished", async () => {
  assert.match(
    await errors.mapFunctionError(
      failure(401, { message: "Invalid JWT" }),
      "Place search"
    ),
    /HTTP 401/
  );
  assert.match(
    await errors.mapFunctionError(failure(404, {}), "Place search"),
    /endpoint was not found/
  );
  assert.match(
    await errors.mapFunctionError({}, "Place search"),
    /internet connection/
  );
});

test("an expired token is refreshed once and the original search input is retained", async () => {
  let calls = 0,
    refreshes = 0;
  const bodies = [];
  const client = {
    functions: {
      invoke: async (name, { body }) => {
        assert.equal(name, "search-map-places");
        bodies.push(body);
        return ++calls === 1
          ? { error: failure(401, { message: "Invalid JWT" }) }
          : { data: { configured: true, places: [] } };
      },
    },
    auth: {
      refreshSession: async () => {
        refreshes++;
        return { data: { session: {} }, error: null };
      },
    },
  };
  await search.searchMapPlaces(client, { query: "Rajajinagar" });
  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
  assert.deepEqual(bodies[0], bodies[1]);
});

test("persistent JWT failure is surfaced without a retry loop", async () => {
  let calls = 0,
    refreshes = 0;
  const client = {
    functions: {
      invoke: async () => {
        calls++;
        return { error: failure(401, { message: "Invalid JWT" }) };
      },
    },
    auth: {
      refreshSession: async () => {
        refreshes++;
        return { data: { session: {} }, error: null };
      },
    },
  };
  await assert.rejects(
    search.searchMapPlaces(client, { query: "Bengaluru" }),
    /HTTP 401/
  );
  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
});

test("Google restriction errors do not trigger token refresh", async () => {
  const client = {
    functions: {
      invoke: async () => ({
        error: failure(502, { error: "Allow Places API (New)" }),
      }),
    },
    auth: {
      refreshSession: async () => {
        throw Error("should not refresh");
      },
    },
  };
  await assert.rejects(
    search.searchMapPlaces(client, { query: "Bengaluru" }),
    /Allow Places API/
  );
});
