import type { AppSupabaseClient } from "../client/createSupabaseClient";

export type MyVerificationCase = {
  id: string;
  requires_clinic_licence?: boolean;
  status: "pending" | "under_review" | "needs_resubmission" | "verified";
  documents: Array<{ kind: string; status: string; rejection_reason: string | null; version: number }>;
};

export async function getMyVerificationCase(
  client: AppSupabaseClient, subjectType: "doctor" | "facility" | "driver", subjectId: string,
): Promise<MyVerificationCase | null> {
  const { data, error } = await client.rpc("get_my_verification_case", {
    p_subject_type: subjectType, p_subject_id: subjectId,
  });
  if (error) throw error;
  return data as MyVerificationCase | null;
}
