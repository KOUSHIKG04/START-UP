import { useMobileTheme } from "../theme/MobileThemeProvider";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@startup/design-tokens";
import { cn } from "cn";
import type { ScreenProps } from "../types/screen";

export type { ScreenProps } from "../types/screen";

export function Screen({
  children,
  edges = ["top"],
  style,
  className,
  ...props
}: ScreenProps) {
  const theme = useMobileTheme();
  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={edges}
        {...props}
        {...(className ? { className: cn("flex-1", className) } : {})}
        style={[styles.container, { backgroundColor: theme.background }, style]}
      >
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
