import { useMobileTheme } from "../theme/MobileThemeProvider";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { appThemeColors, type AppTheme } from "../utils/appTheme";

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "danger";

export type ButtonProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  label?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  theme?: AppTheme;
  disabled?: boolean;
  style?: PressableProps["style"];
  labelStyle?: StyleProp<TextStyle>;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

type ButtonPalette = {
  container: ViewStyle;
  label: TextStyle;
};

export function Button({
  label,
  children,
  variant = "primary",
  theme,
  disabled = false,
  style,
  labelStyle,
  leftIcon,
  rightIcon,
  accessibilityLabel = label,
  accessibilityState,
  ...props
}: ButtonProps) {
  const themeColors = useMobileTheme(theme);
  const palette = getButtonPalette(variant, themeColors);

  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      style={(state) => [
        styles.button,
        palette.container,
        state.pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {children ?? (
        <>
          {leftIcon}
          {label ? (
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                palette.label,
                disabled ? styles.disabledLabel : undefined,
                labelStyle,
              ]}
            >
              {label}
            </Text>
          ) : null}
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

function getButtonPalette(
  variant: ButtonVariant,
  theme: (typeof appThemeColors)[AppTheme]
): ButtonPalette {
  switch (variant) {
    case "secondary":
      return {
        container: { backgroundColor: theme.soft },
        label: { color: theme.primaryText },
      };
    case "outline":
      return {
        container: {
          backgroundColor: "transparent",
          borderColor: theme.border,
          borderWidth: 1,
        },
        label: { color: theme.primaryText },
      };
    case "ghost":
      return {
        container: { backgroundColor: "transparent" },
        label: { color: theme.primaryText },
      };
    case "danger":
      return {
        container: { backgroundColor: theme.danger },
        label: { color: theme.onPrimary },
      };
    case "primary":
    default:
      return {
        container: { backgroundColor: theme.primary },
        label: { color: theme.onPrimary },
      };
  }
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    backgroundColor: colors.disabledBackground,
    borderWidth: 0,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  disabledLabel: {
    color: colors.disabledText,
  },
});
