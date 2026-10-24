import type { ClinicAppointment } from "@startup/contracts";

export type PatientCardProps = {
  appointment: ClinicAppointment;
  now?: number;
  home?: boolean;
  onOpen: () => void;
  onAction?: () => void;
  actionLabel?: string;
};
