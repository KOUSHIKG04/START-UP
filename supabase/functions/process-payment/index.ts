import { withSupabase } from "npm:@supabase/server@1";
import {
  PaymentError,
  providerClient,
  providerConfig,
} from "../_shared/razorpay.ts";
import {
  checkout,
  paymentFailure,
  reconcile,
  rpc,
  uuid,
  verifyCheckout,
} from "../_shared/appointmentPayments.ts";
import {
  ambulanceCheckout,
  reconcileAmbulance,
  verifyAmbulanceCheckout,
} from "../_shared/ambulancePayments.ts";
import { fetchRouteProduct } from "../_shared/razorpay.ts";
import {
  payoutCommand,
  processAppointmentRefundsWithPayouts,
  processPayout,
  routeTransfersEnabled,
} from "../_shared/marketplacePayouts.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST")
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    try {
      const body = await request.json();
      if (body?.resourceType === "finance") {
        const setup = await rpc<{
          recipients: {
            id: string;
            account_id: string;
            product_id: string;
            mode: string;
          }[];
        }>(ctx.supabase, "get_company_payment_setup", {});
        const config = providerConfig((name) => Deno.env.get(name));
        if (body.action === "verify_recipient" && uuid(body.recipientId)) {
          const recipient = setup.recipients.find(
            (item) => item.id === body.recipientId && item.mode === config.mode
          );
          if (!recipient)
            throw new PaymentError(
              "Recipient is unavailable in this gateway environment.",
              409
            );
          const entity = await fetchRouteProduct(
            config,
            recipient.account_id,
            recipient.product_id
          );
          return Response.json(
            await payoutCommand(
              ctx.supabaseAdmin,
              "verify_recipient",
              { recipient_id: recipient.id, entity },
              config
            )
          );
        }
        if (body.action === "process_payout" && uuid(body.entryId)) {
          await processPayout(
            ctx.supabaseAdmin,
            providerClient(config),
            config,
            body.entryId,
            routeTransfersEnabled((name) => Deno.env.get(name), config)
          );
          return Response.json({ checked: true });
        }
        throw new PaymentError("Invalid finance action.");
      }
      if (body?.resourceType === "ambulance") {
        if (!uuid(body.bookingId))
          throw new PaymentError("Invalid ambulance booking.");
        await rpc(ctx.supabase, "get_ambulance_billing", {
          p_booking_id: body.bookingId,
        });
        const config = providerConfig((name) => Deno.env.get(name));
        const api = providerClient(config);
        if (body.action === "checkout" && uuid(body.quoteId))
          return Response.json(
            await ambulanceCheckout(
              ctx.supabase,
              ctx.supabaseAdmin,
              api,
              config,
              body.bookingId,
              body.quoteId
            )
          );
        if (
          body.action === "verify" &&
          uuid(body.attemptId) &&
          typeof body.paymentId === "string" &&
          /^pay_[A-Za-z0-9]+$/.test(body.paymentId) &&
          typeof body.signature === "string" &&
          /^[a-f0-9]{64}$/i.test(body.signature)
        )
          await verifyAmbulanceCheckout(
            ctx.supabaseAdmin,
            api,
            config,
            body.bookingId,
            body.attemptId,
            body.paymentId,
            body.signature
          );
        else if (body.action !== "reconcile")
          throw new PaymentError("Invalid ambulance payment action.");
        await reconcileAmbulance(
          ctx.supabaseAdmin,
          api,
          config,
          body.bookingId
        );
        return Response.json(
          await rpc(ctx.supabase, "get_ambulance_billing", {
            p_booking_id: body.bookingId,
          }),
          { headers: { "cache-control": "no-store" } }
        );
      }
      if (!uuid(body?.appointmentId))
        throw new PaymentError("Invalid appointment.");
      const billing = await rpc<{ can_manage: boolean }>(
        ctx.supabase,
        "get_appointment_billing",
        { p_appointment_id: body.appointmentId }
      );
      const config = providerConfig((name) => Deno.env.get(name));
      const api = providerClient(config);
      if (body.action === "checkout") {
        if (
          typeof body.policyVersion !== "string" ||
          body.policyVersion.length > 100
        )
          throw new PaymentError("Review and accept the payment terms first.");
        return Response.json(
          await checkout(
            ctx.supabase,
            ctx.supabaseAdmin,
            api,
            config,
            body.appointmentId,
            body.policyVersion
          ),
          { headers: { "cache-control": "no-store" } }
        );
      }
      if (body.action === "verify") {
        if (
          !uuid(body.attemptId) ||
          typeof body.paymentId !== "string" ||
          !/^pay_[A-Za-z0-9]+$/.test(body.paymentId) ||
          typeof body.signature !== "string" ||
          !/^[a-f0-9]{64}$/i.test(body.signature)
        )
          throw new PaymentError("Invalid checkout response.");
        await verifyCheckout(
          ctx.supabaseAdmin,
          api,
          config,
          body.appointmentId,
          body.attemptId,
          body.paymentId,
          body.signature
        );
      } else if (body.action === "process_refunds") {
        if (!billing.can_manage)
          throw new PaymentError("Financial approval access required.", 403);
        await processAppointmentRefundsWithPayouts(
          ctx.supabaseAdmin,
          api,
          config,
          body.appointmentId
        );
      } else if (body.action !== "reconcile")
        throw new PaymentError("Invalid payment action.");
      await reconcile(ctx.supabaseAdmin, api, config, body.appointmentId);
      return Response.json(
        await rpc(ctx.supabase, "get_appointment_billing", {
          p_appointment_id: body.appointmentId,
        }),
        { headers: { "cache-control": "no-store" } }
      );
    } catch (error) {
      return paymentFailure(error);
    }
  }),
};
