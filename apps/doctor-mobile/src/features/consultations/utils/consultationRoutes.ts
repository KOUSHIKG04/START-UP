import { router, type Href } from "expo-router";

import type { Appointment } from "../../../types/doctor";

export function visitRoute(screen: string, appointment: Appointment): Href {
  return {
    pathname: `/${screen}`,
    params: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      mode: appointment.mode,
    },
  } as Href;
}

export function openAppointment(appointment: Appointment) {
  router.push(
    visitRoute(
      appointment.mode === "online"
        ? "online-consultation"
        : appointment.mode === "home"
          ? "home-visit"
          : "clinical-notes",
      appointment
    )
  );
}
