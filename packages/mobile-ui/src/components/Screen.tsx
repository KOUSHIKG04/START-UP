import { type PropsWithChildren } from "react";
import { type ViewProps } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";
import { cn } from "cn";
import { cssInterop } from "nativewind";

cssInterop(SafeAreaView, { className: "style" });

export type ScreenProps = PropsWithChildren<
  ViewProps & {
    // Edges to apply safe area padding. Defaults to ['top']
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
  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={edges}
        {...props}
        className={cn("bg-app-background flex-1", className)}
        style={style}
      >
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
