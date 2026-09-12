import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { colors } from "@startup/design-tokens";

export type ChipProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  label: string;
  disabled?: boolean;
  style?: PressableProps["style"];
  labelStyle?: StyleProp<TextStyle>;
};

export function Chip({
  label,
  disabled = false,
  style,
  labelStyle,
  accessibilityLabel = label,
  accessibilityRole,
  accessibilityState,
  onPress,
  ...props
}: ChipProps) {
  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? (onPress ? "button" : undefined)}
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={(state) => [
        styles.chip,
        state.pressed && onPress && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text numberOfLines={1} style={[styles.label, labelStyle]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
