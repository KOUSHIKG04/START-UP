import { Header } from "@startup/mobile-ui";
import type { RecordsScreenProps } from "../../types/records";

export function RecordsScreen({ onBackPress }: RecordsScreenProps) {
  return <Header title="Records" app="patient" onBackPress={onBackPress} />;
}
