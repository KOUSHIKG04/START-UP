import { useMobileTheme } from "../theme/MobileThemeProvider";
import { useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
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
  loading?: boolean;
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
  loading = false,
  style,
  labelStyle,
  leftIcon,
  rightIcon,
  accessibilityLabel = label,
  accessibilityState,
  onLayout,
  ...props
}: ButtonProps) {
  const themeColors = useMobileTheme(theme);
  const palette = getButtonPalette(variant, themeColors);
  const idleSize = useRef<{ width: number; height: number } | null>(null);

  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        disabled: disabled || loading,
        busy: loading || accessibilityState?.busy,
      }}
      disabled={disabled || loading}
      onLayout={(event) => {
        if (!loading) {
          const { width, height } = event.nativeEvent.layout;
          idleSize.current = { width, height };
        }
        onLayout?.(event);
      }}
      style={(state) => {
        const callerStyle = typeof style === "function" ? style(state) : style;
        const layout = StyleSheet.flatten(callerStyle);
        const widthControlled = layout?.width !== undefined ||
          (typeof layout?.flex === "number" && layout.flex > 0) ||
          (typeof layout?.flexGrow === "number" && layout.flexGrow > 0);
        return [
        styles.button,
        palette.container,
        state.pressed && !disabled && !loading ? styles.pressed : undefined,
        disabled && !loading ? styles.disabled : undefined,
        loading && idleSize.current
          ? { minWidth: widthControlled ? undefined : idleSize.current.width, minHeight: idleSize.current.height }
          : undefined,
        callerStyle,
      ];
      }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={StyleSheet.flatten(labelStyle)?.color ?? palette.label.color}
        />
      ) : children ?? (
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
