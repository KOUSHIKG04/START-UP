const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const { createRequire } = require("node:module");

const { webcrypto, createHmac } = require("node:crypto");

const ts = require("typescript");

function load(file, extra = {}, cache = new Map()) {
  let absolute = path.resolve(__dirname, "../../../supabase/functions", file);
  if (!path.extname(absolute) && fs.existsSync(absolute + ".ts"))
    absolute += ".ts";
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (name) =>
        name === "npm:@supabase/server@1"
          ? { withSupabase: (_config, handler) => handler }
          : !name.startsWith(".")
            ? createRequire(absolute)(name)
            : load(
                path.relative(
                  path.resolve(__dirname, "../../../supabase/functions"),
                  path.resolve(path.dirname(absolute), name)
                ),
                extra,
                cache
              ),
      crypto: webcrypto,
      TextEncoder,
      Uint8Array,
      Response,
      Request,
      AbortSignal,
      btoa,
      fetch,
      ...extra,
    }
  );
  return exports;
}

const provider = load("_shared/razorpay.ts");

const payments = load("_shared/appointmentPayments.ts");

const payouts = load("_shared/marketplacePayouts.ts");

const ambulance = load("_shared/ambulancePayments.ts");

const config = {
  keyId: "rzp_test_fixture",
  keySecret: "server-secret",
  mode: "test",
};

test("payment presentation distinguishes failed, authorized and uncertain attempts", () => {
  const { appointmentPaymentLabel, appointmentCheckoutSchema } = load(
    "../../packages/contracts/src/appointment-payments.ts"
  );
  assert.equal(
    appointmentPaymentLabel({ method: "gateway", status: "failed" }),
    "Payment attempt failed"
  );
  assert.equal(
    appointmentPaymentLabel({ method: "gateway", status: "authorized" }),
    "Awaiting payment capture"
  );
  assert.equal(
    appointmentPaymentLabel({ method: "gateway", status: "uncertain" }),
    "Checking payment status"
  );
  assert.equal(
    appointmentPaymentLabel({ method: "gateway", status: "created" }),
    "Payment not completed"
  );
  assert.equal(
    appointmentCheckoutSchema.safeParse({
      attemptId: "00000000-0000-4000-8000-000000000001",
      keyId: "rzp_test_fixture",
      orderId: "order_one",
      amount: 100.5,
      currency: "INR",
      mode: "test",
    }).success,
    false
  );
});

test("webhooks verify the raw bytes, reject forged bodies and support secret rotation", async () => {
  const raw = '{ "event": "payment.captured" }';
  const signature = createHmac("sha256", "old-secret")
    .update(raw)
    .digest("hex");
  await provider.verifyWebhook(raw, signature, ["new-secret", "old-secret"]);
  await assert.rejects(
    provider.verifyWebhook(JSON.stringify(JSON.parse(raw)), signature, [
      "old-secret",
    ]),
    /Invalid webhook signature/
  );
  await assert.rejects(
    provider.verifyWebhook(raw, "a".repeat(64), ["old-secret"]),
    /Invalid webhook signature/
  );
  await assert.rejects(
    provider.verifyWebhook(raw, signature, []),
    /not configured/
  );
});

test("live mode requires explicit enablement and matching server keys", () => {
  const env = {
    RAZORPAY_KEY_ID: "rzp_live_fixture",
    RAZORPAY_KEY_SECRET: "secret",
    RAZORPAY_MODE: "live",
  };
  assert.throws(
    () => provider.providerConfig((key) => env[key]),
    /not been enabled/
  );
  env.RAZORPAY_LIVE_ENABLED = "true";
  assert.equal(provider.providerConfig((key) => env[key]).mode, "live");
  env.RAZORPAY_MODE = "test";
  assert.throws(
    () => provider.providerConfig((key) => env[key]),
    /unavailable/
  );
});

