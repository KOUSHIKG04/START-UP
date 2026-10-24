import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const tick = () => new Promise((resolve) => setImmediate(resolve));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

function fixture() {
  const exports = {};
  const source = readFileSync(
    new URL("../src/auth/mobileSession.ts", import.meta.url),
    "utf8"
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === "./operations")
        return { getMyProfile: (client) => client.fetchProfile() };
      throw new Error(name);
    },
    Error,
    setTimeout: (callback) => queueMicrotask(callback),
  });
  let authCallback;
  const requests = [];
  const client = {
    session: null,
    sessionError: null,
    auth: {
      getSession: async () => ({
        data: { session: client.session },
        error: client.sessionError,
      }),
      onAuthStateChange: (callback) => {
        authCallback = callback;
      },
    },
    fetchProfile: () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    },
  };
  const store = exports.createMobileSession(client);
  const snapshots = [];
  store.subscribe(() => snapshots.push(store.getSnapshot()));
  return {
    client,
    store,
    requests,
    snapshots,
    change: (session) => {
      client.session = session;
      authCallback("SIGNED_IN", session);
    },
  };
}

const session = (id) => ({ user: { id } });

const profile = (id) => ({ patient_id: id, patient_profile_complete: true });

test("retry never exposes a settled missing-profile state before an existing profile resolves", async () => {
  const f = fixture();
  await tick();
  f.change(session("patient"));
  await tick();
  assert.equal(f.store.getSnapshot().loading, true);
  f.requests[0].reject(new Error("Network unavailable"));
  await tick();
  assert.equal(f.store.getSnapshot().error, "Network unavailable");
  const retry = f.store.refresh();
  await tick();
  const during = f.store.getSnapshot();
  assert.equal(during.loading, true);
  assert.equal(during.error, null);
  f.requests[1].resolve(profile("existing"));
  await retry;
  assert.equal(f.store.getSnapshot().profile.patient_id, "existing");
  assert.equal(
    f.snapshots.some((s) => s.session && !s.loading && !s.error && !s.profile),
    false
  );
});

test("same-user background refresh preserves the current route and profile", async () => {
  const f = fixture();
  await tick();
  f.change(session("patient"));
  await tick();
  f.requests[0].resolve(profile("existing"));
  await tick();
  const refresh = f.store.refresh();
  await tick();
  assert.equal(f.store.getSnapshot().loading, false);
  assert.equal(f.store.getSnapshot().profile.patient_id, "existing");
  f.requests[1].resolve(profile("existing"));
  await refresh;
});

test("account switches clear previous patient data and stale responses cannot restore it", async () => {
  const f = fixture();
  await tick();
  f.change(session("a"));
  await tick();
  f.requests[0].resolve(profile("patient-a"));
  await tick();
  const oldRefresh = f.store.refresh();
  await tick();
  f.change(session("b"));
  await tick();
  assert.equal(f.store.getSnapshot().loading, true);
  assert.equal(f.store.getSnapshot().profile, null);
  f.requests[2].resolve(profile("patient-b"));
  await tick();
  f.requests[1].resolve(profile("patient-a"));
  await oldRefresh;
  assert.equal(f.store.getSnapshot().session.user.id, "b");
  assert.equal(f.store.getSnapshot().profile.patient_id, "patient-b");
});

test("a background failure and retry preserve an existing profile without a loading-screen remount", async () => {
  const f = fixture();
  await tick();
  f.change(session("doctor"));
  await tick();
  f.requests[0].resolve({ doctor: { id: "doctor-id", status: "verified" } });
  await tick();
  const refresh = f.store.refresh();
  await tick();
  f.requests[1].reject(new Error("Temporary network failure"));
  await refresh;
  assert.equal(f.store.getSnapshot().profile.doctor.status, "verified");
  assert.equal(f.store.getSnapshot().error, "Temporary network failure");
  const start = f.snapshots.length;
  const retry = f.store.refresh();
  await tick();
  assert.equal(f.store.getSnapshot().loading, false);
  assert.equal(f.store.getSnapshot().profile.doctor.id, "doctor-id");
  f.requests[2].resolve({ doctor: { id: "doctor-id", status: "verified" } });
  await retry;
  assert.equal(
    f.snapshots
      .slice(start)
      .every((s) => !s.loading && s.profile?.doctor?.id === "doctor-id"),
    true
  );
});

test("a successful no-profile response still allows new-account onboarding", async () => {
  const f = fixture();
  await tick();
  f.change(session("new"));
  await tick();
  f.requests[0].resolve(null);
  await tick();
  assert.equal(f.store.getSnapshot().loading, false);
  assert.equal(f.store.getSnapshot().error, null);
  assert.equal(f.store.getSnapshot().profile, null);
});

test("a session retrieval failure does not sign the existing account out", async () => {
  const f = fixture();
  await tick();
  f.change(session("patient"));
  await tick();
  f.requests[0].resolve(profile("existing"));
  await tick();
  f.client.sessionError = new Error("Could not read stored session");
  await f.store.refresh();
  assert.equal(f.store.getSnapshot().session.user.id, "patient");
  assert.equal(f.store.getSnapshot().profile.patient_id, "existing");
  assert.equal(f.store.getSnapshot().error, "Could not read stored session");
});
