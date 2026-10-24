const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript"),
  path = require("node:path");

function resolver(
  role,
  {
    permission = true,
    device,
    server = async () => ({ configured: false, address: null }),
  }
) {
  const exports = {},
    calls = { permission: 0, device: 0, server: 0 };
  const mocks = {
    "expo-location": {
      requestForegroundPermissionsAsync: async () => {
        calls.permission++;
        return { granted: permission };
      },
      reverseGeocodeAsync: async (point) => {
        calls.device++;
        return device(point, calls.device);
      },
    },
    "react-native": { Platform: { OS: "android" } },
    "@startup/data-access": {
      resolveMapAddress: async (...args) => {
        calls.server++;
        return server(...args);
      },
    },
    "../../../services/supabase": { supabase: {} },
    "../utils/locationDisplay": {
      formatGeocodedAddress: (a) => a?.formattedAddress ?? a?.city ?? "",
    },
    "../utils/savedLocationDisplay": {
      formatGeocodedAddress: (a) => a?.formattedAddress ?? a?.city ?? "",
    },
  };
  const source = fs.readFileSync(
    path.join(
      __dirname,
      `../../${role.toLowerCase()}-mobile/src/features/locations/services/resolveAddress.ts`
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
    {
      exports,
      require: (n) => mocks[n],
      setTimeout: (fn) => {
        queueMicrotask(fn);
      },
      Promise,
      Error,
      Map,
    }
  );
  return { lookup: exports[`resolve${role}Address`], calls };
}

const point = { latitude: 12.9, longitude: 77.5 };

const address = {
  formattedAddress: "10 Main Street, Bengaluru",
  streetNumber: "10",
  street: "Main Street",
  district: "Rajajinagar",
  city: "Bengaluru",
  region: "Karnataka",
  postalCode: "560010",
};

for (const role of ["Doctor", "Patient", "Driver"]) {
  test(
    role +
      ": " +
      "accepted permission plus native failure uses Google fallback after one retry",
    async () => {
      const f = resolver(role, {
        device: async () => {
          throw Error("SERVICE_NOT_AVAILABLE");
        },
        server: async () => ({
          configured: true,
          address: { address: "Google address", city: "Bengaluru" },
        }),
      });
      const result = await f.lookup(point);
      assert.equal(result.address, "Google address");
      assert.equal(f.calls.device, 2);
      assert.equal(f.calls.server, 1);
      assert.equal(f.calls.permission, 1);
    }
  );
  test(
    role +
      ": " +
      "native transient failure retries and fills house number without server calls",
    async () => {
      const f = resolver(role, {
        device: async (_, call) => {
          if (call === 1) throw Error("Unavailable");
          return [address];
        },
      });
      const result = await f.lookup(point);
      assert.equal(result.street, "10 Main Street");
      assert.equal(result.locality, "Rajajinagar");
      assert.equal(f.calls.server, 0);
    }
  );
  test(role + ": " + "denied permission never invokes geocoder", async () => {
    const f = resolver(role, {
      permission: false,
      device: async () => [address],
    });
    await assert.rejects(f.lookup(point), /Allow location permission/);
    assert.equal(f.calls.device, 0);
  });
  test(
    role +
      ": " +
      "same point shares one request and a new caller survives prior screen cancellation",
    async () => {
      let oldActive = true,
        release;
      const gate = new Promise((resolve) => (release = resolve));
      const f = resolver(role, {
        device: async () => {
          await gate;
          return [address];
        },
      });
      const first = f.lookup(point, () => oldActive);
      await new Promise((resolve) => setImmediate(resolve));
      oldActive = false;
      const second = f.lookup(point);
      release();
      assert.equal(first, second);
      await second;
      assert.equal(f.calls.device, 1);
    }
  );
  test(
    role + ": " + "different points never overlap native requests",
    async () => {
      let count = 0,
        max = 0;
      const f = resolver(role, {
        device: async () => {
          count++;
          max = Math.max(max, count);
          await new Promise((resolve) => setImmediate(resolve));
          count--;
          return [address];
        },
      });
      await Promise.all([
        f.lookup(point),
        f.lookup({ latitude: 13, longitude: 78 }),
      ]);
      assert.equal(max, 1);
    }
  );
  test(
    role +
      ": " +
      "missing server configuration preserves native cause instead of claiming a permission failure",
    async () => {
      const f = resolver(role, {
        device: async () => {
          throw Error("SERVICE_NOT_AVAILABLE");
        },
      });
      await assert.rejects(
        f.lookup(point),
        /SERVICE_NOT_AVAILABLE.*Google fallback is not configured/
      );
    }
  );
}
