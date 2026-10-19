import { weekdays, monthLabel, fullDayLabel } from "../utils/calendarConstants";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";
import { AppText as Text } from "./AppText";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import {
  calendarMonthDays,
  formatCalendarDay,
  parseCalendarDay,
} from "../utils/calendarDays";
import type { CalendarProps } from "../types/calendar";

export type { CalendarProps } from "../types/calendar";

/** Single-day calendar for local YYYY-MM-DD values. It never converts a day through UTC. */
export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  theme,
}: CalendarProps) {
  const colors = useMobileTheme(theme);
  const [month, setMonth] = useState(() => {
    const date =
      parseCalendarDay(value || "") ??
      parseCalendarDay(minDate || "") ??
      new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  });
  useEffect(() => {
    const selected = parseCalendarDay(value || "");
    if (selected)
      setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1, 12));
  }, [value]);
  const cells = calendarMonthDays(month);
  const previousMonthLastDay = formatCalendarDay(
    new Date(month.getFullYear(), month.getMonth(), 0, 12)
  );
  const nextMonthFirstDay = formatCalendarDay(
    new Date(month.getFullYear(), month.getMonth() + 1, 1, 12)
  );
  const canGoBack = !minDate || previousMonthLastDay >= minDate;
  const canGoForward = !maxDate || nextMonthFirstDay <= maxDate;
  const today = formatCalendarDay(new Date());
  const move = (delta: number) =>
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1, 12)
    );
  return (
    <View accessibilityLabel="Calendar" style={styles.calendar}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          accessibilityState={{ disabled: !canGoBack }}
          disabled={!canGoBack}
          onPress={() => move(-1)}
          style={styles.navButton}
        >
          <ChevronLeft
            size={20}
            color={canGoBack ? colors.primary : colors.textMuted}
          />
        </Pressable>
        <Text
          variant="inherit"
          accessibilityRole="header"
          style={[styles.month, { color: colors.text }]}
        >
          {monthLabel.format(month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canGoForward }}
          disabled={!canGoForward}
          onPress={() => move(1)}
          style={styles.navButton}
        >
          <ChevronRight
            size={20}
            color={canGoForward ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {weekdays.map((day) => (
          <View key={day} style={styles.cell}>
            <Text
              variant="inherit"
              style={[styles.weekday, { color: colors.textMuted }]}
            >
              {day}
            </Text>
          </View>
        ))}
        {cells.map((day, index) => {
          const disabled =
            !day ||
            Boolean((minDate && day < minDate) || (maxDate && day > maxDate));
          const selected = day === value;
          return (
            <View key={`${day ?? "blank"}-${index}`} style={styles.cell}>
              {day ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={fullDayLabel.format(
                    parseCalendarDay(day)!
                  )}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onChange(day)}
                  style={[
                    styles.day,
                    selected && { backgroundColor: colors.primary },
                    !selected &&
                      day === today && {
                        borderWidth: 1,
                        borderColor: colors.primary,
                      },
                  ]}
                >
                  <Text
                    variant="inherit"
                    style={[
                      styles.dayText,
                      {
                        color: selected
                          ? colors.onPrimary
                          : disabled
                            ? colors.textMuted
                            : colors.text,
                      },
                      disabled && styles.disabled,
                    ]}
                  >
                    {Number(day.slice(-2))}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { width: "100%", gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  month: { fontFamily: fontFamilies.semibold, fontSize: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
  cell: {
    width: "14.285714%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  weekday: { fontFamily: fontFamilies.medium, fontSize: 12 },
  day: {
    width: "100%",
    maxWidth: 40,
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontFamily: fontFamilies.medium, fontSize: 14 },
  disabled: { opacity: 0.45 },
});
