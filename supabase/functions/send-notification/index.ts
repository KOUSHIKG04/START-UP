import { withSupabase } from "npm:@supabase/server@1";

type PushDelivery = {
  delivery_id: string;
  token: string;
  template_key: string;
  safe_parameters: Record<string, unknown>;
};
type PushReceipt = { delivery_id: string; ticket_id: string };

const sendUrl = "https://exp.host/--/api/v2/push/send";
const receiptsUrl = "https://exp.host/--/api/v2/push/getReceipts";

function notificationCopy(delivery: PushDelivery) {
  if (delivery.template_key.startsWith("verification.")) {
    const status = delivery.safe_parameters.status;
    return {
      title: "Clinzo verification update",
      body:
        typeof status === "string"
          ? `Your verification status is ${status.replaceAll("_", " ")}.`
          : "Your verification status changed.",
    };
  }
  if (delivery.template_key.startsWith("appointment.")) {
    if (delivery.template_key === "appointment.check_in") {
      return {
        title: "Patient arrived at clinic",
        body: "A checked-in patient is waiting in your clinic queue.",
      };
    }
    const status = delivery.safe_parameters.status;
    const confirmed = delivery.template_key === "appointment.auto_confirmed" || delivery.template_key === "appointment.approve";
    const requested = delivery.template_key === "appointment.requested";
    return {
      title: confirmed ? "Appointment confirmed" : requested ? "Appointment requested" : "Appointment update",
      body:
        requested ? "A new appointment request is waiting for review."
        : typeof status === "string"
          ? `Your appointment is ${status.replaceAll("_", " ")}.`
          : "An appointment changed.",
    };
  }
  if (delivery.template_key === "ambulance.offer") {
    return {
      title: "New ambulance request",
      body: "Open the Driver App to review the request.",
    };
  }
  if (delivery.template_key.startsWith("ambulance.")) {
    const state = delivery.safe_parameters.status;
    return {
      title: "Ambulance trip update",
      body:
        typeof state === "string"
          ? `Booking status: ${state.replaceAll("_", " ")}.`
          : "Your ambulance trip changed.",
    };
  }
  return { title: "Clinzo update", body: "You have a new update in the app." };
}

async function expoRequest(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Expo returned HTTP ${response.status}`);
  return response.json() as Promise<{ data?: unknown }>;
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (_request, ctx) => {
    const admin = ctx.supabaseAdmin;
    const { data: sends, error: claimError } = await admin.rpc(
      "claim_expo_push_deliveries",
      { p_limit: 50 }
    );

    if (claimError)
      return Response.json(
        { error: "Could not claim push deliveries" },
        { status: 500 }
      );

    const deliveries = (Array.isArray(sends) ? sends : []) as PushDelivery[];

    let tickets: Array<{
      status?: string;
      id?: string;
      details?: { error?: string };
    }> = [];

    if (deliveries.length) {
      try {
        const response = await expoRequest(
          sendUrl,
          deliveries.map((delivery) => ({
            to: delivery.token,
            ...notificationCopy(delivery),
            data: { notificationId: delivery.delivery_id },
            sound: "default",
          }))
        );
        tickets = Array.isArray(response.data) ? response.data : [];
      } catch {
        // Resolve each lease as retryable; the database applies bounded backoff.
      }

      for (const [index, delivery] of deliveries.entries()) {
        const ticket = tickets[index];
        const { error } = await admin.rpc("resolve_expo_push_ticket", {
          p_delivery_id: delivery.delivery_id,
          p_ticket_id: ticket?.status === "ok" ? (ticket.id ?? null) : null,
          p_error_code: ticket?.details?.error ?? "PushSendFailed",
        });

        if (error)
          return Response.json(
            { error: "Could not save push ticket" },
            { status: 500 }
          );
      }
    }

    const { data: pendingReceipts, error: receiptClaimError } = await admin.rpc(
      "claim_expo_push_receipts",
      { p_limit: 50 }
    );

    if (receiptClaimError)
      return Response.json(
        { error: "Could not claim push receipts" },
        { status: 500 }
      );

    const claimedReceipts = (
      Array.isArray(pendingReceipts) ? pendingReceipts : []
    ) as PushReceipt[];

    if (claimedReceipts.length) {
      let receiptData: Record<
        string,
        { status?: string; details?: { error?: string } }
      > = {};
      try {
        const response = await expoRequest(receiptsUrl, {
          ids: claimedReceipts.map((receipt) => receipt.ticket_id),
        });
        if (
          response.data &&
          typeof response.data === "object" &&
          !Array.isArray(response.data)
        ) {
          receiptData = response.data as typeof receiptData;
        }
      } catch {
        // Unavailable receipts remain sent and are retried after the lease expires.
      }

      for (const receipt of claimedReceipts) {
        const result = receiptData[receipt.ticket_id];
        const { error } = await admin.rpc("resolve_expo_push_receipt", {
          p_delivery_id: receipt.delivery_id,
          p_delivered: result?.status === "ok",
          p_error_code:
            result?.status === "error"
              ? (result.details?.error ?? "PushReceiptFailed")
              : null,
        });
        if (error)
          return Response.json(
            { error: "Could not save push receipt" },
            { status: 500 }
          );
      }
    }

    return Response.json({
      sent: deliveries.length,
      receiptsChecked: claimedReceipts.length,
    });
  }),
};
