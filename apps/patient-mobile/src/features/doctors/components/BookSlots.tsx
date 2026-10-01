import { useEffect, useMemo, useRef, useState } from "react";
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
  months,
} from "../utils/doctorProfileConstants";
import type { BookSlotsProps } from "../types/doctor-profile";

export function BookSlots({
  address,
  consultationType,
  onBookAppointment,
  onGoToAbout,
  slots,
  patientOptions,
  loading,
  error,
  busy,
}: BookSlotsProps) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [patientId, setPatientId] = useState(patientOptions[0]?.id ?? "");

  const monthDates = useMemo(() => {
    const year = new Date().getFullYear();
    const available = new Set(slots.map(slot => new Date(slot.starts_at).toLocaleDateString("en-CA")));
    return Array.from({ length: new Date(year, selectedMonthIndex + 1, 0).getDate() }, (_, index) => {
      const date = new Date(year, selectedMonthIndex, index + 1);
      const key = date.toLocaleDateString("en-CA");
      return { key, date: key, dayNumber: date.getDate(), day: date.toLocaleDateString("en-US", { weekday: "short" }), closed: !available.has(key) };
    });
  }, [slots, selectedMonthIndex]);
  const dateSlots = slots.filter(slot => new Date(slot.starts_at).toLocaleDateString("en-CA") === selectedDate);

  const datesScrollRef = useRef<ScrollView>(null);
  const monthsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      monthsScrollRef.current?.scrollTo({
        x: Math.max(0, selectedMonthIndex * 85 - 80),
        animated: false,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [selectedMonthIndex]);

  const handleSelectMonth = (index: number) => {
    setSelectedMonthIndex(index);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleSelectDate = (key: string, idx: number) => {
    setSelectedDate(key);
    setSelectedTime(null);
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
                  disabled: date.closed,
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
          <Text style={styles.availability}>{dateSlots.length} slots available</Text>
        </View>
        <View style={styles.slotGrid}>
          {dateSlots.map((slot) => {
            const time = new Date(slot.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
                textStyle={[
                  selected ? styles.selectedTimeText : undefined,
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.bookingSection}>
        <Text style={styles.sectionTitle}>For whom?</Text>
        <View style={styles.patientRow}>
          {patientOptions.map(option => <Chip
            key={option.id}
            variant="radio"
            selected={patientId === option.id}
            theme="patient"
            label={option.label}
            onPress={() => { if (option.verified) setPatientId(option.id); }}
          />)}
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
      {loading ? <Text style={styles.availability}>Loading slots…</Text> : null}
      {slots.length === 0 && !loading ? <Text style={styles.availability}>No clinic slots available yet.</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.availability}>{error}</Text> : null}
    </Card>

    <Button
      label="Book Appointment"
      disabled={busy || !selectedTime || !patientId || consultationType !== "Clinic Visit"}
      onPress={() => {
        const selectedSlot = slots.find(slot => slot.window_id === selectedTime);
        if (!selectedSlot) return;
        onBookAppointment({
          date: new Date(selectedSlot.starts_at).toLocaleDateString(),
          time: selectedSlot.window_id,
          patient: patientOptions.find(option => option.id === patientId)?.label ?? "Self",
          patientId,
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
