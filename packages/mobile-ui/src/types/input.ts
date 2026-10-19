import type { Ref } from "react";
import type {
  TextInput,
  StyleProp,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from "react-native";

export type InputProps = TextInputProps & {
  ref?: Ref<TextInput>;
  /** Preserve embedded/search/OTP styling without adding a form-field wrapper. */
  variant?: "outlined" | "unstyled";
  label?: string;
  /** Non-editable leading text, such as a phone country code. */
  prefix?: string;
  error?: string;
  /** Show an error outline while messages are handled by a toast. */
  invalid?: boolean;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
};
