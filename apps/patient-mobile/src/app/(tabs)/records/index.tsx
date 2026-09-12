import { router } from "expo-router";
import { RecordsScreen } from "../../../screens/records/RecordsScreen";

export default function RecordsRoute() {
  return (
    <RecordsScreen onBackPress={() => router.navigate("/")} />
  );
}
