import type { VerificationQueueItem } from "@startup/contracts";

const labels = {
  pending: "Pending",
  under_review: "Under review",
  needs_resubmission: "Needs resubmission",
  verified: "Verified",
} as const;
const styles = {
  pending: "bg-muted text-foreground",
  under_review: "bg-primary/10 text-primary",
  needs_resubmission: "bg-destructive/10 text-destructive",
  verified: "bg-primary/10 text-primary",
} as const;

export function StatusBadge({
  status,
}: {
  status: VerificationQueueItem["status"];
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
