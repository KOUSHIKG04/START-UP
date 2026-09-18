import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import {
  Button,
  Card,
  Chip,
  FadedScrollView,
  Input,
  TimeSlot,
} from "@startup/mobile-ui";
import {
  getDatesForMonth,
  months,
  patientOptions,
  timeSlots,
} from "../../utils/doctorProfileConstants";
import type { BookSlotsProps } from "../../types/doctor-profile";

export function BookSlots({
  address,
  consultationType,
  onBookAppointment,
  onGoToAbout,
}: BookSlotsProps) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(10); // November (matches reference)
  const [monthDates, setMonthDates] = useState(() => getDatesForMonth(10));
  const [selectedDate, setSelectedDate] = useState("5-nov");
  const [selectedTime, setSelectedTime] = useState("02:30 PM");
  const [patient, setPatient] = useState("Self");
  const [reason, setReason] = useState("");

  const datesScrollRef = useRef<ScrollView>(null);
  const monthsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      monthsScrollRef.current?.scrollTo({
        x: Math.max(0, 10 * 85 - 80),
        animated: false,
      });
      const selIdx = monthDates.findIndex((d) => d.key === "5-nov");
      if (selIdx >= 0) {
        datesScrollRef.current?.scrollTo({
          x: Math.max(0, selIdx * 54 - 110),
          animated: false,
        });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectMonth = (index: number) => {
    setSelectedMonthIndex(index);
    const newDates = getDatesForMonth(index);
    setMonthDates(newDates);

    const targetKey = `5-${months[index].short.toLowerCase()}`;
    const targetDate =
      newDates.find((d) => d.key === targetKey && !d.closed) ??
      newDates.find((d) => !d.closed) ??
      newDates[0];
    setSelectedDate(targetDate.key);

    const selIdx = newDates.findIndex((d) => d.key === targetDate.key);
    if (selIdx >= 0) {
      setTimeout(() => {
        datesScrollRef.current?.scrollTo({
          x: Math.max(0, selIdx * 54 - 110),
          animated: true,
        });
      }, 50);
    }
  };

  const handleSelectDate = (key: string, idx: number) => {
    setSelectedDate(key);
    datesScrollRef.current?.scrollTo({
      x: Math.max(0, idx * 54 - 110),
      animated: true,
    });
  };

  return (
    <View style={styles.container}>
      <Card
        variant="outlined"
        borderRadius={radius.md}
        borderColor="#E0E5EB"
        borderWidth={1}
        backgroundColor={colors.white}
        gap={20}
        padding={16}
        style={styles.bookSlotsCard}
      >
      <View style={styles.bookingSection}>
        <Text style={styles.sectionTitle}>Select date</Text>
        <FadedScrollView
          ref={monthsScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthsStrip}
        >
          {months.map((m) => {
            const isSelected = m.index === selectedMonthIndex;
            return (
              <Chip
                key={m.name}
                label={m.name}
                selected={isSelected}
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelectMonth(m.index)}
                style={[
                  styles.monthChip,
                  isSelected ? styles.selectedMonthChip : undefined,
                ]}
                labelStyle={
                  isSelected
                    ? styles.selectedMonthChipText
                    : styles.monthChipText
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
                  disabled: date.closed === true,
                }}
                onPress={() => handleSelectDate(date.key, idx)}
                style={[
                  styles.dateCard,
                  selected ? styles.selectedDateCard : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.dateNumber,
                    selected ? styles.selectedDateNumber : undefined,
                    date.closed ? styles.disabledDateText : undefined,
                  ]}
                >
                  {date.dayNumber}
                </Text>
                <Text
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

      <View style={styles.bookingSection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>Select time</Text>
          <Text style={styles.availability}>5 slots available</Text>
        </View>
        <View style={styles.slotGrid}>
          {timeSlots.map((slot) => {
            const selected = selectedTime === slot.time;
            return (
              <TimeSlot
                key={slot.time}
                time={slot.time}
                disabled={slot.disabled}
                accessibilityRole="radio"
                accessibilityState={{
                  selected,
                  disabled: slot.disabled === true,
                }}
                onPress={() => setSelectedTime(slot.time)}
                style={[
                  styles.timeSlot,
                  selected ? styles.selectedTimeSlot : undefined,
                  slot.disabled ? styles.disabledTimeSlot : undefined,
                ]}
                textStyle={[
                  selected ? styles.selectedTimeText : undefined,
                  slot.disabled ? styles.disabledDateText : undefined,
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.bookingSection}>
        <Text style={styles.sectionTitle}>For whom?</Text>
        <View style={styles.patientRow}>
          {patientOptions.map((option) => {
            const selected = patient === option;
            return (
              <Chip
                key={option}
                variant="radio"
                selected={selected}
                theme="patient"
                label={option}
                onPress={() => setPatient(option)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.bookingSection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>Reason for visit (optional)</Text>
          <Button
            label="About Doctor"
            variant="ghost"
            theme="patient"
            onPress={onGoToAbout}
            style={styles.backToAboutButton}
            labelStyle={styles.backToAboutLabel}
            leftIcon={
              <ChevronLeft
                color={colors.patient.primaryDark}
                size={15}
                strokeWidth={2.4}
              />
            }
          />
        </View>
        <Input
          accessibilityLabel="Reason for visit"
          placeholder="e.g. Fever, back pain, routine check-up..."
          value={reason}
          onChangeText={setReason}
          containerStyle={styles.reasonInputContainer}
        />
      </View>
    </Card>

    <Button
      label="Book Appointment"
      onPress={() => {
        const date =
          monthDates.find((item) => item.key === selectedDate)?.date ??
          selectedDate;
        onBookAppointment({
          date,
          time: selectedTime,
          patient,
          reason,
          consultationType,
          address,
        });
      }}
      style={styles.bookButton}
    />
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 14,
  },
  bookSlotsCard: {
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  bookingSection: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  monthsStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  monthChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.patient.background,
  },
  selectedMonthChip: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  monthChipText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  selectedMonthChipText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  datesCarousel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  dateCard: {
    width: 54,
    height: 64,
    minHeight: 64,
    borderRadius: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  selectedDateCard: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  dateNumber: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  selectedDateNumber: {
    color: colors.white,
  },
  dateDay: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  selectedDateDay: {
    color: colors.white,
  },
  disabledDateText: {
    color: colors.disabledText,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availability: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    minWidth: 0,
    width: "31%",
    flexGrow: 1,
    paddingHorizontal: 5,
  },
  selectedTimeSlot: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  disabledTimeSlot: {
    backgroundColor: colors.disabledBackground,
    borderWidth: 0,
  },
  selectedTimeText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  patientRow: {
    flexDirection: "row",
    gap: 8,
  },
  reasonInputContainer: {
    width: "100%",
    maxWidth: "100%",
  },
  bookButton: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: radius.md,
  },
  backToAboutButton: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backToAboutLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
  },
});
