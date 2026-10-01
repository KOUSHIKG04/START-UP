import { router, useLocalSearchParams } from "expo-router";
import { MedicinesScreen } from "../../../features/medicines/screens/MedicinesScreen";

export default function MedicinesRoute() {
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  return (
    <MedicinesScreen
      appointmentId={params.appointmentId}
      onBackPress={() => router.back()}
    />
  );
}
