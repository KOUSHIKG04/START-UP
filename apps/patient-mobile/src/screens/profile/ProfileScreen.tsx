import { Header } from "@startup/mobile-ui";
import type { PatientScreenProps } from "../types";

export function ProfileScreen({ onBackPress }: PatientScreenProps) {
  return <Header title="Profile" app="patient" onBackPress={onBackPress} />;
}
