import { colors, gradients } from "@startup/design-tokens";

export type HeaderApp = "patient" | "doctor" | "driver";

export type HeaderBackground =
  | { type: "gradient"; colors: readonly [string, string] }
  | { type: "solid"; color: string };

export const appBackgrounds: Record<HeaderApp, HeaderBackground> = {
  patient: { type: "gradient", colors: gradients.patientBanner.colors },
  doctor: { type: "solid", color: colors.doctor.primary },
  driver: { type: "solid", color: colors.driver.primary },
};
