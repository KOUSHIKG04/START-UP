import { router, useLocalSearchParams, type Href } from "expo-router";
import { BookingStatusScreen } from "../../../features/appointments/screens/BookingStatusScreen";
import type { VisitSessionMode } from "../../../features/appointments/types/appointment";
import {
  appointmentFromParams,
  type AppointmentParams,
} from "../../../features/appointments/utils/appointmentParams";

export default function BookingStatusRoute() {
  const params = useLocalSearchParams<AppointmentParams>();
  const appointment = appointmentFromParams(params);

  return (
    <BookingStatusScreen
      appointment={appointment}
      status={appointment.status}
      onBackPress={() => router.back()}
      onContinue={(mode: VisitSessionMode) =>
        router.push({
          pathname: "/visit-session",
          params: {
            mode,
            sessionKey: `${appointment.id}-${Date.now()}`,
            ...appointment,
          },
        } as unknown as Href)
      }
    />
  );
}
