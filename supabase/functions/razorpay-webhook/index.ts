import { withSupabase } from "npm:@supabase/server@1";
import {
  PaymentError,
  digestHex,
  providerClient,
  providerConfig,
  verifyWebhook,
} from "../_shared/razorpay.ts";
import {
  paymentFailure,
  providerCommand,
  safeEntity,
  uuid,
} from "../_shared/appointmentPayments.ts";
import { payoutCommand } from "../_shared/marketplacePayouts.ts";
import { ambulanceCommand } from "../_shared/ambulancePayments.ts";

export default {
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    if (request.method !== "POST")
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    try {
      if (Number(request.headers.get("content-length")) > 262144)
        throw new PaymentError("Payload too large.", 413);
      const raw = await request.text();
      if (raw.length > 262144)
        throw new PaymentError("Payload too large.", 413);
      const secrets = [
        Deno.env.get("RAZORPAY_WEBHOOK_SECRET"),
        Deno.env.get("RAZORPAY_WEBHOOK_SECRET_PREVIOUS"),
      ].filter((value): value is string => !!value);
      await verifyWebhook(
        raw,
        request.headers.get("x-razorpay-signature") ?? "",
        secrets
      );
      const eventId = request.headers.get("x-razorpay-event-id");
      if (!eventId || eventId.length > 200)
        throw new PaymentError("Missing webhook event identifier.");
      const event = JSON.parse(raw);
      const account = Deno.env.get("RAZORPAY_ACCOUNT_ID");
      if (account && event.account_id !== account)
        throw new PaymentError("Unexpected gateway account.", 401);
      const config = providerConfig((name) => Deno.env.get(name));
      const api = providerClient(config);
      const metadata = {
        event_id: eventId,
        digest: await digestHex(raw),
        event_type: String(event.event).slice(0, 100),
      };
      if (
        [
          "payment.captured",
          "payment.authorized",
          "payment.failed",
          "order.paid",
        ].includes(event.event)
      ) {
        const supplied = event.payload?.payment?.entity;
        if (!safeEntity(supplied) || !/^pay_[A-Za-z0-9]+$/.test(supplied.id))
          throw new PaymentError("Invalid payment event.");
        const payment = await api(
          `/payments/${encodeURIComponent(supplied.id)}`
        );
        const target = await payoutCommand<string | null>(
          ctx.supabaseAdmin,
          "payment_target",
          { order_id: payment.order_id },
          config
        );
        if (target === "ambulance")
          await ambulanceCommand(
            ctx.supabaseAdmin,
            "payment",
            { entity: payment },
            config
          );
        else if (target === "appointment")
          await providerCommand(ctx.supabaseAdmin, "payment", {
            ...metadata,
            entity: payment,
            mode: config.mode,
          });
      } else if (
        ["refund.created", "refund.processed", "refund.failed"].includes(
          event.event
        )
      ) {
        const supplied = event.payload?.refund?.entity;
        if (!safeEntity(supplied) || !/^rfnd_[A-Za-z0-9]+$/.test(supplied.id))
          throw new PaymentError("Invalid refund event.");
        const refund = await api(`/refunds/${encodeURIComponent(supplied.id)}`);
        if (!refund.payment_id || !/^pay_[A-Za-z0-9]+$/.test(refund.payment_id))
          throw new PaymentError("Invalid refund payment.");
        const payment = await api(
          `/payments/${encodeURIComponent(refund.payment_id)}`
        );
        const target = await payoutCommand<string | null>(
          ctx.supabaseAdmin,
          "payment_target",
          { order_id: payment.order_id },
          config
        );
        if (target === "ambulance") {
          await ambulanceCommand(
            ctx.supabaseAdmin,
            "payment",
            { entity: payment },
            config
          );
          return Response.json({ received: true });
        }
        if (target !== "appointment")
          return Response.json({ received: true, managed: false });
        await providerCommand(ctx.supabaseAdmin, "payment", {
          ...metadata,
          event_id: `${eventId}/balance`,
          entity: payment,
          mode: config.mode,
        });
        if (!uuid(refund.receipt))
          return Response.json({ received: true, managed: false });
        await providerCommand(ctx.supabaseAdmin, "refund_result", {
          ...metadata,
          job_id: refund.receipt,
          entity: refund,
        });
      } else if (
        typeof event.event === "string" &&
        event.event.startsWith("transfer.")
      ) {
        const id = event.payload?.transfer?.entity?.id;
        if (typeof id !== "string" || !/^trf_[A-Za-z0-9]+$/.test(id))
          throw new PaymentError("Invalid transfer event.");
        const entity = await api(`/transfers/${id}`);
        const entryId =
          (await payoutCommand<string | null>(
            ctx.supabaseAdmin,
            "lookup_transfer",
            { transfer_id: id },
            config
          )) ?? entity.notes?.entry_id;
        if (uuid(entryId))
          await payoutCommand(
            ctx.supabaseAdmin,
            "transfer_result",
            { entry_id: entryId, entity },
            config
          );
      }
      return Response.json({ received: true });
    } catch (error) {
      return paymentFailure(error);
    }
  }),
};
