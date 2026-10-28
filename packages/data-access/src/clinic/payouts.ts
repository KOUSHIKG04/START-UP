import {
  companyPaymentActionSchema,
  companyPaymentSetupSchema,
  financeGatewayActionSchema,
  payoutEntrySchema,
  uuidSchema,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function hasCompanyFinanceAccess(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("has_company_finance_access");
  if (error?.code === "PGRST202") return false;
  if (error) throw error;
  return data === true;
}

export async function listPayoutEntries(
  client: AppSupabaseClient,
  input: { appointmentId?: string; beforeId?: string } = {}
) {
  const { data, error } = await client.rpc("list_payout_entries", {
    p_appointment_id: input.appointmentId
      ? uuidSchema.parse(input.appointmentId)
      : null,
    p_before_id: input.beforeId ? uuidSchema.parse(input.beforeId) : null,
  });
  if (error?.code === "PGRST202") return [];
  if (error) throw error;
  return payoutEntrySchema.array().parse(data);
}

export async function getCompanyPaymentSetup(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("get_company_payment_setup");
  if (error) throw error;
  return companyPaymentSetupSchema.parse(data);
}

export async function manageCompanyPayments(
  client: AppSupabaseClient,
  input: unknown
) {
  const { action, ...rest } = companyPaymentActionSchema.parse(input);
  const { data, error } = await client.rpc("manage_company_payments", {
    p_action: action,
    p_data: rest,
  });
  if (error) throw error;
  return data;
}

export async function processFinanceGatewayAction(
  client: AppSupabaseClient,
  input: unknown
) {
  const body = financeGatewayActionSchema.parse(input);
  const { data, error } = await client.functions.invoke("process-payment", {
    body,
  });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(
      typeof detail?.error === "string"
        ? detail.error
        : "Could not check provider status. Refresh before retrying."
    );
  }
  return data;
}
