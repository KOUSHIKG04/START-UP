import type { StyleProp, TextStyle, ViewProps, ViewStyle } from "react-native";

export type StatusBadgeProps = ViewProps & {
  status: string;
  dotColor?: string;
  backgroundColor?: string;
  textStyle?: StyleProp<TextStyle>;
  dotStyle?: StyleProp<ViewStyle>;
};
