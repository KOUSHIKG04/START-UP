import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors } from "@startup/design-tokens";

export type IconLabelIconProps = {
  color: string;
  size: number;
};

export type IconLabelProps = Omit<PressableProps, "children"> & {
  icon: ReactNode | ((props: IconLabelIconProps) => ReactNode);
  label: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  iconColor?: string;
  iconSize?: number;
  surfaceSize?: number;
  labelWidth?: number;
  gap?: number;
  iconContainerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  labelNumberOfLines?: number;
};

export function IconLabel({
  icon,
  label,
  backgroundColor = colors.patient.surface,
  borderColor = colors.patient.surfaceBorder,
  borderWidth = 1,
  iconColor = colors.patient.primary,
  iconSize = 28,
  surfaceSize = 56,
  labelWidth = 74,
  gap = 8,
  iconContainerStyle,
  labelStyle,
  labelNumberOfLines = 2,
  accessibilityLabel = label,
  accessibilityRole,
  disabled,
  onPress,
  style,
  ...props
}: IconLabelProps) {
  const renderedIcon =
    typeof icon === "function"
      ? icon({ color: iconColor, size: iconSize })
      : icon;

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? (onPress ? "button" : undefined)}
      style={(state) => [
        styles.container,
        { gap },
        state.pressed && onPress ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <View
        style={[
          styles.iconSurface,
          {
            width: surfaceSize,
            height: surfaceSize,
            borderRadius: surfaceSize / 2,
            backgroundColor,
            borderColor,
            borderWidth,
          },
          iconContainerStyle,
        ]}
      >
        <View style={{ width: iconSize, height: iconSize }}>
          {renderedIcon}
        </View>
      </View>

      <Text
        numberOfLines={labelNumberOfLines}
        style={[styles.label, { width: labelWidth }, labelStyle]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  iconSurface: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: colors.patient.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 13,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
