import type { AddDoctorFormData } from "../types/addDoctor";

export const initialDoctorForm: AddDoctorFormData = {
  name: "",
  clinzoId: "",
  specialization: "",
  phone: "",
};
export const doctorSuccessDelayMs = 1200;
export const addDoctorPlaceholders = {
  name: "Enter doctor's full name",
  clinzoId: "e.g. CLZ-DOC-2024-001",
  specialization: "e.g. Cardiology, Neurology",
  phone: "+91 XXXXX XXXXX",
} as const;
