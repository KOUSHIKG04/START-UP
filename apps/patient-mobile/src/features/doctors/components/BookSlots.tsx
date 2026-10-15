import { AppText as Text } from "@startup/mobile-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { formatDisplayDate } from "@startup/contracts";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import {
  Button,
  Card,
  Chip,
  FadedScrollView,
  Input,
  Loader,
  TimeSlot,
  useToast,
  useToastFeedback,
} from "@startup/mobile-ui";
import { months } from "../utils/doctorProfileConstants";
import type { BookSlotsProps } from "../types/doctor-profile";
import { formatConsultationFee } from "../utils/doctorDisplay";

function localDateKey(value: Date, timeZone?: string): string {
  if (timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

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
  openingConfirmation,
  timeZone,
}: BookSlotsProps) {
  useToastFeedback({ error: error ?? "" });
  const { showToast } = useToast();
  const noSlotsNotice = useRef("");
  const [requestedMonthOffset, setSelectedMonthOffset] = useState<
    number | null
  >(null);
  const [requestedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [patientId, setPatientId] = useState(patientOptions[0]?.id ?? "");
  const selectedPatientIsVerified = patientOptions.some(
    (option) => option.id === patientId && option.verified
  );

  useEffect(() => {
    if (selectedPatientIsVerified) return;
    setPatientId(patientOptions.find((option) => option.verified)?.id ?? "");
  }, [patientOptions, selectedPatientIsVerified]);

  const today = useMemo(
    () =>
      timeZone
        ? new Date(`${localDateKey(new Date(), timeZone)}T12:00:00`)
        : new Date(),
    [timeZone]
  );
  const availableDates = useMemo(
    () =>
      new Set(
        slots.map((slot) => localDateKey(new Date(slot.starts_at), timeZone))
      ),
    [slots, timeZone]
  );
  const sortedDates = [...availableDates].sort();
  const [firstYear, firstMonth] = (sortedDates[0] ?? localDateKey(today))
    .split("-")
    .map(Number);
  const selectedMonthOffset =
    requestedMonthOffset ??
    (firstYear - today.getFullYear()) * 12 + firstMonth - 1 - today.getMonth();
  const selectedMonth = new Date(
    today.getFullYear(),
    today.getMonth() + selectedMonthOffset,
    1
  );
  const monthPrefix = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}-`;
  // Derive a valid date from the latest response on every render, including
  // after publication, cancellation, or a cached empty response is refreshed.
  const selectedDate =
    requestedDate &&
    requestedDate.startsWith(monthPrefix) &&
    availableDates.has(requestedDate)
      ? requestedDate
      : (sortedDates.find((date) => date.startsWith(monthPrefix)) ?? null);
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, offset) => {
        const date = new Date(
          today.getFullYear(),
          today.getMonth() + offset,
          1
        );
        return { offset, name: months[date.getMonth()].name };
      }),
    [today]
  );
  const monthDates = useMemo(() => {
    const selectedMonth = new Date(
      today.getFullYear(),
      today.getMonth() + selectedMonthOffset,
      1
    );
    const todayKey = localDateKey(today);
    return Array.from(
      {
        length: new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth() + 1,
          0
        ).getDate(),
      },
      (_, index) => {
        const date = new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth(),
          index + 1
        );
        const key = localDateKey(date);
        return {
          key,
          dayNumber: date.getDate(),
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          closed:
            key < todayKey || (!loading && !error && !availableDates.has(key)),
        };
      }
    );
  }, [today, selectedMonthOffset, loading, error, availableDates]);

  const dateSlots = slots.filter(
    (slot) => localDateKey(new Date(slot.starts_at), timeZone) === selectedDate
  );
  const selectedSlot = dateSlots.find(
    (slot) => slot.window_id === selectedTime
  );

  const datesScrollRef = useRef<ScrollView>(null);
  const monthsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (loading || error || slots.length > 0) {
      noSlotsNotice.current = "";
      return;
    }
    if (noSlotsNotice.current === consultationType) return;
    noSlotsNotice.current = consultationType;
    showToast({
      title: "No slots available",
      message: `No upcoming ${consultationType.toLowerCase()} times are available. Choose another service or check back later.`,
      type: "info",
    });
  }, [consultationType, error, loading, showToast, slots.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      monthsScrollRef.current?.scrollTo({
        x: Math.max(0, selectedMonthOffset * 85 - 80),
        animated: false,
      });
      datesScrollRef.current?.scrollTo({
        x: selectedDate
          ? Math.max(0, (Number(selectedDate.slice(-2)) - 1) * 62 - 110)
          : 0,
        animated: false,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [selectedMonthOffset, selectedDate]);

  const handleSelectMonth = (index: number) => {
    setSelectedMonthOffset(index);
    const month = new Date(today.getFullYear(), today.getMonth() + index, 1);
    const prefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-`;
    setSelectedDate(
      [...availableDates].sort().find((date) => date.startsWith(prefix)) ?? null
    );
    setSelectedTime(null);
  };

  const handleSelectDate = (key: string, idx: number) => {
    setSelectedDate(key);
    setSelectedTime(null);
    if (
      !loading &&
      !error &&
      !slots.some(
        (slot) => localDateKey(new Date(slot.starts_at), timeZone) === key
      )
    ) {
      showToast({
        title: "No times on this date",
        message: "Choose another date to see available slots.",
        type: "info",
      });
    }
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
              No appointment times in this month. Choose another month or check
              back later.
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

        <View style={styles.bookingSection}>
          <Text variant="sectionHeading" style={styles.sectionTitle}>
            For whom?
          </Text>
          <FadedScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.patientRow}
          >
            {patientOptions.map((option) => (
              <Chip
                key={option.id}
                variant="radio"
                selected={patientId === option.id}
                theme="patient"
                label={option.label}
                onPress={() => {
                  if (option.verified) setPatientId(option.id);
                }}
              />
            ))}
          </FadedScrollView>
        </View>

        <View style={styles.bookingSection}>
          <Text variant="sectionHeading" style={styles.sectionTitle}>
            Reason for visit (optional)
          </Text>
          <Input
            accessibilityLabel="Reason for visit"
            placeholder="e.g. Fever, back pain, routine check-up..."
            value={reason}
            onChangeText={setReason}
            containerStyle={styles.reasonInputContainer}
          />
        </View>
        {loading ? <Loader theme="patient" style={styles.loading} /> : null}
      </Card>

      {selectedSlot ? (
        <Text variant="bodyEmphasis">
          Consultation fee:{" "}
          {formatConsultationFee(selectedSlot.fee_minor, selectedSlot.currency)}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="About Doctor"
          variant="outline"
          theme="patient"
          disabled={busy}
          onPress={onGoToAbout}
          style={styles.actionButton}
          labelStyle={styles.actionLabel}
          // leftIcon={
          //   <ChevronLeft
          //     color={colors.patient.primaryDark}
          //     size={15}
          //     strokeWidth={2.4}
          //   />
          // }
        />
        <Button
          loading={openingConfirmation}
          label="Book Appointment"
          theme="patient"
          variant="primary"
          disabled={
            busy ||
            !selectedSlot ||
            !selectedPatientIsVerified ||
            consultationType === "Home Visit"
          }
          onPress={() => {
            if (busy || !selectedSlot) return;
            onBookAppointment({
              date: formatDisplayDate(selectedSlot.starts_at),
              time: selectedSlot.window_id,
              patient:
                patientOptions.find((option) => option.id === patientId)
                  ?.label ?? "Self",
              patientId,
              reason,
              consultationType,
              address,
            });
          }}
          style={styles.actionButton}
          labelStyle={styles.actionLabel}
        />
      </View>
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
    alignItems: "center",
    paddingVertical: 4,
  },
  reasonInputContainer: {
    width: "100%",
    maxWidth: "100%",
  },
  actions: { flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: 8,
  },
  loading: { minHeight: 32 },
  actionLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
