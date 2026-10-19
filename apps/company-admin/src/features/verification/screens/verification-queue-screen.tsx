import { loadVerificationQueue } from "../server/loadVerificationQueue";

import type { VerificationQueueProps } from "../types/verification-queue";

import { VerificationTable } from "../components/verification-table";
import { VerificationFilters } from "../components/verification-filters";

export default async function VerificationQueue({
  searchParams,
}: VerificationQueueProps) {
  const { params, type, status, query, all, cases } =
    await loadVerificationQueue({
      searchParams,
    });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Verification queue
        </h1>
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
