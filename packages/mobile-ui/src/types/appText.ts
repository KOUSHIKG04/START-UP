import type { Text, TextProps } from "react-native";
import type { Ref as ReactRef } from "react";
import type { MobileTypographyRole } from "@startup/design-tokens";

export type AppTextProps = TextProps & {
  variant?: MobileTypographyRole | "inherit";
  ref?: ReactRef<Text>;
};
