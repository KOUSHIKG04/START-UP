import type { ReactNode } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { AppTheme } from "../utils/appTheme";

export type DropdownOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type DropdownProps = {
  options: readonly DropdownOption[];
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  triggerLabel?: string;
  prefix?: string;
  theme?: AppTheme;
  disabled?: boolean;
  error?: string;
  maxVisibleOptions?: number;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  chevronSize?: number;
  chevronColor?: string;
  menuWidth?: number;
  menuStyle?: StyleProp<ViewStyle>;
  backdropColor?: string;
  selectedOptionBackgroundColor?: string;
};

export type TriggerPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};
