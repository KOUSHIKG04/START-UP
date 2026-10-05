import {
  companyDoctorFacilityRequestSchema, companyFacilityBedDeclarationSchema, verificationCaseSchema, verificationQueueItemSchema,
  type CompanyDoctorFacilityRequest, type CompanyFacilityBedDeclaration, type VerificationCase, type VerificationQueueItem,
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

export async function listCompanyDoctorFacilityRequests(client: AppSupabaseClient, caseId: string): Promise<CompanyDoctorFacilityRequest[]> {
  const { data,error } = await client.rpc("list_company_doctor_facility_requests", {p_case_id:caseId});
  if (error) throw error;
  return companyDoctorFacilityRequestSchema.array().parse(data);
}

export async function getCompanyFacilityBedDeclaration(client: AppSupabaseClient, caseId: string): Promise<CompanyFacilityBedDeclaration | null> {
  const { data, error } = await client.rpc("get_company_facility_bed_declaration", { p_case_id: caseId });
  // Keep the existing review page usable while the migration is being applied.
  if (error?.code === "PGRST202") return null;
  if (error) throw error;
  return data == null ? null : companyFacilityBedDeclarationSchema.parse(data);
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
