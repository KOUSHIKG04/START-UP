import "server-only";
import { types, statuses } from "../utils/verificationFilterConstants";
import type { VerificationQueueProps } from "../types/verification-queue";
import { listCompanyVerificationCases } from "@startup/data-access";
import { requireReviewer } from "@/lib/reviewer";
export async function loadVerificationQueue({
  searchParams,
}: VerificationQueueProps) {
  const client = await requireReviewer();

  const params = await searchParams;

  const type = types.includes(params.type as (typeof types)[number])
    ? params.type
    : "all";

  const status = statuses.includes(params.status as (typeof statuses)[number])
    ? params.status
    : "all";

  const query = (params.q ?? "").trim().toLocaleLowerCase();

  const all = await listCompanyVerificationCases(client);

  const cases = all.filter(
    (item) =>
      (type === "all" || item.subject_type === type) &&
      (status === "all" || item.status === status) &&
      (!query || item.subject_name.toLocaleLowerCase().includes(query))
  );

  return { params, type, status, query, all, cases };
}
