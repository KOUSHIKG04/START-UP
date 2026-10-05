import Link from "next/link";
import { listCompanyVerificationCases } from "@startup/data-access";
import { formatDisplayDate } from "@startup/contracts";
import { requireReviewer } from "@/lib/reviewer";
import { Button } from "@startup/web-ui/components/ui/button";
import { StatusBadge } from "@/features/verification/status-badge";

export default async function OverviewPage() {
  const client = await requireReviewer();
  const cases = await listCompanyVerificationCases(client);
  
  const pending = cases.filter(
    (item) => item.status === "pending" || item.status === "under_review"
  ).length;
  
  const needsResubmission = cases.filter(
    (item) => item.status === "needs_resubmission"
  ).length;
  
  const verified = cases.filter((item) => item.status === "verified").length;
  
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Verification overview
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review submitted credentials across the Clinzo network.
        </p>
      </header>
      <section
        aria-label="Verification workload"
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          { label: "Awaiting review", value: pending },
          { label: "Needs resubmission", value: needsResubmission },
          { label: "Verified", value: verified },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-card rounded-xl border px-5 py-4"
          >
            <p className="text-muted-foreground text-sm">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {metric.value}
            </p>
          </div>
        ))}
      </section>
      <section className="bg-card rounded-xl border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Recent submissions</h2>
            <p className="text-muted-foreground text-sm">
              Newest cases across all categories
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/verification">Open queue</Link>
          </Button>
        </div>
        {cases.length ? (
          <ul className="divide-y">
            {cases.slice(0, 8).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/verification/${item.id}`}
                  className="hover:bg-accent/50 flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-medium">{item.subject_name}</p>
                    <p className="text-muted-foreground text-sm capitalize">
                      {item.subject_type} ·{" "}
                      {formatDisplayDate(item.submitted_at, "Asia/Kolkata")}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground px-5 py-10 text-center text-sm">
            No verification submissions yet. New doctor, facility, and driver
            submissions will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
