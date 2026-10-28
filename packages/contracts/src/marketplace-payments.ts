import { z } from "zod";
import { uuidSchema } from "./validation";

const minor = z.coerce.number().int().min(0).max(9000000000000);

const bps = z.number().int().min(0).max(10000);

const note = z.string().trim().min(2).max(1000);

export const payoutEntrySchema = z.object({
  id: uuidSchema,
  resource_id: uuidSchema,
  scope_kind: z.enum(["practice", "driver"]),
  scope_id: uuidSchema,
  mode: z.enum(["test", "live"]),
  method: z.enum(["gateway", "cash", "external_direct"]),
  recipient_id: uuidSchema.nullable(),
  recipient_name: z.string().nullable(),
  commission_bps: bps.nullable(),
  gross_minor: minor,
  refunded_minor: minor,
  net_minor: minor,
  company_minor: minor.nullable(),
  provider_minor: minor.nullable(),
  transfer_minor: minor,
  reversed_minor: minor,
  transfer_id: z.string().nullable(),
  transfer_status: z.enum([
    "pending",
    "working",
    "uncertain",
    "processed",
    "failed",
    "reversed",
    "partially_reversed",
  ]),
  settlement_status: z.enum(["pending", "on_hold", "settled"]),
  settlement_id: z.string().nullable(),
  cash_received_minor: minor,
  cash_due_minor: minor.nullable(),
  cash_credit_minor: minor.nullable(),
  gateway_fees_minor: minor,
  gateway_tax_minor: minor,
  route_fees_minor: minor,
  route_tax_minor: minor,
  complete: z.boolean(),
  ready: z.boolean(),
  refund_pending: z.boolean(),
  reversal_due_minor: minor,
  created_at: z.string(),
});

export type PayoutEntry = z.infer<typeof payoutEntrySchema>;

export function payoutStatusLabel(entry: PayoutEntry) {
  if (entry.commission_bps === null || !entry.recipient_id)
    return "Payment setup needed";
  if (entry.reversal_due_minor > 0) return "Provider reversal pending";
  if (entry.method !== "gateway") {
    if (!entry.complete) return "Cash collected · Service pending";
    if ((entry.cash_credit_minor ?? 0) > 0)
      return "Cash commission credit needs review";
    return (entry.cash_due_minor ?? 0) > 0
      ? "Cash commission due"
      : "Cash commission reconciled";
  }
  if (entry.transfer_status === "uncertain") return "Checking transfer status";
  if (entry.transfer_status === "failed")
    return "Transfer needs finance review";
  if (entry.transfer_status === "reversed") return "Provider payment reversed";
  if (entry.transfer_status === "partially_reversed")
    return "Provider payment partly reversed";
  if (entry.settlement_status === "settled") return "Settled to recipient bank";
  if (entry.settlement_status === "on_hold") return "Bank settlement on hold";
  if (entry.transfer_status === "processed")
    return "Transferred · Bank settlement pending";
  if (entry.transfer_status === "working") return "Transfer pending";
  if (entry.provider_minor === 0) return "No provider transfer due";
  if (entry.refund_pending) return "Held for refund review";
  if (!entry.complete) return "Awaiting service completion";
  return entry.ready ? "Ready for transfer" : "Awaiting payout activation";
}

export const companyPaymentSetupSchema = z.object({
  config: z.object({
    enabled: z.boolean(),
    mode: z.enum(["test", "live"]),
    appointment_bps: bps.nullable(),
    ambulance_bps: bps.nullable(),
    release_delay_hours: z.number().int().min(0).max(168),
    row_version: z.coerce.number().int().positive().safe(),
  }),
  recipients: z.array(
    z.object({
      id: uuidSchema,
      scope_kind: z.enum(["practice", "driver"]),
      scope_id: uuidSchema,
      payee_kind: z.enum(["doctor", "facility", "driver", "operator"]),
      legal_name: z.string(),
      mode: z.enum(["test", "live"]),
      account_id: z.string(),
      product_id: z.string(),
      verified_at: z.string().nullable(),
    })
  ),
});

export const companyPaymentActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("config"),
      enabled: z.boolean(),
      mode: z.enum(["test", "live"]),
      appointmentBps: bps.nullable(),
      ambulanceBps: bps.nullable(),
      releaseDelayHours: z.number().int().min(0).max(168),
      expectedVersion: z.number().int().positive().safe(),
      note,
    })
    .strict(),
  z
    .object({
      action: z.literal("recipient"),
      scopeKind: z.enum(["practice", "driver"]),
      scopeId: uuidSchema,
      payeeKind: z.enum(["doctor", "facility", "driver", "operator"]),
      legalName: z.string().trim().min(2).max(200),
      accountId: z.string().regex(/^acc_[A-Za-z0-9]+$/),
      productId: z.string().regex(/^acc_prd_[A-Za-z0-9]+$/),
      note,
    })
    .strict(),
  z
    .object({ action: z.literal("apply_terms"), entryId: uuidSchema, note })
    .strict(),
  z
    .object({
      action: z.literal("cash_receipt"),
      entryId: uuidSchema,
      expectedAmount: minor.refine((n) => n > 0),
      reference: z.string().trim().min(3).max(150),
      note,
    })
    .strict(),
  z
    .object({
      action: z.literal("final_fare"),
      bookingId: uuidSchema,
      amountMinor: minor.refine((n) => n >= 100),
      note,
    })
    .strict(),
]);

export const financeGatewayActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      resourceType: z.literal("finance"),
      action: z.literal("verify_recipient"),
      recipientId: uuidSchema,
    })
    .strict(),
  z
    .object({
      resourceType: z.literal("finance"),
      action: z.literal("process_payout"),
      entryId: uuidSchema,
    })
    .strict(),
]);

export const ambulanceBillingSchema = z.object({
  booking_id: uuidSchema,
  enabled: z.boolean(),
  mode: z.enum(["test", "live"]),
  quote_id: uuidSchema.nullable(),
  amount_minor: minor,
  currency: z.literal("INR"),
  status: z.enum(["paid", "authorized", "checking", "unpaid"]),
  payment_id: z.string().nullable(),
  method: z.enum(["gateway", "cash", "external_direct"]).nullable(),
  can_pay: z.boolean().nullable(),
  can_record_cash: z.boolean().nullable(),
  refunded_minor: minor,
});

export const ambulancePaymentActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      resourceType: z.literal("ambulance"),
      action: z.literal("checkout"),
      bookingId: uuidSchema,
      quoteId: uuidSchema,
    })
    .strict(),
  z
    .object({
      resourceType: z.literal("ambulance"),
      action: z.literal("verify"),
      bookingId: uuidSchema,
      attemptId: uuidSchema,
      paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
      signature: z.string().regex(/^[a-f0-9]{64}$/i),
    })
    .strict(),
  z
    .object({
      resourceType: z.literal("ambulance"),
      action: z.literal("reconcile"),
      bookingId: uuidSchema,
    })
    .strict(),
]);
