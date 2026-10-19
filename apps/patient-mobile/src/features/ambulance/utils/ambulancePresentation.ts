import { type AmbulanceFlowStep } from "./ambulanceConstants";
export function getHeaderTitle(step: AmbulanceFlowStep) {
  if (step === "pickup") return "Set pickup on map";
  if (
    step === "assigning" ||
    step === "tracking" ||
    step === "arrived" ||
    step === "hospital"
  ) {
    return "Ambulance Tracking";
  }
  if (step === "payment") return "Hospital Handover & Bill";
  if (step === "complete") return "Emergency Handover";
  return "Book Ambulance";
}
