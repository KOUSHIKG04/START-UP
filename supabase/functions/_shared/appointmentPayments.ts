import {
  PaymentError,
  hmacHex,
  secureEqual,
  type ProviderConfig,
  type ProviderEntity,
  type ProviderRequest,
} from "./razorpay.ts";

export type RpcClient = {
  rpc(
    name: string,
    input: Record<string, unknown>
  ): PromiseLike<{ data: unknown; error: unknown }>;
};

type Attempt = {
  id: string;
  method: string;
  amount_minor: number;
  status: string;
  order_id: string | null;
  payment_id: string | null;
  claimed_at: string | null;
  expires_at?: string | null;
  mode?: string;
};

type RefundJob = {
  id: string;
  method: string;
  status: string;
  amount_minor: number;
  payment_id: string;
  provider_refund_id: string | null;
};

type Work = { mode: string | null; attempts: Attempt[]; jobs: RefundJob[] };

export async function rpc<T>(
  client: RpcClient,
  name: string,
  input: Record<string, unknown>
): Promise<T> {
  const { data, error } = await client.rpc(name, input);
  if (error) {
    const detail = error as { code?: string; message?: string };
    if (["22023", "PT409", "42501"].includes(detail.code ?? ""))
      throw new PaymentError(
        detail.message ?? "Payment details changed. Refresh and retry.",
        detail.code === "42501" ? 403 : 409
      );
    throw new PaymentError(
      "Could not update payment status. Refresh before retrying.",
      503
    );
  }
  return data as T;
}

export async function providerCommand<T>(
  admin: RpcClient,
  action: string,
  data: Record<string, unknown>
) {
  const result = await rpc<T>(admin, "appointment_provider_command", {
    p_action: action,
    p_data: data,
  });
  if (action === "payment" && data.mode)
    await rpc(admin, "payout_provider_command", {
      p_action: "gateway_costs",
      p_data: { entity: data.entity, mode: data.mode },
    });
  return result;
}

export function requireSameMode(
  savedMode: string | null,
  config: ProviderConfig
) {
  if (savedMode && savedMode !== config.mode)
    throw new PaymentError(
      "This payment belongs to a different gateway environment.",
      409
    );
}

export async function checkout(
  user: RpcClient,
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  appointmentId: string,
  policyVersion: string
) {
  const attempt = await rpc<Attempt>(user, "prepare_appointment_payment", {
    p_appointment_id: appointmentId,
    p_policy_version: policyVersion,
  });
  requireSameMode(attempt.mode ?? null, config);
  let orderId = attempt.order_id;
  if (!orderId) {
    const claimed = await providerCommand<Attempt | null>(
      admin,
      "claim_order",
      { attempt_id: attempt.id }
    );
    if (!claimed)
      throw new PaymentError(
        "This checkout is being prepared. Refresh payment status shortly.",
        409
      );
    try {
      const order = await api("/orders", {
        amount: Number(claimed.amount_minor),
        currency: "INR",
        receipt: claimed.id,
        partial_payment: false,
      });
      await providerCommand(admin, "order_ready", {
        attempt_id: attempt.id,
        entity: order,
      });
      orderId = order.id;
    } catch (error) {
      await providerCommand(admin, "order_uncertain", {
        attempt_id: attempt.id,
      });
      throw error;
    }
  }
  if (!orderId || attempt.status === "authorized")
    throw new PaymentError(
      "Payment is awaiting capture. Refresh payment status.",
      409
    );
  return {
    attemptId: attempt.id,
    keyId: config.keyId,
    orderId,
    amount: Number(attempt.amount_minor),
    currency: "INR",
    mode: config.mode,
  };
}

export async function verifyCheckout(
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  appointmentId: string,
  attemptId: string,
  paymentId: string,
  signature: string
) {
  const work = await providerCommand<Work>(admin, "work", {
    appointment_id: appointmentId,
  });
  requireSameMode(work.mode, config);
  const attempt = work.attempts.find((item) => item.id === attemptId);
  if (
    !attempt?.order_id ||
    !secureEqual(
      await hmacHex(config.keySecret, `${attempt.order_id}|${paymentId}`),
      signature
    )
  )
    throw new PaymentError("Payment verification failed.", 401);
  const payment = await api(`/payments/${encodeURIComponent(paymentId)}`);
  if (payment.order_id !== attempt.order_id)
    throw new PaymentError("Payment belongs to another order.", 401);
  await providerCommand(admin, "payment", {
    entity: payment,
    mode: config.mode,
  });
}

