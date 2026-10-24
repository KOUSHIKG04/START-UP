import type { FacilityDoctorRequest } from "@startup/contracts";

export type DashboardDoctorRequestsProps = {
  scope: string;
  initialRequests?: FacilityDoctorRequest[];
};
