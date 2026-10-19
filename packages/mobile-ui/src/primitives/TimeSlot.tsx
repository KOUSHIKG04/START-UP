import { AppText as Text } from "./AppText";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { Pressable, StyleSheet } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import type { TimeSlotProps } from "../types/timeSlot";
export type { TimeSlotProps } from "../types/timeSlot";

export function TimeSlot({
  time,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel = time,
  accessibilityRole,
  accessibilityState,
  onPress,
  ...props
}: TimeSlotProps) {
  const theme = useMobileTheme();
  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? (onPress ? "button" : undefined)}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={(state) => [
        styles.slot,
        { backgroundColor: theme.surface, borderColor: theme.border },
        state.pressed && onPress && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text
        variant="label"
        numberOfLines={1}
        style={[
          styles.text,
          { color: theme.text },
          disabled ? styles.disabledText : undefined,
          textStyle,
        ]}
      >
        {time}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  text: {
    color: colors.textPrimary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    backgroundColor: colors.disabledBackground,
    borderWidth: 0,
  },
  disabledText: {
    color: colors.disabledText,
  },
});
