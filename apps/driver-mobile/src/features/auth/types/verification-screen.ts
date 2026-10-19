export type VerificationScreenProps = {
  verified: boolean;
  rejectionReason?: string | null;
  onDashboard: () => void;
  onBack: () => void;
};
