export const labels = {
  pending: "Pending",
  under_review: "Under review",
  needs_resubmission: "Needs resubmission",
  verified: "Verified",
} as const;

export const styles = {
  pending: "bg-muted text-foreground",
  under_review: "bg-primary/10 text-primary",
  needs_resubmission: "bg-destructive/10 text-destructive",
  verified: "bg-primary/10 text-primary",
} as const;
