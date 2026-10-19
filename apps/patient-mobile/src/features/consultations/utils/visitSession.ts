import type { VisitSessionMode } from "../../appointments/types/appointment";
export function getTitle(mode: VisitSessionMode) {
  if (mode === "clinic-check-in") return "Hospital Visit";
  if (mode === "home-tracking") return "Home Visit";
  return mode === "online-chat" ? "Secure Care Chat" : "Video Consultation";
}
