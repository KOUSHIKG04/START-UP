import {
  ambulanceBillingSchema,
  ambulancePaymentActionSchema,
  appointmentCheckoutSchema,
  uuidSchema,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function getAmbulanceBilling(
  client: AppSupabaseClient,
  bookingId: string
) {
  const { data, error } = await client.rpc("get_ambulance_billing", {
    p_booking_id: uuidSchema.parse(bookingId),
  });
  if (error?.code === "PGRST202") return null;
  if (error) throw error;
  return ambulanceBillingSchema.parse(data);
}

export async function processAmbulancePayment(
  client: AppSupabaseClient,
  input: unknown
) {
  const body = ambulancePaymentActionSchema.parse(input);
  const { data, error } = await client.functions.invoke("process-payment", {
    body,
  });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(
      typeof detail?.error === "string"
        ? detail.error
        : "Payment status could not be checked. Refresh before retrying."
    );
  }
  return body.action === "checkout"
    ? appointmentCheckoutSchema.parse(data)
    : ambulanceBillingSchema.parse(data);
}

export async function recordAmbulanceCash(
  client: AppSupabaseClient,
  input: {
    bookingId: string;
    quoteId: string;
    expectedAmount: number;
    note: string;
  }
) {
  const { data, error } = await client.rpc("record_ambulance_cash", {
    p_booking_id: uuidSchema.parse(input.bookingId),
    p_quote_id: uuidSchema.parse(input.quoteId),
    p_expected_amount: input.expectedAmount,
    p_note: input.note,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}