function orderHost() {
  const attempt = {
    id: "attempt-a",
    method: "gateway",
    amount_minor: 50000,
    status: "creating",
    order_id: null,
    payment_id: null,
    claimed_at: null,
    mode: "test",
  };
  const commands = [];
  const user = { rpc: async () => ({ data: { ...attempt }, error: null }) };
  const admin = {
    rpc: async (_name, { p_action, p_data }) => {
      commands.push([p_action, p_data]);
      if (p_action === "work")
        return {
          data: { mode: "test", attempts: [{ ...attempt }], jobs: [] },
          error: null,
        };
      if (p_action === "claim_order") {
        if (attempt.claimed_at) return { data: null, error: null };
        attempt.claimed_at = "claimed";
        return { data: { ...attempt }, error: null };
      }
      if (p_action === "order_ready") {
        attempt.order_id = p_data.entity.id;
        attempt.status = "created";
      }
      if (p_action === "order_uncertain") attempt.status = "uncertain";
      return { data: { ok: true }, error: null };
    },
  };
  return { attempt, user, admin, commands };
}

test("retrying checkout reuses the same server order and amount", async () => {
  const host = orderHost();
  let posts = 0;
  const api = async (url, body) => {
    assert.equal(url, "/orders");
    assert.equal(body.amount, 50000);
    posts++;
    return {
      id: "order_one",
      amount: 50000,
      currency: "INR",
      receipt: "attempt-a",
      status: "created",
    };
  };
  const one = await payments.checkout(
    host.user,
    host.admin,
    api,
    config,
    "appointment",
    "policy"
  );
  const two = await payments.checkout(
    host.user,
    host.admin,
    api,
    config,
    "appointment",
    "policy"
  );
  assert.equal(one.orderId, two.orderId);
  assert.equal(posts, 1);
});

test("a lost order response never repeats a provider POST; reconciliation finds its receipt", async () => {
  const host = orderHost();
  let posts = 0;
  const api = async (url, body) => {
    if (body) {
      posts++;
      throw new Error("timeout");
    }
    return url.startsWith("/orders?")
      ? {
          items: [
            {
              id: "order_saved",
              receipt: "attempt-a",
              amount: 50000,
              currency: "INR",
              status: "created",
            },
          ],
        }
      : { items: [] };
  };
  await assert.rejects(
    payments.checkout(
      host.user,
      host.admin,
      api,
      config,
      "appointment",
      "policy"
    ),
    /timeout/
  );
  await assert.rejects(
    payments.checkout(
      host.user,
      host.admin,
      api,
      config,
      "appointment",
      "policy"
    ),
    /being prepared/
  );
  await payments.reconcile(host.admin, api, config, "appointment");
  assert.equal(host.attempt.order_id, "order_saved");
  assert.equal(posts, 1);
});

test("checkout signature uses the stored order; a payment from another order is rejected", async () => {
  const host = orderHost();
  host.attempt.order_id = "order_saved";
  let reads = 0;
  const api = async () => {
    reads++;
    return {
      id: "pay_one",
      order_id: "order_other",
      status: "captured",
      amount: 50000,
      currency: "INR",
    };
  };
  await assert.rejects(
    payments.verifyCheckout(
      host.admin,
      api,
      config,
      "appointment",
      "attempt-a",
      "pay_one",
      "a".repeat(64)
    ),
    /verification failed/
  );
  assert.equal(reads, 0);
  const signature = createHmac("sha256", config.keySecret)
    .update("order_saved|pay_one")
    .digest("hex");
  await assert.rejects(
    payments.verifyCheckout(
      host.admin,
      api,
      config,
      "appointment",
      "attempt-a",
      "pay_one",
      signature
    ),
    /another order/
  );
  assert.equal(
    host.commands.some(([action]) => action === "payment"),
    false
  );
});

test("an uncertain refund is reconciled without issuing it twice, including concurrent retries", async () => {
  const job = {
    id: "refund-job",
    method: "gateway",
    status: "ready",
    amount_minor: 45000,
    payment_id: "pay_one",
    provider_refund_id: null,
  };
  let posts = 0;
  const admin = {
    rpc: async (_name, { p_action, p_data }) => {
      if (p_action === "work")
        return {
          data: { mode: "test", attempts: [], jobs: [{ ...job }] },
          error: null,
        };
      if (p_action === "claim_refund") {
        if (job.status !== "ready") return { data: null, error: null };
        job.status = "working";
        return { data: { ...job }, error: null };
      }
      if (p_action === "refund_uncertain") job.status = "uncertain";
      if (p_action === "refund_result") {
        job.status = "processed";
        job.provider_refund_id = p_data.entity.id;
      }
      return { data: { ok: true }, error: null };
    },
  };
  const api = async (_url, body) => {
    if (body) {
      posts++;
      throw new Error("lost refund response");
    }
    return {
      items: [
        {
          id: "rfnd_saved",
          receipt: "refund-job",
          payment_id: "pay_one",
          amount: 45000,
          currency: "INR",
          status: "processed",
        },
      ],
    };
  };
  await Promise.allSettled([
    payments.processRefunds(admin, api, config, "appointment"),
    payments.processRefunds(admin, api, config, "appointment"),
  ]);
  assert.equal(posts, 1);
  await payments.processRefunds(admin, api, config, "appointment");
  assert.equal(job.status, "processed");
  assert.equal(posts, 1);
});

