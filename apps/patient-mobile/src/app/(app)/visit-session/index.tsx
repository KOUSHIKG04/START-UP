import { router, useLocalSearchParams, type Href } from "expo-router";
import { VisitSessionScreen } from "../../../features/consultations/screens/VisitSessionScreen";
import type {
  ConsultationType,
  VisitSessionMode,
} from "../../../features/appointments/types/appointment";
import {
  appointmentFromParams,
  type AppointmentParams,
} from "../../../features/appointments/utils/appointmentParams";

type VisitSessionParams = AppointmentParams & {
  mode?: VisitSessionMode | VisitSessionMode[];
  sessionKey?: string | string[];
};

function getSessionMode(
  consultationType: ConsultationType,
  requestedMode?: VisitSessionMode
): VisitSessionMode {
  if (consultationType === "Home Visit") return "home-tracking";
  if (consultationType === "Online") {
    return requestedMode === "online-chat" ? "online-chat" : "online-video";
  }
  return "clinic-check-in";
}

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
        } as unknown as Href)
      }
      onViewPrescription={() =>
        router.push({
          pathname: "/prescription",
          params: appointment,
        } as unknown as Href)
      }
    />
  );
}
