import { useMobileTheme } from "../theme/MobileThemeProvider";
import type { Ref } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export type InputProps = TextInputProps & {
  ref?: Ref<TextInput>;
  /** Preserve embedded/search/OTP styling without adding a form-field wrapper. */
  variant?: "outlined" | "unstyled";
  label?: string;
  error?: string;
  /** Show an error outline while messages are handled by a toast. */
  invalid?: boolean;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
};

export function Input({
  ref,
  variant = "outlined",
  label,
  error,
  invalid = false,
  disabled = false,
  editable = true,
  containerStyle,
  labelStyle,
  errorStyle,
  style,
  placeholderTextColor,
  accessibilityState,
  accessibilityLabel = label,
  ...props
}: InputProps) {
  const theme = useMobileTheme();
  const input = (
    <TextInput
      {...props}
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled }}
      editable={!disabled && editable}
      placeholderTextColor={placeholderTextColor ?? (variant === "outlined" ? theme.placeholder : undefined)}
      style={[
        variant === "outlined" ? styles.input : undefined,
        variant === "outlined" ? {
          backgroundColor: theme.surface,
          color: theme.text,
          borderColor: theme.border,
        } : undefined,
        disabled ? styles.inputDisabled : undefined,
        style,
        error || invalid ? styles.inputError : undefined,
      ]}
    />
  );
  // A chat composer, search row or hidden OTP field must remain in its parent's
  // layout; labels and form containers are added only when actually requested.
  if (variant === "unstyled" && !label && !error) return input;
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.text }, labelStyle]}>
          {label}
        </Text>
      ) : null}

      {input}

      {error ? <Text style={[styles.error, errorStyle]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 4,
    color: colors.textPrimary,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  container: {
    width: "100%",
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 10,
    backgroundColor: colors.white,
    color: colors.textPrimary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    backgroundColor: colors.disabledBackground,
    color: colors.disabledText,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
});
