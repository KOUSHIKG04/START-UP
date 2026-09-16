import type { PropsWithChildren } from "react";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "@startup/mobile-ui";
import { colors } from "@startup/design-tokens";

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.patient.background,
  },
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        {children}
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
