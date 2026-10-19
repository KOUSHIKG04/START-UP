import type { ReactNode } from "react";
import type {
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import type { AppTheme } from "../utils/appTheme";

export type IconLabelIconProps = {
  color: string;
  size: number;
};

export type IconLabelProps = Omit<PressableProps, "children"> & {
  icon: ReactNode | ((props: IconLabelIconProps) => ReactNode);
  label: string;
  theme?: AppTheme;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  iconColor?: string;
  iconSize?: number;
  surfaceSize?: number;
  surfaceRadius?: number;
  labelWidth?: number;
  gap?: number;
  iconContainerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  labelNumberOfLines?: number;
};
