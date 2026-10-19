import { dayKey } from "../utils/appointmentDates";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { listMyPracticeAppointments } from "@startup/data-access";
import type { VisitMode } from "../../../types/doctor";
import { supabase } from "../../../services/supabase";
export function useAppointments() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const openedFromHome = useRef<string | null>(null);
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7));
  const datesRef = useRef<ScrollView>(null);
  const pendingScrollDate = useRef<string | null>(date);
  const [filter, setFilter] = useState<"all" | VisitMode>("all");

  const appointments = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase),
  });
  useEffect(() => {
    if (
      !appointmentId ||
      !appointments.data ||
      openedFromHome.current === appointmentId
    )
      return;
    const selected = appointments.data.find(
      (item) => item.id === appointmentId
    );
    if (!selected) return;
    openedFromHome.current = appointmentId;
    const selectedDay = dayKey(new Date(selected.starts_at));
    pendingScrollDate.current = selectedDay;
    setDate(selectedDay);
    setMonth(selectedDay.slice(0, 7));
    setFilter("all");
    router.replace({
      pathname: "/appointment-details",
      params: { appointmentId: selected.id },
    });
  }, [appointmentId, appointments.data]);
  const monthOptions = useMemo(() => {
    const values = new Set<string>([month]);
    const today = new Date();
    for (let offset = -12; offset <= 12; offset++) {
      values.add(
        dayKey(
          new Date(today.getFullYear(), today.getMonth() + offset, 1)
        ).slice(0, 7)
      );
    }
    for (const item of appointments.data ?? []) {
      values.add(dayKey(new Date(item.starts_at)).slice(0, 7));
    }
    return [...values].sort().map((value) => {
      const [year, monthNumber] = value.split("-").map(Number);
      return {
        value,
        label: new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      };
    });
  }, [appointments.data, month]);
  const days = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const count = new Date(year, monthNumber, 0).getDate();
    return Array.from({ length: count }, (_, index) => {
      const value = new Date(year, monthNumber - 1, index + 1);
      return {
        key: dayKey(value),
        day: value.getDate(),
        label: value.toLocaleDateString("en-US", { weekday: "short" }),
        month: value.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      };
    });
  }, [month]);
  const scrollToSelectedDate = useCallback(() => {
    const target = pendingScrollDate.current;
    if (!target || !datesRef.current) return;
    const index = days.findIndex((day) => day.key === target);
    if (index < 0) return;
    datesRef.current.scrollTo({
      x: Math.max(0, index * 62 - 110),
      animated: false,
    });
    pendingScrollDate.current = null;
  }, [days]);
  useEffect(() => {
    if (!pendingScrollDate.current) return;
    const frame = requestAnimationFrame(scrollToSelectedDate);
    return () => cancelAnimationFrame(frame);
  }, [scrollToSelectedDate, appointmentId, appointments.data]);
  const selectDate = useCallback((value: string) => {
    pendingScrollDate.current = null;
    setDate(value);
  }, []);
  const selectMonth = (value: string) => {
    if (value === month) return;
    setMonth(value);
    const today = dayKey(new Date());
    const selectedDay = value === today.slice(0, 7) ? today : `${value}-01`;
    pendingScrollDate.current = selectedDay;
    setDate(selectedDay);
  };
  const visible =
    appointments.data?.filter(
      (item) =>
        dayKey(new Date(item.starts_at)) === date &&
        (filter === "all" || filter === item.visit_mode)
    ) ?? [];

  return {
    appointmentId,
    date,
    month,
    datesRef,
    filter,
    setFilter,
    appointments,
    monthOptions,
    days,
    scrollToSelectedDate,
    selectDate,
    selectMonth,
    visible,
  };
}
