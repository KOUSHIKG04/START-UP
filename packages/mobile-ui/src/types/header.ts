import type { ReactNode } from "react";
import type { TextStyle, ViewProps } from "react-native";
import type { Edge } from "react-native-safe-area-context";
import type { HeaderApp } from "../utils/headerBackground";

export type HeaderProps = ViewProps & {
  title?: string;
  centered?: boolean;
  centerContent?: ReactNode;
  rightAction?: ReactNode;
  onBackPress?: () => void;
  onBack?: () => void;
  app?: HeaderApp;
  backgroundColor?: string;
  foregroundColor?: string;
  titleStyle?: TextStyle;
  backAccessibilityLabel?: string;
  safeAreaEdges?: readonly Edge[];
};
