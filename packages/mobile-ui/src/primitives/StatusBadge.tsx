import { AppText as Text } from "./AppText";
import { StyleSheet, View } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import type { StatusBadgeProps } from "../types/statusBadge";
export type { StatusBadgeProps } from "../types/statusBadge";

export function StatusBadge({
  status,
  dotColor = colors.success,
  backgroundColor = colors.successSoft,
  textStyle,
  dotStyle,
  style,
  accessibilityLabel = status,
  ...props
}: StatusBadgeProps) {
  return (
    <View
      {...props}
      accessibilityLabel={accessibilityLabel}
      style={[styles.badge, { backgroundColor }, style]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }, dotStyle]} />
      <Text variant="label" numberOfLines={1} style={[styles.text, textStyle]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    color: colors.textPrimary,
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 13,
  },
});
