import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export type TimeSlotProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  time: string;
  disabled?: boolean;
  style?: PressableProps["style"];
  textStyle?: StyleProp<TextStyle>;
};

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
        state.pressed && onPress && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
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
