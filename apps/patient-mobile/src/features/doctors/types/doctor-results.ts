import type { DoctorCardProps } from "../components/DoctorCard";
import type { ConsultationType } from "../../appointments/types/appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type DoctorFilter = "distance" | "experience" | "rating" | "fee";

export type DoctorResult = DoctorCardProps & {
  distanceKm: number;
  experienceYears: number;
  ratingValue: number;
  feeValue: number;
};

export type DoctorResultsScreenProps = PatientScreenProps & {
  symptom: string;
  consultationType: ConsultationType;
};
