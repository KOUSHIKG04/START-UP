import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors } from "@startup/design-tokens";
import {
  appThemeColors,
  type AppTheme,
} from "../utils/appTheme";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  label: string;
  variant?: ButtonVariant;
  theme?: AppTheme;
  disabled?: boolean;
  style?: PressableProps["style"];
  labelStyle?: StyleProp<TextStyle>;
};

type ButtonPalette = {
  container: ViewStyle;
  label: TextStyle;
};

export function Button({
  label,
  variant = "primary",
  theme = "patient",
  disabled = false,
  style,
  labelStyle,
  accessibilityLabel = label,
  accessibilityState,
  ...props
}: ButtonProps) {
  const themeColors = appThemeColors[theme];
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
          borderColor: colors.borderDefault,
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
        container: { backgroundColor: colors.danger },
        label: { color: colors.white },
      };
    case "primary":
    default:
      return {
        container: { backgroundColor: theme.primary },
        label: { color: colors.white },
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
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  disabledLabel: {
    color: colors.disabledText,
  },
});
