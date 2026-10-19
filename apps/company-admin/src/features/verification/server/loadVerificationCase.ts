import "server-only";
import type { CaseDetailProps } from "../types/case-detail";
import { notFound } from "next/navigation";
import {
  getCompanyFacilityBedDeclaration,
  getCompanyVerificationCase,
  listCompanyDoctorFacilityRequests,
} from "@startup/data-access";
import { requireReviewer } from "@/lib/reviewer";
export async function loadVerificationCase({ params }: CaseDetailProps) {
  const [{ id }, client] = await Promise.all([params, requireReviewer()]);
  const item = await getCompanyVerificationCase(client, id);
  if (!item) notFound();
  const facilityRequests =
    item.subject_type === "doctor"
      ? await listCompanyDoctorFacilityRequests(client, id)
      : [];
  const bedDeclaration =
    item.subject_type === "facility"
      ? await getCompanyFacilityBedDeclaration(client, id)
      : null;
  const current = item.documents.filter(
    (document) => document.status !== "superseded"
  );
  const requiredKinds =
    item.subject_type === "doctor"
      ? [
          "medical_registration",
          "medical_degree",
          ...(item.doctor?.requires_clinic_licence === true
            ? ["clinic_operating_licence"]
            : []),
        ]
      : item.subject_type === "facility"
        ? ["registration_certificate", "operating_licence"]
        : [
            "aadhaar",
            "pan",
            "driving_licence",
            "vehicle_rc",
            "insurance",
            "fitness",
            "ambulance_image",
            "equipment_images",
          ];
  const missingKinds = requiredKinds.filter(
    (kind) => !current.some((document) => document.kind === kind)
  );
  const claimedQualification =
    typeof item.doctor?.claimed_qualification === "string"
      ? item.doctor.claimed_qualification
      : "";
  const reviewedQualification =
    typeof item.doctor?.reviewed_qualification === "string"
      ? item.doctor.reviewed_qualification
      : "";
  const qualificationApproved =
    item.subject_type !== "doctor" ||
    Boolean(
      claimedQualification && claimedQualification === reviewedQualification
    );
  const allApproved =
    missingKinds.length === 0 &&
    current.every((document) => document.status === "approved") &&
    qualificationApproved;
  const details = item.doctor ?? item.facility ?? item.driver;

  return {
    id,
    item,
    facilityRequests,
    bedDeclaration,
    current,
    missingKinds,
    claimedQualification,
    qualificationApproved,
    allApproved,
    details,
  };
}
