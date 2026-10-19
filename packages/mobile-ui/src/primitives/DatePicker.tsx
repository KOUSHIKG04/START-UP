import { displayDate } from "../utils/calendarConstants";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CalendarDays } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";
import { AppText as Text } from "./AppText";
import { Button } from "./Button";
import { Calendar } from "./Calendar";
import { parseCalendarDay } from "../utils/calendarDays";
import { ModalSurface } from "./ModalSurface";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import type { DatePickerProps } from "../types/datePicker";

export type { DatePickerProps } from "../types/datePicker";

/** Mobile equivalent of shadcn's date-picker composition: a trigger and calendar dialog. */
export function DatePicker({
  label,
  placeholder = "Select date",
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  error,
  theme,
}: DatePickerProps) {
  const colors = useMobileTheme(theme);
  const [open, setOpen] = useState(false);
  const selected = parseCalendarDay(value || "");
  const title = label || "Select date";
  const displayValue = selected ? displayDate.format(selected) : placeholder;
  const close = () => setOpen(false);

  return (
    <View style={styles.fieldGroup}>
      {label ? (
        <Text variant="inherit" style={[styles.label, { color: colors.text }]}>
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${displayValue}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
          },
          disabled && styles.disabled,
        ]}
      >
        <CalendarDays size={18} color={colors.primary} />
        <Text
          variant="inherit"
          style={[
            styles.value,
            { color: selected ? colors.text : colors.textMuted },
          ]}
        >
          {displayValue}
        </Text>
      </Pressable>
      {error ? (
        <Text
          variant="inherit"
          style={[styles.error, { color: colors.danger }]}
        >
          {error}
        </Text>
      ) : null}
      <ModalSurface
        visible={open}
        onClose={close}
        dismissOnBackdrop
        contentStyle={styles.dialog}
      >
        <Text
          variant="inherit"
          accessibilityRole="header"
          style={[styles.heading, { color: colors.text }]}
        >
          {title}
        </Text>
        <Calendar
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          theme={theme}
          onChange={(day) => {
            onChange(day);
            close();
          }}
        />
        <Button
          label="Cancel"
          variant="outline"
          theme={theme}
          onPress={close}
        />
      </ModalSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: 6 },
  label: { fontFamily: fontFamilies.regular, fontSize: 14 },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  value: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 14 },
  disabled: { opacity: 0.5 },
  dialog: { maxWidth: 380 },
  heading: { fontFamily: fontFamilies.semibold, fontSize: 18 },
  error: { fontFamily: fontFamilies.regular, fontSize: 12 },
});
