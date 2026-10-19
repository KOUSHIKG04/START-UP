import { router, useLocalSearchParams, type Href } from "expo-router";
import { PrescriptionScreen } from "../../../features/prescriptions/screens/PrescriptionScreen";
import { appointmentFromParams } from "../../../features/appointments/utils/appointmentParams";
import { type AppointmentParams } from "../../../features/appointments/types/appointment-params";

export default function PrescriptionRoute() {
  const params = useLocalSearchParams<
    AppointmentParams & { appointmentId?: string }
  >();
  const appointment = appointmentFromParams(params);
  const targetAppointmentId = params.appointmentId || appointment.id;

  return (
    <PrescriptionScreen
      appointment={appointment}
      appointmentId={targetAppointmentId}
      onBackPress={() => router.back()}
      onViewMedicines={() =>
        router.push({
          pathname: "/medicines",
          params: { appointmentId: targetAppointmentId },
        } as unknown as Href)
      }
    />
  );
}
