import { z } from "zod";
import { uuidSchema } from "./validation";

const money = z.coerce.number().int().min(0).max(9000000000000);

export const appointmentBookingOptionsSchema = z.object({
  auto_accept: z.boolean(),
  requires_payment: z.boolean(),
  can_pay_reception: z.boolean(),
  policy_version: z.string(),
  policy_text: z.string(),
  hold_minutes: z.number().int().positive(),
  mode: z.enum(["test", "live"]),
});

export const preparedAppointmentBookingSchema = z.object({
  appointment_id: uuidSchema,
  status: z.enum([
    "pending",
    "confirmed",
    "rejected",
    "cancelled",
    "in_consultation",
    "completed",
    "no_show",
  ]),
  requires_payment: z.boolean(),
  reservation_expires_at: z.string().nullable(),
});

export const appointmentBillingSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["test", "live"]),
  policy_version: z.string(),
  policy_text: z.string(),
  currency: z.literal("INR"),
  appointment_id: uuidSchema,
  charge_id: uuidSchema.nullable(),
  amount_minor: money,
  captured_minor: money,
  refunded_minor: money,
  reserved_minor: money,
  deduction_minor: money,
  due_minor: money,
  credit_minor: money,
  refund_amount_minor: money,
  refund_deduction_minor: money,
  surplus_minor: money,
  can_pay: z.boolean(),
  can_refund: z.boolean(),
  can_manage: z.boolean(),
  attempts: z.array(
    z.object({
      id: uuidSchema,
      method: z.enum(["gateway", "cash"]),
      amount_minor: money,
      status: z.enum([
        "creating",
        "created",
        "authorized",
        "captured",
        "failed",
        "uncertain",
      ]),
      order_id: z.string().nullable(),
      payment_id: z.string().nullable(),
    })
  ),
  refunds: z.array(
    z.object({
      id: uuidSchema,
      kind: z.enum(["cancel", "surplus"]),
      status: z.enum([
        "requested",
        "approved",
        "processing",
        "refunded",
        "rejected",
      ]),
      amount_minor: money,
      deduction_minor: money,
      reason: z.string(),
      decision_note: z.string().nullable(),
      cash_pending: z.boolean(),
      row_version: z.coerce.number().int().positive().safe(),
      references: z.array(z.string()),
    })
  ),
});

export const appointmentPaymentCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("checkout"),
      appointmentId: uuidSchema,
      policyVersion: z.string().min(1).max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal("verify"),
      appointmentId: uuidSchema,
      attemptId: uuidSchema,
      paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/),
      signature: z.string().regex(/^[a-f0-9]{64}$/i),
    })
    .strict(),
  z
    .object({ action: z.literal("reconcile"), appointmentId: uuidSchema })
    .strict(),
  z
    .object({ action: z.literal("process_refunds"), appointmentId: uuidSchema })
    .strict(),
]);

export const appointmentCheckoutSchema = z.object({
  attemptId: uuidSchema,
  keyId: z.string().regex(/^rzp_(test|live)_/),
  orderId: z.string().regex(/^order_[A-Za-z0-9]+$/),
  amount: money.refine((value) => value >= 100),
  currency: z.literal("INR"),
  mode: z.enum(["test", "live"]),
});

export type AppointmentBilling = z.infer<typeof appointmentBillingSchema>;

export function appointmentPaymentLabel(
  attempt: AppointmentBilling["attempts"][number]
) {
  if (attempt.method === "cash") return "Cash received";
  switch (attempt.status) {
    case "captured":
      return "Online payment received";
    case "failed":
      return "Payment attempt failed";
    case "authorized":
      return "Awaiting payment capture";
    case "uncertain":
      return "Checking payment status";
    default:
      return "Payment not completed";
  }
}

export function appointmentMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    amount / 100
  );
}
