import type { PressableProps, StyleProp, TextStyle } from "react-native";
import type { AppTheme } from "../utils/appTheme";

export type ChipVariant = "default" | "radio";

export type ChipProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  theme?: AppTheme;
  radioPosition?: "left" | "right";
  disabled?: boolean;
  style?: PressableProps["style"];
  labelStyle?: StyleProp<TextStyle>;
};
