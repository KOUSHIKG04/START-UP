import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { colors, fontFamilies, shadows } from "@startup/design-tokens";
import { appThemeColors, type AppTheme } from "../utils/appTheme";

export type CardVariant = "elevated" | "outlined" | "soft" | "plain";
export type CardOrientation = "vertical" | "horizontal";

export type CardProps = Omit<
  PressableProps,
  "children" | "disabled" | "style"
> & {
  children: ReactNode;
  variant?: CardVariant;
  orientation?: CardOrientation;
  theme?: AppTheme;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  gap?: number;
  disabled?: boolean;
  style?: PressableProps["style"];
};

export function Card({
  children,
  variant = "elevated",
  orientation = "vertical",
  theme = "patient",
  backgroundColor,
  borderColor,
  borderWidth,
  borderRadius = 14,
  padding = 16,
  gap = 12,
  disabled = false,
  onPress,
  accessibilityRole,
  accessibilityState,
  style,
  pressRetentionOffset,
  ...props
}: CardProps) {
  const palette = getCardPalette(variant, theme);

  return (
    <Pressable
      {...props}
      accessibilityRole={accessibilityRole ?? (onPress ? "button" : undefined)}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      pressRetentionOffset={pressRetentionOffset ?? (onPress ? 8 : undefined)}
      onPress={onPress}
      style={(state) => [
        styles.card,
        palette,
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        {
          backgroundColor: backgroundColor ?? palette.backgroundColor,
          borderColor: borderColor ?? palette.borderColor,
          borderWidth: borderWidth ?? palette.borderWidth,
          borderRadius,
          padding,
          gap,
        },
        state.pressed && onPress && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export type CardSectionProps = ViewProps & {
  gap?: number;
};

export function CardHeader({
  gap = 12,
  style,
  ...props
}: CardSectionProps) {
  return <View {...props} style={[styles.header, { gap }, style]} />;
}

export function CardContent({
  gap = 12,
  style,
  ...props
}: CardSectionProps) {
  return <View {...props} style={[styles.content, { gap }, style]} />;
}

export function CardFooter({
  gap = 12,
  style,
  ...props
}: CardSectionProps) {
  return <View {...props} style={[styles.footer, { gap }, style]} />;
}

export type CardActionProps = ViewProps;

export function CardAction({ style, ...props }: CardActionProps) {
  return <View {...props} style={[styles.action, style]} />;
}

export type CardTitleProps = TextProps & {
  theme?: AppTheme;
  tone?: "default" | "brand";
};

export function CardTitle({
  theme = "patient",
  tone = "default",
  style,
  ...props
}: CardTitleProps) {
  return (
    <Text
      {...props}
      style={[
        styles.title,
        tone === "brand"
          ? { color: appThemeColors[theme].primaryText }
          : undefined,
        style,
      ]}
    />
  );
}

export type CardDescriptionProps = TextProps;

export function CardDescription({ style, ...props }: CardDescriptionProps) {
  return <Text {...props} style={[styles.description, style]} />;
}

export type CardSeparatorProps = ViewProps & {
  color?: string;
};

export function CardSeparator({
  color = colors.borderDefault,
  style,
  ...props
}: CardSeparatorProps) {
  return (
    <View
      {...props}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.separator, { backgroundColor: color }, style]}
    />
  );
}

function getCardPalette(
  variant: CardVariant,
  theme: AppTheme
): ViewStyle {
  switch (variant) {
    case "outlined":
      return {
        backgroundColor: colors.surface,
        borderColor: colors.borderDefault,
        borderWidth: 1,
        ...shadows.card,
      };
    case "soft":
      return {
        backgroundColor: appThemeColors[theme].soft,
        borderColor: "transparent",
        borderWidth: 0,
      };
    case "plain":
      return {
        backgroundColor: colors.surface,
        borderColor: "transparent",
        borderWidth: 0,
      };
    case "elevated":
    default:
      return {
        backgroundColor: colors.surface,
        borderColor: "transparent",
        borderWidth: 0,
        ...shadows.card,
      };
  }
}

const styles = StyleSheet.create({
  card: {},
  vertical: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  horizontal: {
    flexDirection: "row",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    flexShrink: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  action: {
    marginLeft: "auto",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  description: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  separator: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
});
