import { AppText as Text } from "./AppText";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, fontFamilies, surfaces } from "@startup/design-tokens";
import type {
  CardVariant,
  CardOrientation,
  CardProps,
  CardSectionProps,
  CardActionProps,
  CardTitleProps,
  CardDescriptionProps,
  CardSeparatorProps,
} from "../types/card";

export type {
  CardVariant,
  CardOrientation,
  CardProps,
  CardSectionProps,
  CardActionProps,
  CardTitleProps,
  CardDescriptionProps,
  CardSeparatorProps,
} from "../types/card";

export function Card({
  children,
  variant = "elevated",
  orientation = "vertical",
  theme,
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
  const themeColors = useMobileTheme(theme);
  const palette = getCardPalette(variant, themeColors);

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

export function CardHeader({ gap = 12, style, ...props }: CardSectionProps) {
  return <View {...props} style={[styles.header, { gap }, style]} />;
}

export function CardContent({ gap = 12, style, ...props }: CardSectionProps) {
  return <View {...props} style={[styles.content, { gap }, style]} />;
}

export function CardFooter({ gap = 12, style, ...props }: CardSectionProps) {
  return <View {...props} style={[styles.footer, { gap }, style]} />;
}

export function CardAction({ style, ...props }: CardActionProps) {
  return <View {...props} style={[styles.action, style]} />;
}

export function CardTitle({
  theme,
  tone = "default",
  style,
  ...props
}: CardTitleProps) {
  const themeColors = useMobileTheme(theme);
  return (
    <Text
      variant="cardHeading"
      {...props}
      style={[
        styles.title,
        { color: themeColors.text },
        tone === "brand" ? { color: themeColors.primaryText } : undefined,
        style,
      ]}
    />
  );
}

export function CardDescription({ style, ...props }: CardDescriptionProps) {
  const theme = useMobileTheme();
  return (
    <Text
      variant="body"
      {...props}
      style={[styles.description, { color: theme.textMuted }, style]}
    />
  );
}

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
  theme: ReturnType<typeof useMobileTheme>
): ViewStyle {
  switch (variant) {
    case "outlined":
      return {
        backgroundColor: theme.surface,
        ...surfaces.card,
      };
    case "soft":
      return {
        backgroundColor: theme.soft,
        borderColor: "transparent",
        borderWidth: 0,
      };
    case "plain":
      return {
        backgroundColor: theme.surface,
        borderColor: "transparent",
        borderWidth: 0,
      };
    case "elevated":
    default:
      return {
        backgroundColor: theme.surface,
        ...surfaces.card,
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
    color: colors.ui.cardDescription,
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
