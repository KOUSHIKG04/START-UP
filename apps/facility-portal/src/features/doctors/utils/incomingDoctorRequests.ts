import type { FacilityDoctorRequest } from "@startup/contracts";
export function incomingDoctorRequests(requests: FacilityDoctorRequest[]) {
  return requests
    .filter(
      (request) =>
        request.status === "pending" && request.initiated_by === "doctor"
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
