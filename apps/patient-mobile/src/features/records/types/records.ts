import type { PatientScreenProps } from "../../../types/screen";

export type RecordsScreenProps = PatientScreenProps & {
  onViewRecord: (appointmentId: string) => void;
};
