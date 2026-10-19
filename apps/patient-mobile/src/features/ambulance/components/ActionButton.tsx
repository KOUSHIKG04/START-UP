import type { ActionButtonProps } from "../types/ambulance-booking-form";
import { AppText as Text } from "@startup/mobile-ui";
import { Pressable, StyleSheet } from "react-native";
import { fontFamilies } from "@startup/design-tokens";

export function ActionButton({
  label,
  onPress,
  style,
  disabled = false,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        style,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text variant="button" style={styles.actionText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72 },
  actionButton: {
    height: 51,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#087F78",
  },
  actionText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.bold,
    fontSize: 15,
  },
});
