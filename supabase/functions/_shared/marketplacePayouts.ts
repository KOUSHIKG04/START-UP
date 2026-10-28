import {
  rpc,
  requireSameMode,
  processRefunds,
  type RpcClient,
} from "./appointmentPayments.ts";
import {
  PaymentError,
  fetchRouteProduct,
  type ProviderConfig,
  type ProviderEntity,
  type ProviderRequest,
} from "./razorpay.ts";

type Reversal = {
  id: string;
  amount_minor: number;
  status: string;
  transfer_id?: string;
};

type PayoutWork = {
  id: string;
  mode: string;
  payment_id: string;
  account_id: string;
  product_id: string;
  recipient_id: string | null;
  ready: boolean;
  transfer_id: string | null;
  transfer_minor: number;
  claimed_at: string | null;
  reversal_due_minor: number;
  reversals: Reversal[];
};

export function payoutCommand<T>(
  admin: RpcClient,
  action: string,
  data: Record<string, unknown>,
  config: ProviderConfig
) {
  return rpc<T>(admin, "payout_provider_command", {
    p_action: action,
    p_data: { ...data, mode: config.mode },
  });
}

async function findByNote(
  api: ProviderRequest,
  path: string,
  key: string,
  value: string
) {
  for (let page = 0; page < 20; page++) {
    const result = await api(`${path}?count=100&skip=${page * 100}`);
    const matches = (result.items ?? []).filter(
      (item) => item.notes?.[key] === value
    );
    if (matches.length > 1)
      throw new PaymentError(
        "Multiple gateway transfers need finance review.",
        409
      );
    if (matches[0]) return matches[0];
    if ((result.items ?? []).length < 100) return null;
  }
  throw new PaymentError(
    "Gateway history needs finance review before retrying.",
    409
  );
}

export async function reconcilePayout(
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  entryId: string
) {
  const work = await payoutCommand<PayoutWork>(
    admin,
    "work",
    { entry_id: entryId },
    config
  );
  requireSameMode(work.mode, config);
  const transfer = work.transfer_id
    ? await api(`/transfers/${work.transfer_id}`)
    : work.claimed_at
      ? await findByNote(
          api,
          `/payments/${work.payment_id}/transfers`,
          "entry_id",
          work.id
        )
      : null;
  if (transfer)
    await payoutCommand(
      admin,
      "transfer_result",
      { entry_id: work.id, entity: transfer },
      config
    );
  const transferId = transfer?.id ?? work.transfer_id;
  if (transferId) {
    for (const reversal of work.reversals.filter(
      (item) => item.status !== "processed"
    )) {
      const found = await findByNote(
        api,
        `/transfers/${transferId}/reversals`,
        "reversal_id",
        reversal.id
      );
      if (found)
        await payoutCommand(
          admin,
          "reversal_result",
          { entry_id: work.id, reversal_id: reversal.id, entity: found },
          config
        );
    }
  }
  return work;
}

export async function processPayout(
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  entryId: string,
  allowTransfers: boolean
) {
  const work = await reconcilePayout(admin, api, config, entryId);
  const reversal = await payoutCommand<Reversal | null>(
    admin,
    "claim_reversal",
    { entry_id: entryId },
    config
  );
  if (reversal) {
    try {
      const entity = await api(`/transfers/${reversal.transfer_id}/reversals`, {
        amount: Number(reversal.amount_minor),
        notes: { reversal_id: reversal.id },
      });
      await payoutCommand(
        admin,
        "reversal_result",
        { entry_id: entryId, reversal_id: reversal.id, entity },
        config
      );
      await reconcilePayout(admin, api, config, entryId);
    } catch (error) {
      await payoutCommand(
        admin,
        "reversal_uncertain",
        { entry_id: entryId, reversal_id: reversal.id },
        config
      );
      throw error;
    }
  }
  if (!allowTransfers) return;
  if (work.ready && !work.claimed_at && work.recipient_id) {
    const product = await fetchRouteProduct(
      config,
      work.account_id,
      work.product_id
    );
    await payoutCommand(
      admin,
      "verify_recipient",
      { recipient_id: work.recipient_id, entity: product },
      config
    );
  }
  const claimed = await payoutCommand<PayoutWork | null>(
    admin,
    "claim_transfer",
    { entry_id: entryId },
    config
  );
  if (!claimed) return;
  try {
    const response = await api(`/payments/${claimed.payment_id}/transfers`, {
      transfers: [
        {
          account: claimed.account_id,
          amount: Number(claimed.transfer_minor),
          currency: "INR",
          notes: { entry_id: claimed.id },
          on_hold: false,
        },
      ],
    });
    const transfer: ProviderEntity | undefined = response.items?.find(
      (item) => item.notes?.entry_id === claimed.id
    );
    if (!transfer)
      throw new PaymentError("Transfer status needs reconciliation.", 503);
    await payoutCommand(
      admin,
      "transfer_result",
      { entry_id: claimed.id, entity: transfer },
      config
    );
  } catch (error) {
    // A timeout may have moved money. Never repeat the POST automatically.
    await payoutCommand(
      admin,
      "transfer_uncertain",
      { entry_id: claimed.id },
      config
    );
    throw error;
  }
}

export function routeTransfersEnabled(
  env: (name: string) => string | undefined,
  config: ProviderConfig
) {
  return (
    env("RAZORPAY_ROUTE_ENABLED") === "true" &&
    (config.mode !== "live" || env("RAZORPAY_ROUTE_LIVE_ENABLED") === "true")
  );
}

export async function processAppointmentRefundsWithPayouts(
  admin: RpcClient,
  api: ProviderRequest,
  config: ProviderConfig,
  appointmentId: string
) {
  const entries = await payoutCommand<string[]>(
    admin,
    "appointment_entries",
    { appointment_id: appointmentId },
    config
  );
  for (const entryId of entries)
    await processPayout(admin, api, config, entryId, false);
  await processRefunds(admin, api, config, appointmentId);
}
