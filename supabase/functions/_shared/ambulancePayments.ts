import {
  hmacHex,
  secureEqual,
  PaymentError,
  type ProviderConfig,
  type ProviderRequest,
} from "./razorpay.ts";
import { rpc, requireSameMode, type RpcClient } from "./appointmentPayments.ts";

type Attempt = {
  id: string;
  mode: string;
  order_id: string | null;
  amount_minor: number;
  claimed_at: string | null;
};

export function ambulanceCommand<T>(
  admin: RpcClient,
  action: string,
  data: Record<string, unknown>,
  config: ProviderConfig
) {
  return rpc<T>(admin, "ambulance_provider_command", {
    p_action: action,
    p_data: { ...data, mode: config.mode },
  });
}

export async function ambulanceCheckout(
  user: RpcClient,
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  bookingId: string,
  quoteId: string
) {
  const attempt = await rpc<Attempt>(user, "prepare_ambulance_payment", {
    p_booking_id: bookingId,
    p_quote_id: quoteId,
  });
  requireSameMode(attempt.mode, config);
  let orderId = attempt.order_id;
  if (!orderId) {
    const claimed = await ambulanceCommand<Attempt | null>(
      admin,
      "claim_order",
      { attempt_id: attempt.id },
      config
    );
    if (!claimed)
      throw new PaymentError(
        "Checkout is being checked. Refresh payment status shortly.",
        409
      );
    try {
      const order = await api("/orders", {
        amount: Number(claimed.amount_minor),
        currency: "INR",
        receipt: claimed.id,
        partial_payment: false,
      });
      await ambulanceCommand(
        admin,
        "order_ready",
        { attempt_id: claimed.id, entity: order },
        config
      );
      orderId = order.id;
    } catch (error) {
      await ambulanceCommand(
        admin,
        "order_uncertain",
        { attempt_id: attempt.id },
        config
      );
      throw error;
    }
  }
  return {
    attemptId: attempt.id,
    orderId,
    amount: Number(attempt.amount_minor),
    currency: "INR",
    keyId: config.keyId,
    mode: config.mode,
  };
}

export async function reconcileAmbulance(
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  bookingId: string
) {
  const work = await ambulanceCommand<Attempt[]>(
    admin,
    "work",
    { booking_id: bookingId },
    config
  );
  for (const attempt of work) {
    requireSameMode(attempt.mode, config);
    let orderId = attempt.order_id;
    if (!orderId && attempt.claimed_at) {
      for (let page = 0; page < 20; page++) {
        const response = await api(`/orders?count=100&skip=${page * 100}`);
        const found = response.items?.find(
          (item) => item.receipt === attempt.id
        );
        if (found) {
          await ambulanceCommand(
            admin,
            "order_ready",
            { attempt_id: attempt.id, entity: found },
            config
          );
          orderId = found.id;
          break;
        }
        if ((response.items ?? []).length < 100) break;
      }
    }
    if (orderId) {
      const payments = await api(`/orders/${orderId}/payments`);
      for (const payment of payments.items ?? [])
        await ambulanceCommand(admin, "payment", { entity: payment }, config);
    }
  }
}

export async function verifyAmbulanceCheckout(
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  bookingId: string,
  attemptId: string,
  paymentId: string,
  signature: string
) {
  const attempts = await ambulanceCommand<Attempt[]>(
    admin,
    "work",
    { booking_id: bookingId },
    config
  );
  const attempt = attempts.find((item) => item.id === attemptId);
  if (
    !attempt?.order_id ||
    !secureEqual(
      await hmacHex(config.keySecret, `${attempt.order_id}|${paymentId}`),
      signature
    )
  )
    throw new PaymentError("Payment verification failed.", 401);
  requireSameMode(attempt.mode, config);
  const payment = await api(`/payments/${paymentId}`);
  if (payment.order_id !== attempt.order_id)
    throw new PaymentError("Payment belongs to another booking.", 401);
  await ambulanceCommand(admin, "payment", { entity: payment }, config);
}
