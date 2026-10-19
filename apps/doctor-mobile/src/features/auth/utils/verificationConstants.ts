export const doctorDocuments = [
  { kind: "medical_registration", title: "Medical registration" },
  { kind: "medical_degree", title: "Degree certificate" },
];

export const documentControlHeight = 56;

export const labels: Record<string, string> = {
  pending: "Pending review",
  under_review: "Under review",
  needs_resubmission: "Update required",
  verified: "Verified",
  approved: "Approved",
  rejected: "Rejected",
  submitted: "Pending review",
};
