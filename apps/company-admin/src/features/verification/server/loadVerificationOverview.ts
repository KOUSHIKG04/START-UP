import "server-only";
import { listCompanyVerificationCases } from "@startup/data-access";
import { requireReviewer } from "@/lib/reviewer";
export async function loadVerificationOverview() {
  const client = await requireReviewer();
  const cases = await listCompanyVerificationCases(client);

  const pending = cases.filter(
    (item) => item.status === "pending" || item.status === "under_review"
  ).length;

  const needsResubmission = cases.filter(
    (item) => item.status === "needs_resubmission"
  ).length;

  const verified = cases.filter((item) => item.status === "verified").length;

  return { cases, pending, needsResubmission, verified };
}