test("unsigned webhook requests never reach database or provider APIs", async () => {
  let calls = 0;
  const handler = load("razorpay-webhook/index.ts", {
    Deno: { env: { get: () => "webhook-secret" } },
    fetch: async () => {
      calls++;
      throw new Error("must not call");
    },
  }).default;
  const result = await handler.fetch(
    new Request("https://example.test/webhook", {
      method: "POST",
      body: '{"event":"payment.captured"}',
      headers: {
        "x-razorpay-signature": "0".repeat(64),
        "x-razorpay-event-id": "event",
      },
    }),
    {
      supabaseAdmin: {
        rpc: async () => {
          calls++;
        },
      },
    }
  );
  assert.equal(result.status, 401);
  assert.equal(calls, 0);
});

test("Route live transfers require separate explicit activation", () => {
  assert.equal(
    payouts.routeTransfersEnabled(() => undefined, config),
    false
  );
  assert.equal(
    payouts.routeTransfersEnabled(
      (key) => (key === "RAZORPAY_ROUTE_ENABLED" ? "true" : undefined),
      config
    ),
    true
  );
  assert.equal(
    payouts.routeTransfersEnabled(
      (key) => (key === "RAZORPAY_ROUTE_ENABLED" ? "true" : undefined),
      { ...config, mode: "live" }
    ),
    false
  );
  assert.equal(
    payouts.routeTransfersEnabled(() => "true", { ...config, mode: "live" }),
    true
  );
});

test("a lost transfer response and concurrent retries do not duplicate a payout", async () => {
  const state = {
    id: "entry",
    mode: "test",
    payment_id: "pay_one",
    account_id: "acc_one",
    transfer_id: null,
    transfer_minor: 45000,
    claimed_at: null,
    reversals: [],
    ready: false,
  };
  let posts = 0;
  const admin = {
    rpc: async (_, { p_action, p_data }) => {
      if (p_action === "work") return { data: { ...state }, error: null };
      if (p_action === "claim_reversal") return { data: null, error: null };
      if (p_action === "claim_transfer") {
        if (state.claimed_at) return { data: null, error: null };
        state.claimed_at = "claimed";
        return { data: { ...state }, error: null };
      }
      if (p_action === "transfer_result") state.transfer_id = p_data.entity.id;
      return { data: {}, error: null };
    },
  };
  const api = async (path, body) => {
    if (body) {
      posts++;
      throw Error("timeout after accepted transfer");
    }
    return path.startsWith("/payments/")
      ? { items: [{ id: "trf_saved", notes: { entry_id: "entry" } }] }
      : { id: "trf_saved", notes: { entry_id: "entry" } };
  };
  await Promise.allSettled([
    payouts.processPayout(admin, api, config, "entry", true),
    payouts.processPayout(admin, api, config, "entry", true),
  ]);
  await payouts.processPayout(admin, api, config, "entry", true);
  assert.equal(posts, 1);
  assert.equal(state.transfer_id, "trf_saved");
});

test("uncertain reversals reconcile without repeating their POST", async () => {
  const reversal = {
    id: "reversal",
    amount_minor: 9000,
    status: "working",
    transfer_id: "trf_one",
  };
  let claimed = false,
    posts = 0,
    processed = false;
  const admin = {
    rpc: async (_, { p_action }) => {
      if (p_action === "work")
        return {
          data: {
            id: "entry",
            mode: "test",
            payment_id: "pay_one",
            transfer_id: "trf_one",
            reversals: claimed && !processed ? [reversal] : [],
          },
          error: null,
        };
      if (p_action === "claim_reversal") {
        if (claimed) return { data: null, error: null };
        claimed = true;
        return { data: reversal, error: null };
      }
      if (p_action === "reversal_result") processed = true;
      return { data: {}, error: null };
    },
  };
  const api = async (path, body) => {
    if (body) {
      posts++;
      throw Error("timeout");
    }
    return path.includes("/reversals?")
      ? { items: [{ id: "rvrsl_saved", notes: { reversal_id: "reversal" } }] }
      : { id: "trf_one" };
  };
  await assert.rejects(
    payouts.processPayout(admin, api, config, "entry", false),
    /timeout/
  );
  await payouts.processPayout(admin, api, config, "entry", false);
  assert.equal(posts, 1);
  assert.equal(processed, true);
});

