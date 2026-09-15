import { router, useLocalSearchParams, type Href } from "expo-router";
import { BookingStatusScreen } from "../../screens/booking-status/BookingStatusScreen";
import type { VisitSessionMode } from "../../types/appointment";
import {
  appointmentFromParams,
  type AppointmentParams,
} from "../../utils/appointmentParams";

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
