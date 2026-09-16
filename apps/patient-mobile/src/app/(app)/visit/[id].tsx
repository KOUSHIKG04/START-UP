import { getSessionMode } from "@/features/consultations/utils/sessionMode";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { VisitSessionScreen } from "@/features/consultations/screens/VisitSessionScreen";
import type { VisitSessionMode } from "@/types/appointment";
import {
  appointmentFromParams,
  type AppointmentParams,
} from "@/features/appointments/utils/appointmentParams";

type VisitSessionParams = AppointmentParams & {
  mode?: VisitSessionMode | VisitSessionMode[];
  sessionKey?: string | string[];
};

export default function VisitSessionRoute() {
  const params = useLocalSearchParams<VisitSessionParams>();
  const appointment = appointmentFromParams(params);
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const sessionKey = Array.isArray(params.sessionKey)
    ? params.sessionKey[0]
    : params.sessionKey;
  const mode = getSessionMode(appointment.consultationType, rawMode);

  return (
    <VisitSessionScreen
      key={sessionKey ?? `${appointment.id}-${mode}`}
      appointment={appointment}
      mode={mode}
      onBackPress={() => router.back()}
      onGoHome={() => router.replace("/")}
      onViewMedicines={() =>
        router.push({
          pathname: "/medicines",
          params: appointment,
        } satisfies Href)
      }
      onViewPrescription={() =>
        router.push({
          pathname: "/prescription",
          params: appointment,
        } satisfies Href)
      }
    />
  );
}