async function findByReceipt(
  api: ProviderRequest,
  path: string,
  receipt: string
) {
  for (let page = 0; page < 10; page++) {
    const response = await api(
      `${path}${path.includes("?") ? "&" : "?"}count=100&skip=${page * 100}`
    );
    const items = response.items ?? [];
    const found = items.find((item) => item.receipt === receipt);
    if (found) return found;
    if (items.length < 100) break;
  }
  return null;
}

export async function reconcile(
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  appointmentId: string
) {
  const work = await providerCommand<Work>(admin, "work", {
    appointment_id: appointmentId,
  });
  requireSameMode(work.mode, config);
  for (const attempt of work.attempts) {
    if (attempt.method === "cash") continue;
    let orderId = attempt.order_id;
    if (!orderId && attempt.claimed_at) {
      const order = await findByReceipt(api, "/orders", attempt.id);
      if (order) {
        await providerCommand(admin, "order_ready", {
          attempt_id: attempt.id,
          entity: order,
        });
        orderId = order.id;
      }
    }
    if (orderId) {
      const payments = await api(
        `/orders/${encodeURIComponent(orderId)}/payments`
      );
      for (const payment of payments.items ?? [])
        if (
          ["captured", "authorized", "refunded", "failed"].includes(
            payment.status
          )
        )
          await providerCommand(admin, "payment", {
            entity: payment,
            mode: config.mode,
          });
      if (
        attempt.expires_at &&
        Date.parse(attempt.expires_at) <= Date.now() &&
        !(payments.items ?? []).some((payment) =>
          ["captured", "authorized", "refunded"].includes(payment.status)
        )
      ) {
        const order = await api(`/orders/${encodeURIComponent(orderId)}`);
        await providerCommand(admin, "expire_order", {
          attempt_id: attempt.id,
          entity: order,
        });
      }
    }
  }
  for (const job of work.jobs) {
    if (job.method === "cash") continue;
    const refund = job.provider_refund_id
      ? await api(`/refunds/${encodeURIComponent(job.provider_refund_id)}`)
      : ["working", "uncertain"].includes(job.status)
        ? await findByReceipt(
            api,
            `/payments/${encodeURIComponent(job.payment_id)}/refunds`,
            job.id
          )
        : null;
    if (refund)
      await providerCommand(admin, "refund_result", {
        job_id: job.id,
        entity: refund,
      });
  }
}

export async function processRefunds(
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  appointmentId: string
) {
  await reconcile(admin, api, config, appointmentId);
  const work = await providerCommand<Work>(admin, "work", {
    appointment_id: appointmentId,
  });
  for (const job of work.jobs) {
    if (job.method === "cash") continue;
    const claimed = await providerCommand<RefundJob | null>(
      admin,
      "claim_refund",
      { job_id: job.id }
    );
    if (!claimed) continue;
    try {
      const refund = await api(
        `/payments/${encodeURIComponent(claimed.payment_id)}/refund`,
        {
          amount: Number(claimed.amount_minor),
          speed: "normal",
          receipt: claimed.id,
        }
      );
      await providerCommand(admin, "refund_result", {
        job_id: claimed.id,
        entity: refund,
      });
    } catch (error) {
      await providerCommand(admin, "refund_uncertain", { job_id: claimed.id });
      throw error;
    }
  }
}

export function paymentFailure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof PaymentError
          ? error.message
          : "Payment service is temporarily unavailable. Refresh the payment status before retrying.",
    },
    {
      status: error instanceof PaymentError ? error.status : 503,
      headers: { "cache-control": "no-store" },
    }
  );
}

export function uuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export function safeEntity(value: unknown): value is ProviderEntity {
  const item = value as ProviderEntity | null;
  return (
    !!item &&
    typeof item.id === "string" &&
    Number.isSafeInteger(item.amount) &&
    typeof item.currency === "string"
  );
}
