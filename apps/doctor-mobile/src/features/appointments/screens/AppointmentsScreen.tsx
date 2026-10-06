import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyPracticeAppointments, transitionClinicAppointment } from "@startup/data-access";
import type { ClinicAppointment, ClinicTransitionInput } from "@startup/contracts";
import type { VisitMode } from "../../../types/doctor";
import { modeLabels } from "../../../data/demo";
import { PatientCard } from "../../patients/components/PatientCard";
import { Button, Input, useToast } from "@startup/mobile-ui";
import { Choice, DoctorScreen, Heading, IconButton, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { supabase } from "../../../services/supabase";

type Action = ClinicTransitionInput["action"];
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
      accessibilityRole="button"
      accessibilityLabel={`${day.day} ${day.month}`}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[styles.dayPill, selected && styles.dayPillSelected]}
    >
      <Heading style={selected ? styles.dayTextSelected : styles.dayText}>{day.day}</Heading>
      <Label style={selected ? styles.dayLabelSelected : styles.dayLabel}>{day.label}</Label>
    </Pressable>
  );
});

export function AppointmentsScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const openedFromHome = useRef<string | null>(null);
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [week, setWeek] = useState(0);
  const [filter, setFilter] = useState<"all" | VisitMode>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const appointments = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase),
    refetchInterval: 15000,
  });
  useEffect(() => {
    if (!appointmentId || !appointments.data || openedFromHome.current === appointmentId) return;
    const selected = appointments.data.find(item => item.id === appointmentId);
    if (!selected) return;
    openedFromHome.current = appointmentId;
    setDate(dayKey(new Date(selected.starts_at)));
    setFilter("all");
    setExpandedId(selected.id);
  }, [appointmentId, appointments.data]);
  const transition = useMutation({
    mutationFn: ({ item, action }: { item: ClinicAppointment; action: Action }) => transitionClinicAppointment(supabase!, {
      appointmentId: item.id,
      expectedVersion: Number(item.row_version),
      action,
      note: ["reject", "hold", "complete"].includes(action) ? notes[item.id]?.trim() ?? null : null,
    }),
    onSuccess: (_result, { action }) => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); const feedback = action === "approve" ? "Appointment confirmed." : "Appointment updated."; showToast({ title: feedback, type: "success" }); void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] }); },
    onError: () => { const feedback = "Could not update the appointment. Refresh and check its current status."; showToast({ title: "Update failed", message: feedback, type: "error" }); },
  });
  const days = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + week * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const value = new Date(startOfWeek);
      value.setDate(value.getDate() + index);
      return {
        key: dayKey(value),
        day: value.getDate(),
        label: value.toLocaleDateString("en-US", { weekday: "short" }),
        month: value.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    });
  }, [week]);
  const visible = appointments.data?.filter((item) => dayKey(new Date(item.starts_at)) === date && (filter === "all" || filter === item.visit_mode)) ?? [];
  const act = (item: ClinicAppointment, action: Action) => transition.mutate({ item, action });

  const renderDay = useCallback(
    ({ item }: { item: DayItem }) => (
      <DayPill
        day={item}
        selected={date === item.key}
        onPress={setDate}
      />
    ),
    [date],
  );

  return <DoctorScreen title="Appointments">
    <View style={ui.between}>
      <Heading style={{ fontSize: 18 }}>{days[0].month}</Heading>
      <View style={ui.row}>
        <IconButton label="Previous week" onPress={() => { setWeek((value) => value - 1); setDate(""); }}><ChevronLeft size={20} color={palette.primary} /></IconButton>
        <IconButton label="Today" onPress={() => { setWeek(0); setDate(dayKey(new Date())); }}><Calendar size={20} color={palette.primary} /></IconButton>
        <IconButton label="Next week" onPress={() => { setWeek((value) => value + 1); setDate(""); }}><ChevronRight size={20} color={palette.primary} /></IconButton>
      </View>
    </View>
    <FlatList
      horizontal
      data={days}
      keyExtractor={(day) => day.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.daysList}
      renderItem={renderDay}
    />
    <View style={[ui.wrap, { justifyContent: "center", gap: 6 }]}>
      {(["all", "clinic", "online", "home"] as const).map((mode) => <Choice key={mode} label={mode === "all" ? "All" : modeLabels[mode]} selected={filter === mode} onPress={() => setFilter(mode)} />)}
    </View>
    {appointments.isLoading ? <Label muted>Loading appointments…</Label> : null}
    {appointments.isError ? <Panel><Label style={ui.error}>Could not load appointments. Reopen this tab to retry.</Label></Panel> : null}
    {visible.map((item) => <View key={item.id} style={{ gap: 8 }}><PatientCard appointment={item} onOpen={() => setExpandedId(expandedId === item.id ? null : item.id)} />{expandedId === item.id ? <Panel>
      <Label muted>{new Date(item.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {item.facility_name}</Label>
      <Label muted>Booking {item.public_code} · {item.status.replaceAll("_", " ")}</Label>
      {item.visit_mode === "clinic" && item.queue_state ? <Label muted>Queue: {item.queue_state.replaceAll("_", " ")}{item.ticket_number ? ` · #${item.ticket_number}` : ""}</Label> : null}
      {item.reason ? <Label muted>Reason: {item.reason}</Label> : null}
      {item.status === "pending" || item.queue_state === "waiting" || item.queue_state === "called" ? <Input label="Reason for rejection or hold" value={notes[item.id] ?? ""} onChangeText={(value) => setNotes((current) => ({ ...current, [item.id]: value }))} multiline /> : null}
      {item.status === "pending" ? <View style={ui.row}>
        <Button theme="doctor" label="Accept" disabled={transition.isPending} onPress={() => act(item, "approve")} />
        <Button theme="doctor" variant="outline" label="Reject" disabled={transition.isPending || !notes[item.id]?.trim()} onPress={() => act(item, "reject")} />
      </View> : null}
      {item.visit_mode === "online" && ["confirmed", "in_consultation"].includes(item.status) && item.can_consult ? <View style={ui.row}>
        <Button theme="doctor" label="Join video consultation" onPress={() => router.push({ pathname: "/online-consultation", params: { appointmentId: item.id, patientId: item.patient_id, mode: "online" } })} />
        <Button theme="doctor" variant="outline" label="Open chat" onPress={() => router.push({ pathname: "/chat", params: { appointmentId: item.id, patientId: item.patient_id, mode: "online" } })} />
      </View> : null}
      {item.visit_mode === "clinic" && item.status === "confirmed" && item.queue_state === "awaiting_arrival" ? <Button theme="doctor" label="Scan patient check-in QR" onPress={() => router.push("/scan-qr")} /> : null}
      {item.status === "confirmed" && item.queue_state === "waiting" ? <Button theme="doctor" label="Call patient" disabled={transition.isPending} onPress={() => act(item, "call")} /> : null}
      {item.status === "confirmed" && ["waiting", "called"].includes(item.queue_state ?? "") ? <Button theme="doctor" variant="outline" label="Hold" disabled={transition.isPending || !notes[item.id]?.trim()} onPress={() => act(item, "hold")} /> : null}
      {item.status === "confirmed" && item.queue_state === "held" ? <Button theme="doctor" variant="outline" label="Return to queue" disabled={transition.isPending} onPress={() => act(item, "resume")} /> : null}
      {item.status === "confirmed" && item.queue_state === "called" && item.can_consult ? <Button theme="doctor" label="Start consultation" disabled={transition.isPending} onPress={() => act(item, "start")} /> : null}
      {item.visit_mode === "clinic" && item.status === "in_consultation" && item.can_consult ? <Button theme="doctor" label="Consultation details" onPress={() => router.push({ pathname: "/clinical-notes", params: { appointmentId: item.id, patientId: item.patient_id, mode: "clinic" } })} /> : null}
      {item.visit_mode === "online" && item.status === "in_consultation" && item.can_consult ? <Button theme="doctor" label="Clinical notes" onPress={() => router.push({ pathname: "/clinical-notes", params: { appointmentId: item.id, patientId: item.patient_id, mode: "online" } })} /> : null}
    </Panel> : null}</View>)}
    {date && visible.length === 0 && !appointments.isLoading && !appointments.isError ? <Panel><Heading>No appointments</Heading><Label muted>{filter === "home" ? "This visit type is not connected to live scheduling yet." : `No ${filter === "online" ? "online" : "clinic"} appointments match this day.`}</Label></Panel> : null}
    {!date ? <Panel><Label muted>Choose a day to see appointments.</Label></Panel> : null}
  </DoctorScreen>;
}

const styles = StyleSheet.create({
  daysList: {
    gap: 8,
  },
  dayPill: {
    width: 46,
    height: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F2F5",
  },
  dayPillSelected: {
    backgroundColor: palette.dark,
  },
  dayText: {
    fontSize: 19,
    color: palette.text,
  },
  dayTextSelected: {
    fontSize: 19,
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
