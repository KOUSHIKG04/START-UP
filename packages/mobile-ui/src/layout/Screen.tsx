import { useMobileTheme } from "../theme/MobileThemeProvider";
import { type PropsWithChildren } from "react";
import { StyleSheet, type ViewProps } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";
import { colors } from "@startup/design-tokens";
import { cn } from "cn";

export type ScreenProps = PropsWithChildren<
  ViewProps & {
    /** Edges to apply safe area padding. Defaults to ['top'] */
    edges?: readonly Edge[];
    className?: string;
  }
>;

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
