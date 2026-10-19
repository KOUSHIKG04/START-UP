import type { useConsultationForm } from "../hooks/useConsultationForm";
export type FollowupStepProps = Pick<
  ReturnType<typeof useConsultationForm>,
  | "setStep"
  | "followupSaved"
  | "setError"
  | "followupDate"
  | "setFollowupDate"
  | "followupReason"
  | "setFollowupReason"
  | "tomorrow"
  | "followup"
  | "busy"
>;
