import { Header } from "@startup/mobile-ui";
import type { PatientScreenProps } from "../types";

export function AppointmentsScreen({ onBackPress }: PatientScreenProps) {
  return (
    <Header title="Appointments" app="patient" onBackPress={onBackPress} />
  );
}
