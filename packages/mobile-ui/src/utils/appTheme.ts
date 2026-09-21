import {
  mobileThemes,
  type MobileThemeName,
  type MobileThemeColors,
} from "@startup/design-tokens";

// Compatibility aliases for existing app imports.
export type AppTheme = MobileThemeName;
export type AppThemeColors = MobileThemeColors;
export const appThemeColors = mobileThemes;
