import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import {
  appThemeColors,
  type AppTheme,
} from "../utils/appTheme";

export type ChipVariant = "default" | "radio";

export type ChipProps = Omit<
  PressableProps,
  "children" | "style" | "disabled"
> & {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  theme?: AppTheme;
  radioPosition?: "left" | "right";
  disabled?: boolean;
  style?: PressableProps["style"];
  labelStyle?: StyleProp<TextStyle>;
};

export function Chip({
  label,
  variant = "default",
  selected = false,
  theme = "patient",
  radioPosition = "left",
  disabled = false,
  style,
  labelStyle,
  accessibilityLabel = label,
  accessibilityRole,
  accessibilityState,
  onPress,
  ...props
}: ChipProps) {
  const themeColors = appThemeColors[theme];
  const isRadio = variant === "radio";

  const renderRadioIndicator = () => (
    <View
      style={[
        styles.radioOuter,
        selected ? styles.radioOuterSelected : styles.radioOuterUnselected,
        disabled && styles.disabledRadio,
      ]}
    >
      {selected ? (
        <View
          style={[
            styles.radioInner,
            styles.radioInnerSelected,
            disabled && styles.disabledRadioInner,
          ]}
        />
      ) : null}
    </View>
  );

  return (
    <Pressable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={
        accessibilityRole ?? (isRadio ? "radio" : onPress ? "button" : undefined)
      }
      accessibilityState={{
        ...accessibilityState,
        disabled,
        selected: selected ?? accessibilityState?.selected,
      }}
      disabled={disabled}
      onPress={onPress}
      style={(state) => [
        styles.chip,
        isRadio && styles.radioChip,
        isRadio && (selected ? styles.radioChipSelected : styles.radioChipUnselected),
        state.pressed && onPress && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {isRadio && radioPosition === "left" && renderRadioIndicator()}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          isRadio && (selected ? styles.radioLabelSelected : styles.radioLabelUnselected),
          labelStyle,
        ]}
      >
        {label}
      </Text>
      {isRadio && radioPosition === "right" && renderRadioIndicator()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 999,
    backgroundColor: colors.white,
    gap: 8,
  },
  radioChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    minHeight: 34,
    borderWidth: 1,
  },
  radioChipUnselected: {
    backgroundColor: colors.white,
    borderColor: colors.borderDefault,
  },
  radioChipSelected: {
    backgroundColor: colors.patient.primaryDark,
    borderColor: colors.patient.primaryDark,
  },
  radioLabelUnselected: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
  },
  radioLabelSelected: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  radioOuterUnselected: {
    borderColor: colors.borderDefault,
  },
  radioOuterSelected: {
    borderColor: colors.white,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radioInnerSelected: {
    backgroundColor: colors.white,
  },
  disabledRadio: {
    borderColor: colors.disabledText,
    opacity: 0.6,
  },
  disabledRadioInner: {
    backgroundColor: colors.disabledText,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
