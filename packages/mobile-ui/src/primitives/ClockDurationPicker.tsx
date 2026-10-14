import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { Clock3 } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";
import { AppText as Text } from "./AppText";
import { Button } from "./Button";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import type { AppTheme } from "../utils/appTheme";

export type ClockDurationPickerProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
  theme?: AppTheme;
};

export function ClockDurationPicker({
  label,
  value,
  min,
  max,
  onChange,
  disabled = false,
  theme,
}: ClockDurationPickerProps) {
  const colors = useMobileTheme(theme);
  const { width } = useWindowDimensions();
  const size = Math.min(260, width - 80);
  const center = size / 2;
  const radius = center - 32;
  const tickStep = max > 60 ? 10 : 5;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const valid = (minutes: number) => Math.max(min, Math.min(max, minutes));
  const angle = ((selected % max) / max) * Math.PI * 2;
  const tipX = center + Math.sin(angle) * radius;
  const tipY = center - Math.cos(angle) * radius;

  function choosePoint(x: number, y: number) {
    if (Math.hypot(x - center, y - center) < 24) return;
    const turn = (Math.atan2(x - center, center - y) + Math.PI * 2) % (Math.PI * 2);
    const minutes = Math.round((turn / (Math.PI * 2)) * max) || max;
    setSelected(valid(minutes));
  }

  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <Text variant="inherit" style={{ fontSize: 13, lineHeight: 20, includeFontPadding: false, fontFamily: fontFamilies.regular, color: colors.text }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value} minutes`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => { setSelected(valid(value)); setOpen(true); }}
        style={[styles.field, { borderColor: colors.border }, disabled && { opacity: 0.5 }]}
      >
        <Text variant="inherit" style={{ flex: 1, fontFamily: fontFamilies.regular, fontSize: 14, color: colors.text }}>
          {value} minutes
        </Text>
        <Clock3 size={18} color={colors.primary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.dialog, { backgroundColor: colors.surface }]} accessibilityViewIsModal onAccessibilityEscape={() => setOpen(false)}>
              <Text variant="inherit" accessibilityRole="header" style={{ fontSize: 18, fontFamily: fontFamilies.medium, color: colors.text }}>
                {label}
              </Text>
              <Text variant="inherit" style={{ textAlign: "center", fontSize: 32, fontFamily: fontFamilies.regular, color: colors.primary }}>
                {selected} min
              </Text>
              <View
                style={[styles.dial, { width: size, height: size, borderRadius: center, backgroundColor: colors.soft }]}
                accessibilityRole="adjustable"
                accessibilityLabel={`${label} in minutes`}
                accessibilityValue={{ min, max, now: selected, text: `${selected} minutes` }}
                accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
                onAccessibilityAction={(event) => setSelected(current => valid(current + (event.nativeEvent.actionName === "increment" ? 5 : -5)))}
                onStartShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={(event) => choosePoint(event.nativeEvent.locationX, event.nativeEvent.locationY)}
                onResponderMove={(event) => choosePoint(event.nativeEvent.locationX, event.nativeEvent.locationY)}
              >
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <Svg width={size} height={size}>
                    <Line x1={center} y1={center} x2={tipX} y2={tipY} stroke={colors.primary} strokeWidth={2} />
                    <Circle cx={center} cy={center} r={4} fill={colors.primary} />
                    <Circle cx={tipX} cy={tipY} r={22} fill={colors.primary} />
                    {Array.from({ length: Math.ceil(max / tickStep) }, (_, index) => {
                      const tick = index === 0 ? max : index * tickStep;
                      if (tick < min) return null;
                      const tickAngle = (tick / max) * Math.PI * 2;
                      const x = center + Math.sin(tickAngle) * radius;
                      const y = center - Math.cos(tickAngle) * radius;
                      if (Math.hypot(x - tipX, y - tipY) < 36) return null;
                      return <SvgText key={index} x={x} y={y} textAnchor="middle" alignmentBaseline="central"
                        fontFamily={fontFamilies.regular} fontSize={index === 0 ? 15 : 16} fill={colors.text}>{tick}</SvgText>;
                    })}
                    <SvgText x={tipX} y={tipY} textAnchor="middle" alignmentBaseline="central"
                      fontFamily={fontFamilies.regular} fontSize={selected >= 100 ? 14 : 17} fill={colors.onPrimary}>{selected}</SvgText>
                  </Svg>
                </View>
              </View>
              <Text variant="inherit" style={{ textAlign: "center", fontSize: 12, fontFamily: fontFamilies.regular, color: colors.textMuted }}>
                Choose {min}–{max} minutes on the clock
              </Text>
              <View style={styles.row}>
                <Button theme={theme} variant="outline" label="−5 min" style={styles.flex} onPress={() => setSelected(current => valid(current - 5))} disabled={selected <= min} />
                <Button theme={theme} variant="outline" label="+5 min" style={styles.flex} onPress={() => setSelected(current => valid(current + 5))} disabled={selected >= max} />
              </View>
              <View style={styles.row}>
                <Button theme={theme} variant="outline" label="Cancel" style={styles.flex} onPress={() => setOpen(false)} />
                <Button theme={theme} label="Set duration" style={styles.flex} onPress={() => { onChange(selected); setOpen(false); }} />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  field: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  overlay: { flex: 1, backgroundColor: "#00000066" },
  modalScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 20, gap: 16 },
  dial: { alignSelf: "center" },
});
