import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Check } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import type { AppTheme } from "../utils/appTheme";

export type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  theme?: AppTheme;
  labelStyle?: StyleProp<TextStyle>;
};

export function Checkbox({ checked, onCheckedChange, label, disabled = false, style, theme, labelStyle }: CheckboxProps) {
  const themeColors = useMobileTheme(theme);
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label}
      accessibilityState={{ checked, disabled }} disabled={disabled}
      onPress={() => onCheckedChange(!checked)} style={[styles.row, disabled && styles.disabled, style]}>
      <View style={[styles.box, { borderColor: themeColors.primary }, checked && { backgroundColor: themeColors.primary }]}>
        {checked ? <Check size={16} strokeWidth={3} color={colors.white} /> : null}
      </View>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: colors.textSecondary },
  disabled: { opacity: 0.5 },
});
