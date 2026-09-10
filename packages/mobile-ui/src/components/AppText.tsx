import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, typography } from "@startup/design-tokens";
import { cn } from "cn";

export type AppTextProps = TextProps & {
  variant?: "title" | "heading" | "body" | "caption";
  className?: string;
};

export function AppText({
  variant = "body",
  style,
  className,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      {...(className ? { className: cn(className) } : {})}
      style={[styles.base, styles[variant], style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
  title: typography.title,
  heading: typography.heading,
  body: typography.body,
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
