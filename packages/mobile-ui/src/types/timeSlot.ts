import type { PressableProps, StyleProp, TextStyle } from "react-native";

export type TimeSlotProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  time: string;
  disabled?: boolean;
  style?: PressableProps["style"];
  textStyle?: StyleProp<TextStyle>;
};
