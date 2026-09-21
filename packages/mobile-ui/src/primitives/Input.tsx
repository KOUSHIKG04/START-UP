import { useMobileTheme } from "../theme/MobileThemeProvider";
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
  label?: string;
  error?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
};

export function Input({
  label,
  error,
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
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.text }, labelStyle]}>
          {label}
        </Text>
      ) : null}

      <TextInput
        {...props}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ ...accessibilityState, disabled }}
        editable={!disabled && editable}
        placeholderTextColor={placeholderTextColor ?? theme.placeholder}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            color: theme.text,
            borderColor: theme.border,
          },
          error ? styles.inputError : undefined,
          disabled ? styles.inputDisabled : undefined,
          style,
        ]}
      />

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
