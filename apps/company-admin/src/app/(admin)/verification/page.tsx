import { listCompanyVerificationCases } from "@startup/data-access";
import { requireReviewer } from "@/lib/reviewer";
import { VerificationTable } from "@/features/verification/verification-table";
import { VerificationFilters } from "@/features/verification/verification-filters";

const types = ["all", "doctor", "facility", "driver"] as const;
const statuses = [
  "all",
  "pending",
  "under_review",
  "needs_resubmission",
  "verified",
] as const;

export default async function VerificationQueue({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; q?: string }>;
}) {
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Verification queue
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review evidence, give clear decisions, and track replacements.
        </p>
      </header>
      <VerificationFilters
        initialType={type ?? "all"}
        initialStatus={status ?? "all"}
        initialQuery={params.q ?? ""}
      />
      <VerificationTable key={`${type}|${status}|${query}`} cases={cases} />
      <p className="text-muted-foreground text-xs">
        Showing {cases.length} of the latest {all.length} submissions.
      </p>
    </div>
  );
}
