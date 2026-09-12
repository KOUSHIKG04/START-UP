import { StyleSheet } from "react-native";
import { Input, type InputProps } from "./Input";

export type TextAreaProps = Omit<
  InputProps,
  "multiline" | "numberOfLines" | "textAlignVertical"
> & {
  numberOfLines?: number;
};

export function TextArea({ numberOfLines = 5, style, ...props }: TextAreaProps) {
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
