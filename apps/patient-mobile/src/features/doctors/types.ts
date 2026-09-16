import type { DoctorCardProps } from "./components/DoctorCard";

export type DoctorResult = DoctorCardProps & {
  id: string;
  distanceKm: number;
  experienceYears: number;
  ratingValue: number;
  feeValue: number;
};
