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
export function useMobileTheme(override?: AppTheme) {
  const inherited = useContext(ThemeContext);
  return appThemeColors[override ?? inherited];
}
