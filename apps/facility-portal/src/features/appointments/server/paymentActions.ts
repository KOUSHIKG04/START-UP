"use server";

import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { uuidSchema } from "@startup/contracts";
import {
  confirmAppointmentCashRefund,
  decideAppointmentRefund,
  getAppointmentBilling,
  processAppointmentPayment,
  recordAppointmentCash,
  listPayoutEntries,
} from "@startup/data-access";
import { requireApprovedFacility } from "@/server/auth/facilityAccess";
import { createClient } from "@/lib/supabase/server";

const financialAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("cash"),
      appointmentId: uuidSchema,
      expectedDue: z.number().int().min(100).safe(),
      note: z.string().trim().min(2).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("decision"),
      appointmentId: uuidSchema,
      refundId: uuidSchema,
      expectedVersion: z.number().int().positive().safe(),
      approve: z.boolean(),
      note: z.string().trim().min(2).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("cash_refund"),
      appointmentId: uuidSchema,
      refundId: uuidSchema,
      note: z.string().trim().min(2).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.enum(["reconcile", "process_refunds"]),
      appointmentId: uuidSchema,
    })
    .strict(),
]);

export async function loadPortalAppointmentBilling(appointmentId: string) {
  await requireApprovedFacility();
  return getAppointmentBilling(
    await createClient(),
    uuidSchema.parse(appointmentId)
  );
}

export async function loadPortalAppointmentPayouts(appointmentId: string) {
  await requireApprovedFacility();
  return listPayoutEntries(await createClient(), {
    appointmentId: uuidSchema.parse(appointmentId),
  });
}

export async function changePortalAppointmentBilling(input: unknown) {
  await requireApprovedFacility();
  try {
    const action = financialAction.parse(input);
    const client = await createClient();
    const billing = await getAppointmentBilling(client, action.appointmentId);
    if (!billing)
      return { error: "Payments are not available for this appointment yet." };
    if (action.action !== "reconcile" && !billing.can_manage)
      return { error: "Financial approval access required." };
    if (action.action === "cash")
      await recordAppointmentCash(
        client,
        action.appointmentId,
        action.expectedDue,
        action.note
      );
    else if (action.action === "decision") {
      if (!billing.refunds.some((refund) => refund.id === action.refundId))
        return { error: "Refund does not belong to this appointment." };
      await decideAppointmentRefund(client, action);
      if (action.approve)
        await processAppointmentPayment(client, {
          action: "process_refunds",
          appointmentId: action.appointmentId,
        });
    } else if (action.action === "cash_refund") {
      if (!billing.refunds.some((refund) => refund.id === action.refundId))
        return { error: "Refund does not belong to this appointment." };
      await confirmAppointmentCashRefund(client, action.refundId, action.note);
    } else await processAppointmentPayment(client, action);
    revalidatePath("/appointments");
    return { error: null };
  } catch (error) {
    unstable_rethrow(error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update payment. Refresh the latest status before retrying.",
    };
  }
}
