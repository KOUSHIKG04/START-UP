import type { ReactNode } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { AppTheme } from "../utils/appTheme";

export type AccordionVariant = "elevated" | "outlined" | "surface" | "plain";

export type AccordionProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  variant?: AccordionVariant;
  theme?: AppTheme;
  disabled?: boolean;
  separator?: boolean;
  separatorColor?: string;
  chevronColor?: string;
  chevronSize?: number;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  closedPlaceholder?: ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};
