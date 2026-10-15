import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Calendar } from "lucide-react-native";
import { fontFamilies } from "@startup/design-tokens";
import { useQuery } from "@tanstack/react-query";
import { listMyPracticeAppointments } from "@startup/data-access";
import type { VisitMode } from "../../../types/doctor";
import { modeLabels } from "../../../data/demo";
import { PatientCard } from "../../patients/components/PatientCard";
import {
  Button,
  Chip,
  Dropdown,
  FadedScrollView,
  Loader,
} from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { supabase } from "../../../services/supabase";

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

interface DayItem {
  key: string;
  day: number;
  label: string;
  month: string;
}

const DayPill = memo(function DayPill({
  day,
  selected,
  onPress,
}: {
  day: DayItem;
  selected: boolean;
  onPress: (key: string) => void;
}) {
  const handlePress = () => onPress(day.key);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${day.day} ${day.month}`}
      accessibilityState={{ checked: selected }}
      onPress={handlePress}
      style={[styles.dayPill, selected && styles.dayPillSelected]}
    >
      <Heading style={selected ? styles.dayTextSelected : styles.dayText}>
        {day.day}
      </Heading>
      <Label style={selected ? styles.dayLabelSelected : styles.dayLabel}>
        {day.label}
      </Label>
    </Pressable>
  );
});

export function AppointmentsScreen() {
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

  return (
    <DoctorScreen title="Appointments">
      <View style={styles.monthRow}>
        <Heading style={styles.dateHeading}>Select date</Heading>
        <Dropdown
          theme="doctor"
          leftIcon={<Calendar size={18} color={palette.primary} />}
          accessibilityLabel="Select appointment month"
          options={monthOptions}
          value={month}
          onValueChange={selectMonth}
          containerStyle={styles.monthDropdown}
          triggerStyle={styles.monthTrigger}
          valueStyle={styles.monthLabel}
        />
      </View>
      <View style={styles.dateControls}>
        <FadedScrollView
          edgeColor={palette.white}
          containerStyle={styles.dateStrip}
          style={styles.horizontalScroll}
          ref={datesRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysList}
          onContentSizeChange={scrollToSelectedDate}
        >
          {days.map((day) => (
            <DayPill
              key={day.key}
              day={day}
              selected={date === day.key}
              onPress={selectDate}
            />
          ))}
        </FadedScrollView>
        <FadedScrollView
          horizontal
          edgeColor={palette.white}
          containerStyle={styles.filterStrip}
          style={styles.horizontalScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(["all", "clinic", "online", "home"] as const).map((mode) => (
            <Chip
              key={mode}
              theme="doctor"
              variant="radio"
              style={styles.filterPill}
              label={mode === "all" ? "All" : modeLabels[mode]}
              selected={filter === mode}
              onPress={() => setFilter(mode)}
            />
          ))}
        </FadedScrollView>
      </View>
      {appointments.isLoading ? (
        <Loader theme="doctor" style={{ minHeight: 88 }} />
      ) : null}
      {appointments.isError ? (
        <Panel>
          <Label style={ui.error}>
            Could not load appointments. Reopen this tab to retry.
          </Label>
        </Panel>
      ) : null}
      {visible.map((item) => (
        <PatientCard
          key={item.id}
          appointment={item}
          onOpen={() =>
            router.push({
              pathname: "/appointment-details",
              params: { appointmentId: item.id },
            })
          }
        />
      ))}
      {date &&
      visible.length === 0 &&
      !appointments.isLoading &&
      !appointments.isError ? (
        <View style={styles.emptyState}>
          <Heading style={styles.emptyText}>No appointments</Heading>
          <Label muted style={styles.emptyText}>
            {filter === "all"
              ? "No appointments for this date."
              : `No ${modeLabels[filter].toLowerCase()} appointments for this date.`}
          </Label>
        </View>
      ) : null}
      {!date ? (
        <Panel>
          <Label muted>Choose a day to see appointments.</Label>
        </Panel>
      ) : null}
    </DoctorScreen>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dateHeading: { fontSize: 18, fontFamily: fontFamilies.medium },
  monthDropdown: { width: 180, maxWidth: "75%" },
  dateControls: { gap: 24 },
  emptyState: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { textAlign: "center" },
  dateStrip: { height: 72, flexGrow: 0, flexShrink: 0 },
  filterStrip: { height: 48, flexGrow: 0, flexShrink: 0 },
  horizontalScroll: { flexGrow: 0 },
  filterPill: { alignSelf: "center" },
  monthTrigger: { minHeight: 44, height: 44, paddingHorizontal: 10 },
  monthLabel: { fontSize: 13, fontFamily: fontFamilies.semibold },
  filters: { gap: 8, paddingVertical: 4, alignItems: "center" },
  daysList: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  dayPill: {
    width: 54,
    height: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: "#D2D2D2",
    gap: 2,
  },
  dayPillSelected: {
    backgroundColor: palette.dark,
    borderColor: palette.dark,
  },
  dayText: {
    fontSize: 17,
    lineHeight: 22,
    color: palette.text,
  },
  dayTextSelected: {
    fontSize: 17,
    lineHeight: 22,
    color: "white",
  },
  dayLabel: {
    fontSize: 11,
    color: palette.muted,
  },
  dayLabelSelected: {
    fontSize: 11,
    color: "white",
  },
});
