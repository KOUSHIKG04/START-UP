import type { RecordVitalInput } from "@startup/contracts";
import type { Meal } from "../types/consultation";
export const vitalUnits: Record<RecordVitalInput["code"], string> = {
  temperature_c: "°C",
  pulse_bpm: "bpm",
  spo2_percent: "%",
  systolic_mmhg: "mmHg",
  diastolic_mmhg: "mmHg",
  weight_kg: "kg",
  height_cm: "cm",
};

export const vitalLabels: Record<RecordVitalInput["code"], string> = {
  temperature_c: "Temperature",
  pulse_bpm: "Pulse",
  spo2_percent: "Oxygen saturation",
  systolic_mmhg: "Systolic blood pressure",
  diastolic_mmhg: "Diastolic blood pressure",
  weight_kg: "Weight",
  height_cm: "Height",
};

export const meals: Meal[] = ["breakfast", "lunch", "dinner", "bedtime"];

export const consultationSteps = [
  "Record vitals",
  "Prescription",
  "Follow-up",
  "Sign assessment",
];
export const mealRelations = [
  "before",
  "with",
  "after",
  "independent",
] as const;
