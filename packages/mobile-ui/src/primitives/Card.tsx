import { useMobileTheme } from "../theme/MobileThemeProvider";
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
import { type AppTheme } from "../utils/appTheme";

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

export type CardSectionProps = ViewProps & {
  gap?: number;
};

export function CardHeader({ gap = 12, style, ...props }: CardSectionProps) {
  return <View {...props} style={[styles.header, { gap }, style]} />;
}

export function CardContent({ gap = 12, style, ...props }: CardSectionProps) {
  return <View {...props} style={[styles.content, { gap }, style]} />;
}

export function CardFooter({ gap = 12, style, ...props }: CardSectionProps) {
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
  theme,
  tone = "default",
  style,
  ...props
}: CardTitleProps) {
  const themeColors = useMobileTheme(theme);
  return (
    <Text
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

export type CardDescriptionProps = TextProps;

export function CardDescription({ style, ...props }: CardDescriptionProps) {
  const theme = useMobileTheme();
  return (
    <Text
      {...props}
      style={[styles.description, { color: theme.textMuted }, style]}
    />
  );
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
  theme: ReturnType<typeof useMobileTheme>
): ViewStyle {
  switch (variant) {
    case "outlined":
      return {
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        ...shadows.card,
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
