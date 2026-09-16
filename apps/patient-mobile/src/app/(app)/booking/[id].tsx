import { router, useLocalSearchParams, type Href } from "expo-router";
import { BookingStatusScreen } from "@/features/appointments/screens/BookingStatusScreen";
import type { VisitSessionMode } from "@/types/appointment";
import {
  appointmentFromParams,
  type AppointmentParams,
} from "@/features/appointments/utils/appointmentParams";

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
          pathname: "/visit/[id]",
          params: {
            mode,
            sessionKey: `${appointment.id}-${Date.now()}`,
            ...appointment,
          },
        } satisfies Href)
      }
    />
  );
}
