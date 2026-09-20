import { router } from "expo-router";
import { MedicinesScreen } from "../../../features/medicines/screens/MedicinesScreen";

export default function MedicinesRoute() {
  return <MedicinesScreen onBackPress={() => router.back()} />;
}
