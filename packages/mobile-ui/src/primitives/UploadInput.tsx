import { useMobileTheme } from "../theme/MobileThemeProvider";
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
import { Upload } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export type UploadInputProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  label?: string;
  value?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  style?: PressableProps["style"];
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function UploadInput({
  label,
  value,
  placeholder = "Upload file",
  error,
  disabled = false,
  style,
  containerStyle,
  labelStyle,
  accessibilityLabel = label ?? placeholder,
  accessibilityState,
  ...props
}: UploadInputProps) {
  const theme = useMobileTheme();
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

      <Pressable
        {...props}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ ...accessibilityState, disabled }}
        disabled={disabled}
        style={(state) => [
          styles.input,
          { backgroundColor: theme.surface, borderColor: theme.border },
          error ? styles.inputError : undefined,
          disabled ? styles.disabled : undefined,
          state.pressed && !disabled ? styles.pressed : undefined,
          typeof style === "function" ? style(state) : style,
        ]}
      >
        <Upload color={theme.primary} size={20} strokeWidth={2} />
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            { color: theme.text },
            !value ? styles.placeholder : undefined,
          ]}
        >
          {value || placeholder}
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    color: colors.textPrimary,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  input: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.danger,
  },
  value: {
    minWidth: 0,
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  placeholder: {
    color: colors.patient.muted,
  },
  disabled: {
    backgroundColor: colors.disabledBackground,
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
});
