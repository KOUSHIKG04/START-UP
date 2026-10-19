import type { FacilityDoctorRosterItem } from "@startup/contracts";
import type { PracticeSession } from "./facilitySchedule";
export type DoctorSchedulesScreenProps = {
  doctors: FacilityDoctorRosterItem[];
  sessions: PracticeSession[];
  loadError?: string;
};
