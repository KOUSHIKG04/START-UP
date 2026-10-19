import { display, pad } from "../utils/clockTime";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
import { Clock3 } from "lucide-react-native";
import { Button } from "./Button";
import { AppText as Text } from "./AppText";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { fontFamilies } from "@startup/design-tokens";
import type { ClockTimePickerProps } from "../types/clockTimePicker";

export type { ClockTimePickerProps } from "../types/clockTimePicker";

const size = 260;

const center = size / 2;

export function ClockTimePicker({
  label,
  value,
  onChange,
  disabled = false,
  endOfDay = false,
  theme,
}: ClockTimePickerProps) {
  const colors = useMobileTheme(theme);
  const { width } = useWindowDimensions();
  const size = Math.min(260, width - 80);
  const center = size / 2;
  const radius = center - 32;
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [part, setPart] = useState<"hour" | "minute">("hour");
  const selected = part === "hour" ? hour % 12 : minute / 5;
  const angle = (selected * Math.PI) / 6;
  const tipX = center + Math.sin(angle) * radius;
  const tipY = center - Math.cos(angle) * radius;
  const close = () => setOpen(false);
  function choosePoint(x: number, y: number) {
    if (Math.hypot(x - center, y - center) < 24) return;
    const turn =
      (Math.atan2(x - center, center - y) + Math.PI * 2) % (Math.PI * 2);
    if (part === "hour")
      setHour(Math.round((turn * 12) / (Math.PI * 2)) % 12 || 12);
    else setMinute(Math.round((turn * 60) / (Math.PI * 2)) % 60);
  }
  function adjust(delta: number) {
    if (part === "hour")
      setHour((current) => ((current - 1 + delta + 12) % 12) + 1);
    else setMinute((current) => (current + delta + 60) % 60);
  }
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <Text
        variant="inherit"
        style={{
          fontSize: 13,
          fontFamily: fontFamilies.regular,
          color: colors.text,
        }}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display(value)}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          const [h, m] = (value || "09:00").split(":").map(Number);
          setHour(h % 12 || 12);
          setMinute(m);
          setPeriod(h >= 12 && h < 24 ? "PM" : "AM");
          setPart("hour");
          setOpen(true);
        }}
        style={[
          styles.field,
          { borderColor: colors.border },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Text
          variant="inherit"
          style={{
            flex: 1,
            fontFamily: fontFamilies.regular,
            fontSize: 14,
            color: colors.text,
          }}
        >
          {display(value)}
        </Text>
        <Clock3 size={18} color={colors.primary} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[styles.dialog, { backgroundColor: colors.surface }]}
              accessibilityViewIsModal
              onAccessibilityEscape={close}
            >
              <Text
                variant="inherit"
                accessibilityRole="header"
                style={{
                  fontSize: 18,
                  fontFamily: fontFamilies.medium,
                  color: colors.text,
                }}
              >
                {label}
              </Text>
              <View style={{ ...styles.row, justifyContent: "center" }}>
                {(["hour", "minute"] as const).map((item, i) => (
                  <View key={item} style={styles.row}>
                    {i === 1 ? (
                      <Text variant="inherit" style={styles.number}>
                        :
                      </Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${item}`}
                      accessibilityState={{ selected: part === item }}
                      onPress={() => setPart(item)}
                      style={[
                        styles.digit,
                        part === item && { backgroundColor: colors.soft },
                      ]}
                    >
                      <Text
                        variant="inherit"
                        style={[
                          styles.number,
                          {
                            color: part === item ? colors.primary : colors.text,
                          },
                        ]}
                      >
                        {pad(item === "hour" ? hour : minute)}
                      </Text>
                    </Pressable>
                  </View>
                ))}
                <View style={{ gap: 4 }}>
                  {(["AM", "PM"] as const).map((item) => (
                    <Pressable
                      key={item}
                      accessibilityRole="radio"
                      accessibilityLabel={item}
                      accessibilityState={{ checked: period === item }}
                      onPress={() => setPeriod(item)}
                      style={[
                        styles.period,
                        { borderColor: colors.border },
                        period === item && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        variant="inherit"
                        style={{
                          fontFamily: fontFamilies.regular,
                          fontSize: 14,
                          color: period === item ? colors.surface : colors.text,
                        }}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View
                style={[
                  styles.dial,
                  {
                    width: size,
                    height: size,
                    borderRadius: center,
                    backgroundColor: colors.soft,
                  },
                ]}
                accessibilityRole="adjustable"
                accessibilityLabel={`Select ${part}`}
                accessibilityValue={{
                  min: part === "hour" ? 1 : 0,
                  max: part === "hour" ? 12 : 59,
                  now: part === "hour" ? hour : minute,
                  text:
                    part === "hour" ? `${hour} ${period}` : `${minute} minutes`,
                }}
                accessibilityActions={[
                  { name: "increment" },
                  { name: "decrement" },
                ]}
                onAccessibilityAction={(e) =>
                  adjust(e.nativeEvent.actionName === "increment" ? 1 : -1)
                }
                onStartShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={(e) =>
                  choosePoint(e.nativeEvent.locationX, e.nativeEvent.locationY)
                }
                onResponderMove={(e) =>
                  choosePoint(e.nativeEvent.locationX, e.nativeEvent.locationY)
                }
                onResponderRelease={() => {
                  if (part === "hour") setPart("minute");
                }}
              >
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <Svg width={size} height={size}>
                    <Line
                      x1={center}
                      y1={center}
                      x2={tipX}
                      y2={tipY}
                      stroke={colors.primary}
                      strokeWidth={2}
                    />
                    <Circle
                      cx={center}
                      cy={center}
                      r={4}
                      fill={colors.primary}
                    />
                    <Circle cx={tipX} cy={tipY} r={22} fill={colors.primary} />
                    {Array.from({ length: 12 }, (_, i) => {
                      const a = (i * Math.PI) / 6;
                      const pointX = center + Math.sin(a) * radius;
                      const pointY = center - Math.cos(a) * radius;
                      // The selected value is rendered inside the indicator below.
                      // Suppress nearby tick labels so precise minutes do not overlap it.
                      if (Math.hypot(pointX - tipX, pointY - tipY) < 36)
                        return null;
                      return (
                        <SvgText
                          key={i}
                          x={pointX}
                          y={pointY}
                          textAnchor="middle"
                          alignmentBaseline="central"
                          fontFamily={fontFamilies.regular}
                          fontSize={17}
                          fill={colors.text}
                        >
                          {part === "hour" ? i || 12 : pad(i * 5)}
                        </SvgText>
                      );
                    })}
                    <SvgText
                      x={tipX}
                      y={tipY}
                      textAnchor="middle"
                      alignmentBaseline="central"
                      fontFamily={fontFamilies.regular}
                      fontSize={17}
                      fill={colors.onPrimary}
                    >
                      {part === "hour" ? hour : pad(minute)}
                    </SvgText>
                  </Svg>
                </View>
              </View>
              <Text
                variant="inherit"
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  fontFamily: fontFamilies.regular,
                  color: colors.textMuted,
                }}
              >
                Choose {part === "hour" ? "an hour" : "a minute"} on the clock
              </Text>
              <View style={styles.row}>
                <Button
                  theme={theme}
                  variant="outline"
                  label="Cancel"
                  style={styles.flex}
                  onPress={close}
                />
                <Button
                  theme={theme}
                  label="Set time"
                  style={styles.flex}
                  onPress={() => {
                    const time = `${pad((hour % 12) + (period === "PM" ? 12 : 0))}:${pad(minute)}`;
                    onChange(endOfDay && time === "00:00" ? "24:00" : time);
                    close();
                  }}
                />
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
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  overlay: { flex: 1, backgroundColor: "#00000066" },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  digit: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  number: { fontSize: 36, lineHeight: 44, fontFamily: fontFamilies.regular },
  period: {
    minHeight: 44,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  dial: {
    width: size,
    height: size,
    borderRadius: center,
    backgroundColor: "#F1F6F5",
    alignSelf: "center",
  },
});
