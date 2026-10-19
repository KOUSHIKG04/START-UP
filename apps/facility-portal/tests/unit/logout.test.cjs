const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
function action(signOut) {
  const calls = [],
    exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../../src/features/auth/server/actions.ts"),
      "utf8"
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }
  ).outputText;
  const mocks = {
    "next/navigation": {
      redirect: (url) => {
        calls.push(url);
        throw new Error("REDIRECT:" + url);
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => ({ auth: { signOut } }),
    },
    "@/lib/supabase/config": { getSupabaseConfig: () => true },
    "@/server/auth/facilityAccess": {
      getFacilityAccess: async () => ({ approved: true }),
    },
  };
  vm.runInNewContext(code, { exports, Error, require: (name) => mocks[name] });
  return { logout: exports.logout, calls };
}
test("facility logout signs out only the current session and redirects to login", async () => {
  let scope;
  const a = action(async (options) => {
    scope = options.scope;
    return { error: null };
  });
  await assert.rejects(a.logout({ error: null }), /REDIRECT:\/login/);
  assert.equal(scope, "local");
  assert.deepEqual(a.calls, ["/login"]);
});
test("failed sign-out reports an error without falsely redirecting", async () => {
  const a = action(async () => ({ error: new Error("Network failure") }));
  const result = await a.logout({ error: null });
  assert.match(result.error, /try again/);
  assert.equal(a.calls.length, 0);
});
test("network exceptions return retry feedback instead of navigating away", async () => {
  const a = action(async () => {
    throw new Error("Offline");
  });
  const result = await a.logout({ error: null });
  assert.match(result.error, /connection/);
  assert.equal(a.calls.length, 0);
});
