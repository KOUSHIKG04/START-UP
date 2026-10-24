import { styles } from "./OnboardingShell.styles";
import type { OnboardingButtonProps } from "../types/onboarding-button";
import { Text } from "react-native";
import { Button } from "@startup/mobile-ui";

export function OnboardingButton({
  label,
  onPress,
  variant = "solid",
  disabled = false,
  loading = false,
}: OnboardingButtonProps) {
  return (
    <Button
      label={label}
      theme="doctor"
      variant={variant === "outline" ? "outline" : "primary"}
      loading={loading}
      disabled={disabled}
      onPress={onPress}
      labelStyle={[
        styles.buttonText,
        variant === "outline" && styles.outlineText,
      ]}
      rightIcon={
        <Text
          style={[
            styles.buttonText,
            variant === "outline" && styles.outlineText,
          ]}
        >
          ›
        </Text>
      }
      style={({ pressed }) => [
        styles.button,
        variant === "outline" && styles.outline,
        (pressed || disabled) && styles.dim,
      ]}
    />
  );
}
