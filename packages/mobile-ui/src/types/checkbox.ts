import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { AppTheme } from "../utils/appTheme";

export type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  theme?: AppTheme;
  labelStyle?: StyleProp<TextStyle>;
};
