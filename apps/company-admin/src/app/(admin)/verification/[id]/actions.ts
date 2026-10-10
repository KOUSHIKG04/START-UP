"use server";

import { revalidatePath } from "next/cache";
import {
  finalizeCompanyVerification,
  reviewCompanyVerificationDocument,
} from "@startup/data-access";
import { parseDisplayDate, verificationDecisionSchema } from "@startup/contracts";
import { requireReviewer } from "@/lib/reviewer";

export type ReviewState = { error: string | null; success: string | null };

function reviewErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error) return cause.message;
  // Supabase RPC errors are plain objects, not always Error instances.
  if (typeof cause === "object" && cause !== null && "message" in cause
    && typeof cause.message === "string" && cause.message.trim()) {
    return cause.message;
  }
  return fallback;
}

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
  let doctorVerified = false;
  let documentApproved = false;

  try {
    const reviewedCase = await reviewCompanyVerificationDocument(
      client,
      documentId,
      parsed.data.decision,
      parsed.data.reason ?? undefined
    );
    documentApproved = parsed.data.decision === "approved";
    if (parsed.data.decision === "approved" && reviewedCase.subject_type === "doctor") {
      const currentDocuments = reviewedCase.documents.filter(document => document.status !== "superseded");
      const requiredKinds = ["medical_registration", "medical_degree", ...(reviewedCase.doctor?.requires_clinic_licence === true ? ["clinic_operating_licence"] : [])];
      if (requiredKinds.every(kind => currentDocuments.some(document => document.kind === kind && document.status === "approved"))
        && currentDocuments.every(document => document.status === "approved")) {
        await finalizeCompanyVerification(client, reviewedCase.id);
        doctorVerified = true;
      }
    }
  } catch (cause) {
    return {
      error:
        `${documentApproved ? "Document approved, but final verification failed: " : "Review failed: "}${reviewErrorMessage(cause, "Try again.")}`,
      success: null,
    };
  }

  revalidatePath(`/verification/${caseId}`);
  revalidatePath("/verification");

  return {
    error: null,
    success: doctorVerified
      ? "Doctor verified. The Doctor app will open the home screen after its status refreshes."
      :
      parsed.data.decision === "approved"
        ? "Document approved. Remaining documents still need review."
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

  let driverDetails: Record<string, unknown> | undefined;
  if (subjectType === "driver") {
    const licenseExpiry = parseDisplayDate(String(form.get("license_expires_on") ?? ""));
    const inspectionExpiry = parseDisplayDate(String(form.get("inspection_expires_on") ?? ""));
    const approval = /^(\d{2}-\d{2}-\d{4}) ([01]\d|2[0-3]):([0-5]\d)$/.exec(String(form.get("capability_approved_until") ?? ""));
    const approvalDate = approval ? parseDisplayDate(approval[1]) : null;
    if (!licenseExpiry || !inspectionExpiry || !approvalDate) {
      return { error: "Enter valid driver dates as DD-MM-YYYY and approval time as DD-MM-YYYY HH:mm.", success: null };
    }
    driverDetails = {
      license_number: form.get("license_number"),
      license_expires_on: licenseExpiry,
      inspection_expires_on: inspectionExpiry,
      capability_approved_until: `${approvalDate}T${approval![2]}:${approval![3]}:00+05:30`,
      vehicle_label: form.get("vehicle_label"),
      equipment_notes: form.get("equipment_notes"),
      crew_notes: form.get("crew_notes"),
    };
  }
  try {
    await finalizeCompanyVerification(client, caseId, driverDetails);
  } catch (cause) {
    return {
      error: reviewErrorMessage(cause, "Verification could not be completed."),
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
