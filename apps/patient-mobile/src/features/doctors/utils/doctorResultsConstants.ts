import type { Href } from "expo-router";
import type { DropdownOption } from "@startup/mobile-ui";
import type { ConsultationType } from "../../appointments/types/appointment";
import type { DoctorResult } from "../types/doctor-results";

export const filterOptions: readonly DropdownOption[] = [
  { label: "By distance", value: "distance" },
  { label: "By experience", value: "experience" },
  { label: "By ratings", value: "rating" },
  { label: "Consultation fee", value: "fee" },
];

export const doctors: DoctorResult[] = [
  {
    name: "Dr. Ananya Sharma",
    qualification: "MBBS, MD (General Medicine)",
    specialty: "General Physician",
    experience: "8+ years experience",
    rating: "4.8 (120+ reviews)",
    fee: "₹500",
    distanceKm: 2.4,
    experienceYears: 8,
    ratingValue: 4.8,
    feeValue: 500,
  },
  {
    name: "Dr. Mandira Rao",
    qualification: "MBBS, MD (General Medicine)",
    specialty: "General Physician",
    experience: "7+ years experience",
    rating: "4.7 (96 reviews)",
    fee: "₹450",
    distanceKm: 1.8,
    experienceYears: 7,
    ratingValue: 4.7,
    feeValue: 450,
  },
  {
    name: "Dr. Sriram Reddy",
    qualification: "MBBS, DNB (Superspecialist)",
    specialty: "General Physician",
    experience: "11+ years experience",
    rating: "4.9 (180+ reviews)",
    fee: "₹650",
    distanceKm: 4.1,
    experienceYears: 11,
    ratingValue: 4.9,
    feeValue: 650,
  },
  {
    name: "Dr. Deepthi Nair",
    qualification: "MBBS, DNB (Superspecialist)",
    specialty: "General Physician",
    experience: "9+ years experience",
    rating: "4.8 (140+ reviews)",
    fee: "₹600",
    distanceKm: 3.2,
    experienceYears: 9,
    ratingValue: 4.8,
    feeValue: 600,
  },
];

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
