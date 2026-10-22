import type { ClinicAppointment } from "@startup/contracts";
import { clinicAppointmentCard } from "./clinicAppointmentCard";

export function isClinicDay(item: ClinicAppointment, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: item.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(item.starts_at)) === formatter.format(now);
}

export function canOpenClinicVisit(item: ClinicAppointment, now = new Date()) {
  return (
    item.visit_mode === "clinic" &&
    ["confirmed", "in_consultation"].includes(item.status) &&
    Boolean(item.queue_state) &&
    (item.queue_state !== "awaiting_arrival" || isClinicDay(item, now))
  );
}

export function clinicVisitRoute(item: ClinicAppointment) {
  return {
    pathname: "/visit-session" as const,
    params: {
      ...clinicAppointmentCard(item),
      mode: "clinic-check-in" as const,
    },
  };
}
