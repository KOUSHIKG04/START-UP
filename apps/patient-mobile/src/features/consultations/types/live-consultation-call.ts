export type LiveConsultationCallProps = {
  appointmentId: string;
  name: string;
  active: boolean;
  initialChat?: boolean;
  onBack: () => void;
  onEnd: () => void;
};
