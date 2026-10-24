import type { Appointment } from "./appointment";
import type { ReactNode } from "react";

export type BookingCardProps = {
  appointment: Appointment;
  onPress?: () => void;
  statusLabel?: string;
  footer?: ReactNode;
  onMorePress?: () => void;
  moreDisabled?: boolean;
  moreLoading?: boolean;
};
