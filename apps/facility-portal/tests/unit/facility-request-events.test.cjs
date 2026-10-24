const { test } = require("node:test");

const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  path = require("node:path");

test("private request channels refresh on events/reconnect, coalesce bursts and unsubscribe", async () => {
  const channels = [],
    removed = [],
    effects = [];
  let reads = 0;
  const client = {
    realtime: { setAuth: async () => {} },
    channel: (topic, options) => {
      const channel = {
        topic,
        options,
        on(type, filter, handler) {
          this.handler = handler;
          assert.equal(type, "broadcast");
          assert.equal(filter.event, "doctor_association_changed");
          return this;
        },
        subscribe(handler) {
          this.status = handler;
          return this;
        },
      };
      channels.push(channel);
      return channel;
    },
    removeChannel: async (channel) => removed.push(channel.topic),
  };
  const exports = {};
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../../src/features/doctors/hooks/useFacilityDoctorRequestEvents.ts"
    ),
    "utf8"
  );
  const mocks = {
    react: { useEffect: (fn) => effects.push(fn) },
    "@tanstack/react-query": {
      useQueryClient: () => ({
        invalidateQueries: async (options) => {
          assert.equal(options.queryKey[0], "facility-doctor-requests");
          reads++;
        },
      }),
    },
    "@/lib/supabase/browser": { createBrowserSupabaseClient: () => client },
    "@startup/web-ui/components/ui/toast": { toast: { add() {} } },
  };
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { exports, require: (name) => mocks[name], queueMicrotask }
  );
  exports.useFacilityDoctorRequestEvents("facility-a:facility-b");
  const cleanup = effects[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(channels.length, 2);
  assert.equal(channels[0].topic, "facility-associations:facility-a");
  assert.equal(channels[0].options.config.private, true);
  assert.equal(reads, 0);
  channels[0].status("SUBSCRIBED");
  channels[1].status("SUBSCRIBED");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reads, 1);
  channels[0].handler();
  channels[0].handler();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reads, 2);
  cleanup();
  channels[0].handler();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reads, 2);
  assert.equal(removed.length, 2);
});
