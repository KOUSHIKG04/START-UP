import type { ReactNode } from "react";
import type { PressableProps, StyleProp, TextStyle } from "react-native";
import type { AppTheme } from "../utils/appTheme";

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "danger";

export type ButtonProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  label?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  theme?: AppTheme;
  disabled?: boolean;
  loading?: boolean;
  style?: PressableProps["style"];
  labelStyle?: StyleProp<TextStyle>;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};
