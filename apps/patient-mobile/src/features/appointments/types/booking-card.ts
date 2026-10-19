import type { Appointment } from "./appointment";
export type BookingCardProps = {
  appointment: Appointment;
  onPress?: () => void;
  statusLabel?: string;
};
