import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CalendarDays } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";
import { AppText as Text } from "./AppText";
import { Calendar, type CalendarProps } from "./Calendar";
import { parseCalendarDay } from "./calendarDays";
import { ModalSurface } from "./ModalSurface";
import { Button } from "./Button";
import { useMobileTheme } from "../theme/MobileThemeProvider";

const displayDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
export type CalendarFieldProps = CalendarProps & {
  label: string;
  disabled?: boolean;
};

/** Calendar plus dialog trigger, like shadcn's Date Picker composition for native UI. */
export function CalendarField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  theme,
}: CalendarFieldProps) {
  const colors = useMobileTheme(theme);
  const [open, setOpen] = useState(false);
  const selected = parseCalendarDay(value || "");
  const close = () => setOpen(false);
  return (
    <View style={styles.fieldGroup}>
      <Text variant="inherit" style={[styles.label, { color: colors.text }]}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected ? displayDate.format(selected) : "Select date"}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          { borderColor: colors.border, backgroundColor: colors.surface },
          disabled && styles.disabled,
        ]}
      >
        <Text
          variant="inherit"
          style={[
            styles.value,
            { color: selected ? colors.text : colors.textMuted },
          ]}
        >
          {selected ? displayDate.format(selected) : "Select date"}
        </Text>
        <CalendarDays size={18} color={colors.primary} />
      </Pressable>
      <ModalSurface visible={open} onClose={close} contentStyle={styles.dialog}>
        <Text
          variant="inherit"
          accessibilityRole="header"
          style={[styles.heading, { color: colors.text }]}
        >
          {label}
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
});
