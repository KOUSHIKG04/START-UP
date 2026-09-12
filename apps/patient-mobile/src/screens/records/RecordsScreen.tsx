import { Header } from "@startup/mobile-ui";
import type { PatientScreenProps } from "../types";

export function RecordsScreen({ onBackPress }: PatientScreenProps) {
  return <Header title="Records" app="patient" onBackPress={onBackPress} />;
}
