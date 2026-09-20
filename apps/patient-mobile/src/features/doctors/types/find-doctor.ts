import type { ConsultationType } from "../../appointments/types/appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type FindDoctorScreenProps = PatientScreenProps & {
  consultationType: ConsultationType;
  onBackPress?: () => void;
};
