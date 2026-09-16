import { router, useLocalSearchParams, type Href } from "expo-router";
import { PrescriptionScreen } from "@/features/prescriptions/screens/PrescriptionScreen";
import {
  appointmentFromParams,
  type AppointmentParams,
} from "@/features/appointments/utils/appointmentParams";

export default function PrescriptionRoute() {
  const appointment = appointmentFromParams(
    useLocalSearchParams<AppointmentParams>()
  );

  return (
    <PrescriptionScreen
      appointment={appointment}
      onBackPress={() => router.back()}
      onViewMedicines={() =>
        router.push({
          pathname: "/medicines",
          params: appointment,
        } satisfies Href)
      }
    />
  );
}
