import {
  Text,
  TextInput,
  type TextProps,
  type TextInputProps,
} from "react-native";
import type { Ref as ReactRef } from "react";
import {
  mobileTypography,
  type MobileTypographyRole,
} from "@startup/design-tokens";
import { useReadableTypography } from "../theme/MobileTypographyProvider";

export type AppTextProps = TextProps & {
  variant?: MobileTypographyRole | "inherit";
  ref?: ReactRef<Text>;
};
export function AppText({ variant = "body", style, ...props }: AppTextProps) {
  const readable = useReadableTypography();
  return (
    <Text
      {...props}
      style={[
        style,
        readable && variant !== "inherit"
          ? mobileTypography[variant]
          : undefined,
      ]}
    />
  );
}

/** Retains native input refs and keyboard behavior; only typography changes. */
export function AppTextInput({
  ref,
  style,
  ...props
}: TextInputProps & { ref?: ReactRef<TextInput> }) {
  const readable = useReadableTypography();
  return (
    <TextInput
      {...props}
      ref={ref}
      style={[style, readable ? mobileTypography.body : undefined]}
    />
  );
}
