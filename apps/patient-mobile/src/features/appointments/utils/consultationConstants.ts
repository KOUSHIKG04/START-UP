import type { ConsultationFlow } from "../types/consultation-flow";
export type { ConsultationFlow } from "../types/consultation-flow";
import type { ConsultationType } from "../types/appointment";

export const consultationFlows: Record<ConsultationType, ConsultationFlow> = {
  "Clinic Visit": {
    findDoctorTitle: "Find Your Doctor",
    resultsDescription:
      "Choose a nearby specialist based on experience and patient ratings.",
    requiresAddress: false,
    confirmationLabel: "Booking confirmed",
    showsPayment: true,
  },
  "Home Visit": {
    findDoctorTitle: "Find a Home Visit Doctor",
    resultsDescription:
      "Choose a doctor who can provide care at your selected address.",
    profileContext: "Home Visit",
    requiresAddress: true,
    confirmationLabel: "Home visit confirmed",
    showsPayment: true,
  },
  Online: {
    findDoctorTitle: "Find an Online Doctor",
    resultsDescription:
      "Choose an available specialist for a secure video consultation.",
    profileContext: "Online Consultation",
    requiresAddress: false,
    confirmationLabel: "Online consultation confirmed",
    showsPayment: false,
  },
};
