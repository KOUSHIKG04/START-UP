import type { Props } from "../types/booking-date-section";
export type { Props } from "../types/booking-date-section";
import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { Button, Chip, FadedScrollView } from "@startup/mobile-ui";

import { styles } from "./BookSlots.styles";

export function BookingDateSection({
  today,
  selectedMonthOffset,
  selectedDate,
  monthOptions,
  monthDates,
  datesScrollRef,
  monthsScrollRef,
  handleSelectMonth,
  handleSelectDate,
}: Props) {
  return (
    <View style={styles.bookingSection}>
      <View style={styles.sectionHeadingRow}>
        <Text variant="sectionHeading" style={styles.sectionTitle}>
          Select date
        </Text>
        <Text variant="sectionHeading" style={styles.sectionTitle}>
          {new Date(
            today.getFullYear(),
            today.getMonth() + selectedMonthOffset,
            1
          ).getFullYear()}
        </Text>
      </View>
      <FadedScrollView
        ref={monthsScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthsStrip}
      >
        {monthOptions.map((m) => {
          const isSelected = m.offset === selectedMonthOffset;
          return (
            <Chip
              key={m.offset}
              label={m.name}
              selected={isSelected}
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleSelectMonth(m.offset)}
              style={[
                styles.monthChip,
                isSelected ? styles.selectedMonthChip : undefined,
              ]}
              labelStyle={
                isSelected ? styles.selectedMonthChipText : styles.monthChipText
              }
            />
          );
        })}
      </FadedScrollView>

      <FadedScrollView
        ref={datesScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.datesCarousel}
      >
        {monthDates.map((date, idx) => {
          const selected = date.key === selectedDate;

          return (
            <Button
              key={date.key}
              variant={selected ? "primary" : "outline"}
              theme="patient"
              disabled={date.closed}
              accessibilityRole="radio"
              accessibilityState={{
                selected,
                disabled: date.closed,
              }}
              onPress={() => handleSelectDate(date.key, idx)}
              style={[
                styles.dateCard,
                selected ? styles.selectedDateCard : undefined,
              ]}
            >
              <Text
                variant="caption"
                style={[
                  styles.dateNumber,
                  selected ? styles.selectedDateNumber : undefined,
                  date.closed ? styles.disabledDateText : undefined,
                ]}
              >
                {date.dayNumber}
              </Text>
              <Text
                variant="caption"
                style={[
                  styles.dateDay,
                  selected ? styles.selectedDateDay : undefined,
                  date.closed ? styles.disabledDateText : undefined,
                ]}
              >
                {date.day}
              </Text>
            </Button>
          );
        })}
      </FadedScrollView>
    </View>
  );
}
