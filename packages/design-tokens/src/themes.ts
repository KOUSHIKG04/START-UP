import { colors } from "./colors";

export type MobileThemeName = "patient" | "doctor" | "driver";
export type MobileThemeColors = {
  primary: string;
  primaryText: string;
  soft: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  placeholder: string;
  onPrimary: string;
  danger: string;
  disabledBackground: string;
  disabledText: string;
};

const shared = {
  background: colors.background,
  surface: colors.surface,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  border: colors.borderDefault,
  placeholder: colors.disabledText,
  onPrimary: colors.white,
  danger: colors.danger,
  disabledBackground: colors.disabledBackground,
  disabledText: colors.disabledText,
};

export const mobileThemes = {
  patient: {
    ...shared,
    primary: colors.patient.primary,
    primaryText: colors.patient.primaryDark,
    soft: colors.patient.surface,
    background: colors.patient.background,
  },
  doctor: {
    ...shared,
    primary: colors.doctor.primary,
    primaryText: colors.doctor.dark,
    soft: colors.doctor.surface,
  },
  driver: {
    ...shared,
    primary: colors.driver.primary,
    primaryText: colors.driver.primary,
    soft: colors.driver.surface,
    textMuted: colors.driver.textSecondary,
  },
} as const satisfies Record<MobileThemeName, MobileThemeColors>;
