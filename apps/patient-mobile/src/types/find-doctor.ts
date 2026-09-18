import type { ConsultationType } from "./appointment";
import type { PatientScreenProps } from "./screen";

export type FindDoctorScreenProps = PatientScreenProps & {
  consultationType: ConsultationType;
  onBackPress?: () => void;
};
