import type { Appointment } from "../../appointments/types/appointment";
import type { VisitSessionMode } from "../../appointments/types/appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type CompletionActions = {
  onGoHome: () => void;
  onViewMedicines: () => void;
  onViewPrescription: () => void;
};

export type VisitSessionScreenProps = PatientScreenProps & {
  appointment: Appointment;
  mode: VisitSessionMode;
  onGoHome: () => void;
  onViewMedicines: () => void;
  onViewPrescription: () => void;
  onRealComplete?: () => void;
};

export interface ClinicVisitFlowProps {
  appointment: Appointment;
  onComplete: () => void;
}

export interface HomeVisitFlowProps {
  appointment: Appointment;
  onComplete: () => void;
}

export interface OnlineVisitFlowProps {
  appointment: Appointment;
  initialChat: boolean;
  onBackPress: () => void;
  onComplete: () => void;
}

export interface CompletionViewProps extends CompletionActions {
  appointment: Appointment;
  existingRating?: number | null;
  onSubmitRating?: (rating: number, comment?: string) => Promise<void>;
}

export type ConsultationSummaryProps = {
  appointment: Appointment;
};
