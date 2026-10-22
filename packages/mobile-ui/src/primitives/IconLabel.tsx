import { AppText as Text } from "./AppText";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, fontFamilies, surfaces } from "@startup/design-tokens";
import type { IconLabelIconProps, IconLabelProps } from "../types/iconLabel";
export type { IconLabelIconProps, IconLabelProps } from "../types/iconLabel";

export function IconLabel({
  icon,
  label,
  theme,
  backgroundColor,
  borderColor = surfaces.card.borderColor,
  borderWidth = surfaces.card.borderWidth,
  iconColor,
  iconSize = 28,
  surfaceSize = 56,
  surfaceRadius = 16,
  labelWidth = 94,
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
  const themeColors = useMobileTheme(theme);
  const resolvedBackgroundColor = backgroundColor ?? themeColors.soft;
  const resolvedIconColor = iconColor ?? themeColors.primary;
  const renderedIcon =
    typeof icon === "function"
      ? icon({ color: resolvedIconColor, size: iconSize })
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
        disabled ? styles.disabled : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.iconSurface,
              {
                width: surfaceSize,
                height: surfaceSize,
                borderRadius: surfaceRadius,
                backgroundColor: resolvedBackgroundColor,
                borderColor,
                borderWidth,
              },
              iconContainerStyle,
              pressed && onPress ? styles.pressedSurface : undefined,
            ]}
          >
            <View style={{ width: iconSize, height: iconSize }}>
              {renderedIcon}
            </View>
          </View>

          <Text
            variant="label"
            numberOfLines={labelNumberOfLines}
            style={[
              styles.label,
              { width: labelWidth, color: themeColors.primaryText },
              labelStyle,
              pressed && onPress ? styles.pressedLabel : undefined,
            ]}
          >
            {label}
          </Text>
        </>
      )}
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
    ...surfaces.card,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 15,
    textAlign: "center",
  },
  pressedSurface: {
    opacity: 0.62,
    transform: [{ scale: 0.95 }],
  },
  pressedLabel: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
  },
});
