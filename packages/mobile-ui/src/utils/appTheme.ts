import { colors } from "@startup/design-tokens";

export type AppTheme = "patient" | "doctor" | "driver";

export type AppThemeColors = {
  primary: string;
  primaryText: string;
  soft: string;
};

export const appThemeColors: Record<AppTheme, AppThemeColors> = {
  patient: {
    primary: colors.patient.primary,
    primaryText: colors.patient.primaryDark,
    soft: colors.patient.surface,
  },
  doctor: {
    primary: colors.doctor.primary,
    primaryText: colors.doctor.dark,
    soft: colors.doctor.surface,
  },
  driver: {
    primary: colors.driver.primary,
    primaryText: colors.driver.primary,
    soft: colors.driver.surface,
  },
};
