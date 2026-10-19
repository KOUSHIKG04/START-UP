import type { Props } from "../types/booking-time-section";
export type { Props } from "../types/booking-time-section";
import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { TimeSlot } from "@startup/mobile-ui";

import { styles } from "./BookSlots.styles";

export function BookingTimeSection({
  selectedTime,
  setSelectedTime,
  selectedDate,
  dateSlots,
  loading,
  error,
  timeZone,
}: Props) {
  return (
    <View style={styles.bookingSection}>
      <View style={styles.sectionHeadingRow}>
        <Text variant="sectionHeading" style={styles.sectionTitle}>
          Select time
        </Text>
        {dateSlots.length > 0 ? (
          <Text variant="body" style={styles.availability}>
            {dateSlots.length} slots available
          </Text>
        ) : null}
      </View>
      {selectedDate && !loading && !error && dateSlots.length === 0 ? (
        <Text variant="body" style={styles.availability}>
          Not available on this date. Choose another date.
        </Text>
      ) : null}
      {!selectedDate && !loading && !error ? (
        <Text variant="body" style={styles.availability}>
          No appointment times in this month. Choose another month or check back
          later.
        </Text>
      ) : null}
      <View style={styles.slotGrid}>
        {dateSlots.map((slot) => {
          const time = new Date(slot.starts_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            timeZone,
          });
          const selected = selectedTime === slot.window_id;
          return (
            <TimeSlot
              key={slot.window_id}
              time={time}
              disabled={false}
              accessibilityRole="radio"
              accessibilityState={{
                selected,
                disabled: false,
              }}
              onPress={() => setSelectedTime(slot.window_id)}
              style={[
                styles.timeSlot,
                selected ? styles.selectedTimeSlot : undefined,
              ]}
              textStyle={[selected ? styles.selectedTimeText : undefined]}
            />
          );
        })}
      </View>
    </View>
  );
}