test("ambulance checkout reuses its order and validates signatures against that order", async () => {
  const attempt = {
    id: "attempt",
    mode: "test",
    order_id: null,
    amount_minor: 100000,
    claimed_at: null,
  };
  let posts = 0,
    writes = 0;
  const user = { rpc: async () => ({ data: { ...attempt }, error: null }) };
  const admin = {
    rpc: async (_, { p_action, p_data }) => {
      if (p_action === "work") return { data: [{ ...attempt }], error: null };
      if (p_action === "claim_order") {
        if (attempt.claimed_at) return { data: null, error: null };
        attempt.claimed_at = "claimed";
        return { data: { ...attempt }, error: null };
      }
      if (p_action === "order_ready") attempt.order_id = p_data.entity.id;
      if (p_action === "payment") writes++;
      return { data: {}, error: null };
    },
  };
  const api = async (path, body) => {
    if (body) {
      posts++;
      return {
        id: "order_ambulance",
        amount: 100000,
        currency: "INR",
        receipt: "attempt",
      };
    }
    return {
      id: "pay_one",
      order_id: "order_different",
      amount: 100000,
      currency: "INR",
    };
  };
  const first = await ambulance.ambulanceCheckout(
    user,
    admin,
    api,
    config,
    "booking",
    "quote"
  );
  const second = await ambulance.ambulanceCheckout(
    user,
    admin,
    api,
    config,
    "booking",
    "quote"
  );
  assert.equal(first.orderId, second.orderId);
  assert.equal(posts, 1);
  const signature = createHmac("sha256", config.keySecret)
    .update("order_ambulance|pay_one")
    .digest("hex");
  await assert.rejects(
    ambulance.verifyAmbulanceCheckout(
      admin,
      api,
      config,
      "booking",
      "attempt",
      "pay_one",
      signature
    ),
    /another booking/
  );
  assert.equal(writes, 0);
});

test("finance denial occurs before any provider call", async () => {
  let providerCalls = 0;
  const handler = load("process-payment/index.ts", {
    Deno: { env: { get: () => "" } },
    fetch: async () => {
      providerCalls++;
      throw Error("must not call");
    },
  }).default;
  const response = await handler.fetch(
    new Request("https://example.test/process-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resourceType: "finance",
        action: "process_payout",
        entryId: "00000000-0000-4000-8000-000000000001",
      }),
    }),
    {
      supabase: {
        rpc: async () => ({
          data: null,
          error: { code: "42501", message: "Company finance access required" },
        }),
      },
      supabaseAdmin: {},
    }
  );
  assert.equal(response.status, 403);
  assert.equal(providerCalls, 0);
});

test("payout labels distinguish zero shares, cash debt, transfer and bank settlement", () => {
  const { payoutStatusLabel } = load(
    "../../packages/contracts/src/marketplace-payments.ts"
  );
  const entry = {
    commission_bps: 1000,
    recipient_id: "recipient",
    method: "gateway",
    provider_minor: 45000,
    reversal_due_minor: 0,
    transfer_status: "pending",
    settlement_status: "pending",
    complete: true,
    ready: true,
  };
  assert.equal(
    payoutStatusLabel({ ...entry, provider_minor: 0 }),
    "No provider transfer due"
  );
  assert.equal(
    payoutStatusLabel({ ...entry, transfer_status: "processed" }),
    "Transferred · Bank settlement pending"
  );
  assert.equal(
    payoutStatusLabel({
      ...entry,
      transfer_status: "processed",
      settlement_status: "settled",
    }),
    "Settled to recipient bank"
  );
  assert.equal(
    payoutStatusLabel({ ...entry, method: "cash", cash_due_minor: 5000 }),
    "Cash commission due"
  );
  assert.equal(
    payoutStatusLabel({
      ...entry,
      method: "cash",
      cash_due_minor: 0,
      cash_credit_minor: 500,
    }),
    "Cash commission credit needs review"
  );
});
