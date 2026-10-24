const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");

function load(relative, mocks) {
  const exports = {};
  const source = fs.readFileSync(
    path.join(__dirname, "../../src", relative),
    "utf8"
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
        return mocks[name];
      },
      FormData,
      Response,
      Request,
      URL,
    }
  );
  return exports;
}

test("PT409 from inventory RPC is preserved by the server action", async () => {
  const action = load("features/facilities/server/actions.ts", {
    "@startup/contracts": {
      updateBedInventorySchema: {
        safeParse: (data) => ({ success: true, data }),
      },
    },
    "@startup/data-access": {
      updateFacilityBedInventory: async () => {
        throw { code: "PT409" };
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          getClaims: async () => ({
            data: { claims: { sub: "owner" } },
            error: null,
          }),
        },
      }),
    },
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({
    total: "10",
    occupied: "2",
    maintenance: "0",
  }))
    form.set(key, value);
  const result = await action.saveBedInventory(form);
  assert.equal(result.code, "PT409");
  assert.match(result.error, /counts changed/);
});

test("inventory PATCH returns HTTP 409 once for a stale version", async () => {
  let saves = 0;
  const route = load("app/api/bed-inventory/route.ts", {
    "@startup/data-access": {},
    "@startup/contracts": {},
    "@/lib/supabase/server": {},
    "@/features/facilities/server": {
      saveBedInventory: async () => {
        saves++;
        return { error: "Counts changed", code: "PT409" };
      },
    },
  });
  const response = await route.PATCH(
    new Request("http://localhost:3000/api/bed-inventory", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        total: 10,
        occupied: 2,
        maintenance: 0,
        expectedRowVersion: "1",
      }),
    })
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "PT409");
  assert.equal(saves, 1);
});
