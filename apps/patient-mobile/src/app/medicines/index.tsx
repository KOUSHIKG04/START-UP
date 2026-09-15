import { router } from "expo-router";
import { MedicinesScreen } from "../../screens/medicines/MedicinesScreen";

export default function MedicinesRoute() {
  return <MedicinesScreen onBackPress={() => router.back()} />;
}
