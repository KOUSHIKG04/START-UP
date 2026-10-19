import { StyleSheet } from "react-native";
import { Input } from "./Input";
import type { TextAreaProps } from "../types/textArea";
export type { TextAreaProps } from "../types/textArea";

export function TextArea({
  numberOfLines = 5,
  style,
  ...props
}: TextAreaProps) {
  return (
    <Input
      {...props}
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      style={[styles.input, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    paddingTop: 14,
    paddingBottom: 14,
  },
});
