import type { ReactNode } from "react";
import type { PressableProps, TextProps, ViewProps } from "react-native";
import type { AppTheme } from "../utils/appTheme";

export type CardVariant = "elevated" | "outlined" | "soft" | "plain";

export type CardOrientation = "vertical" | "horizontal";

export type CardProps = Omit<
  PressableProps,
  "children" | "disabled" | "style"
> & {
  children: ReactNode;
  variant?: CardVariant;
  orientation?: CardOrientation;
  theme?: AppTheme;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  gap?: number;
  disabled?: boolean;
  style?: PressableProps["style"];
};

export type CardSectionProps = ViewProps & {
  gap?: number;
};

export type CardActionProps = ViewProps;

export type CardTitleProps = TextProps & {
  theme?: AppTheme;
  tone?: "default" | "brand";
};

export type CardDescriptionProps = TextProps;

export type CardSeparatorProps = ViewProps & {
  color?: string;
};
