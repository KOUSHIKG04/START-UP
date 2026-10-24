import type { Href } from "expo-router";
import type { ConsultationType } from "../../appointments/types/appointment";

export function getDoctorResultsRoute(
  symptom: string,
  consultationType: ConsultationType
) {
  return {
    pathname: "/doctor-results",
    params: { symptom, consultationType },
  } as unknown as Href;
}

import type { DoctorResult } from "../types/doctor-results";

export function getDoctorProfileRoute(
  doctor: DoctorResult,
  consultationType: ConsultationType
): Href {
  return {
    pathname: "/doctor-profile",
    params: {
      name: doctor.name,
      qualification: doctor.qualification,
      specialty: doctor.specialty,
      experience: doctor.experience,
      rating: doctor.rating,
      fee: doctor.fee,
      consultationType,
    },
  } as unknown as Href;
}
