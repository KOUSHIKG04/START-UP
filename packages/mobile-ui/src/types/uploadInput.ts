import type {
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

export type UploadInputProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  label?: string;
  value?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  style?: PressableProps["style"];
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};
