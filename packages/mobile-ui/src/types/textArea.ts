import type { InputProps } from "./input";

export type TextAreaProps = Omit<
  InputProps,
  "multiline" | "numberOfLines" | "textAlignVertical"
> & {
  numberOfLines?: number;
};
