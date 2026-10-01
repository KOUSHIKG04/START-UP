"use server";

import { revalidatePath } from "next/cache";
import {
  finalizeCompanyVerification,
  reviewCompanyVerificationDocument,
} from "@startup/data-access";
import { verificationDecisionSchema } from "@startup/contracts";
import { requireReviewer } from "@/lib/reviewer";

export type ReviewState = { error: string | null; success: string | null };

export async function reviewDocument(
  caseId: string,
  documentId: string,
  _state: ReviewState,
  form: FormData
): Promise<ReviewState> {
  const decision = form.get("decision");
  const parsed = verificationDecisionSchema.safeParse({
    decision,
    reason: decision === "rejected" ? form.get("reason") : null,
  });

  if (!parsed.success)
    return {
      error: "A rejection needs a reason of at least 10 characters.",
      success: null,
    };

  const client = await requireReviewer();

  try {
    await reviewCompanyVerificationDocument(
      client,
      documentId,
      parsed.data.decision,
      parsed.data.reason ?? undefined
    );
  } catch (cause) {
    return {
      error:
        cause instanceof Error ? cause.message : "Review failed. Try again.",
      success: null,
    };
  }

  revalidatePath(`/verification/${caseId}`);
  revalidatePath("/verification");

  return {
    error: null,
    success:
      parsed.data.decision === "approved"
        ? "Document approved."
        : "Document rejected. The reason is available to the applicant.",
  };
}

export async function finalizeCase(
  caseId: string,
  subjectType: string,
  _state: ReviewState,
  form: FormData
): Promise<ReviewState> {

  const client = await requireReviewer();

  const driverDetails =
    subjectType === "driver"
      ? Object.fromEntries(
          [
            "license_number",
            "license_expires_on",
            "inspection_expires_on",
            "capability_approved_until",
            "vehicle_label",
            "equipment_notes",
            "crew_notes",
          ].map((name) => [name, form.get(name)])
        )
      : undefined;
  try {
    await finalizeCompanyVerification(client, caseId, driverDetails);
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : "Verification could not be completed.",
      success: null,
    };
  }
  revalidatePath(`/verification/${caseId}`);
  revalidatePath("/verification");
  
  return {
    error: null,
    success: `${subjectType.charAt(0).toUpperCase()}${subjectType.slice(1)} verified.`,
  };
}
