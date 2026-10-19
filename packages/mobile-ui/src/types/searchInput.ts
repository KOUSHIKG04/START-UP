import type { ReactNode } from "react";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";

export type SearchInputProps = Omit<TextInputProps, "style"> & {
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps["style"];
  iconColor?: string;
  iconSize?: number;
  showIcon?: boolean;
  rightAccessory?: ReactNode;
};
