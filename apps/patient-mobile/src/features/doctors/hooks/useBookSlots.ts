import { localDateKey } from "../utils/bookingDates";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { months } from "../utils/doctorProfileConstants";
import type { BookSlotsProps } from "../types/doctor-profile";

export function useBookSlots({
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
  return {
    selectedTime,
    setSelectedTime,
    reason,
    setReason,
    patientId,
    setPatientId,
    selectedPatientIsVerified,
    today,
    selectedMonthOffset,
    selectedDate,
    monthOptions,
    monthDates,
    dateSlots,
    selectedSlot,
    datesScrollRef,
    monthsScrollRef,
    handleSelectMonth,
    handleSelectDate,
  };
}
