import { createContext, useContext, type ReactNode } from "react";
import { appThemeColors, type AppTheme } from "../utils/appTheme";

const ThemeContext = createContext<AppTheme>("patient");

/** Select an app palette once; nested providers can scope another palette. */
export function MobileThemeProvider({
  theme,
  children,
}: {
  theme: AppTheme;
  children: ReactNode;
}) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

/** Explicit component overrides take precedence over the nearest provider. */
export function useMobileThemeName(override?: AppTheme): AppTheme {
  const inherited = useContext(ThemeContext);
  return override ?? inherited;
}

export function useMobileTheme(override?: AppTheme) {
  return appThemeColors[useMobileThemeName(override)];
}
