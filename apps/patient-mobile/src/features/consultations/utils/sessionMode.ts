import type { ConsultationType, VisitSessionMode } from "@/types/appointment";

export function getSessionMode(
  consultationType: ConsultationType,
  requestedMode?: VisitSessionMode
): VisitSessionMode {
  if (consultationType === "Home Visit") return "home-tracking";
  if (consultationType === "Online") {
    return requestedMode === "online-chat" ? "online-chat" : "online-video";
  }
  return "clinic-check-in";
}
