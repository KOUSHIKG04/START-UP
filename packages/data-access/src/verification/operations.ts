import {
  verificationCaseSchema, verificationQueueItemSchema,
  type VerificationCase, type VerificationQueueItem,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function isCompanyReviewer(client: AppSupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("is_company_reviewer");
  if (error) throw error;
  return data === true;
}

export async function listCompanyVerificationCases(client: AppSupabaseClient): Promise<VerificationQueueItem[]> {
  const { data, error } = await client.rpc("list_company_verification_cases");
  if (error) throw error;
  return verificationQueueItemSchema.array().parse(data);
}

export async function getCompanyVerificationCase(client: AppSupabaseClient, id: string): Promise<VerificationCase | null> {
  const { data, error } = await client.rpc("get_company_verification_case", { p_case_id: id });
  if (error) throw error;
  return data == null ? null : verificationCaseSchema.parse(data);
}

export async function reviewCompanyVerificationDocument(
  client: AppSupabaseClient, id: string, decision: "approved" | "rejected", reason?: string,
): Promise<VerificationCase> {
  const { data, error } = await client.rpc("review_company_verification_document", {
    p_document_id: id, p_decision: decision, p_reason: reason ?? null,
  });
  if (error) throw error;
  return verificationCaseSchema.parse(data);
}

export async function finalizeCompanyVerification(
  client: AppSupabaseClient, id: string, driverDetails?: Record<string, unknown>,
): Promise<VerificationCase> {
  const { data, error } = await client.rpc("finalize_company_verification", {
    p_case_id: id, p_driver_details: driverDetails ?? null,
  });
  if (error) throw error;
  return verificationCaseSchema.parse(data);
}
