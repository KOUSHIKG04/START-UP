import type { useConsultationForm } from "../hooks/useConsultationForm";

export type VitalsStepProps = Pick<
  ReturnType<typeof useConsultationForm>,
  | "setStep"
  | "intakeSaved"
  | "vitalValues"
  | "setVitalValues"
  | "diagnosis"
  | "setDiagnosis"
  | "vital"
  | "busy"
>;
