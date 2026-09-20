import { router } from "expo-router";
import { RecordsScreen } from "../../../../features/records/screens/RecordsScreen";

export default function RecordsRoute() {
  return (
    <RecordsScreen onBackPress={() => router.navigate("/")} />
  );
}
