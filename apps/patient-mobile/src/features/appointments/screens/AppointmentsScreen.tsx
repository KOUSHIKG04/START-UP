import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-qr-code";
import { issueClinicCheckinToken, listClinicAppointments, transitionClinicAppointment } from "@startup/data-access";
import type { ClinicAppointment } from "@startup/contracts";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Button, Chip, FadedScrollView, Header, Skeleton, useToast, useToastFeedback } from "@startup/mobile-ui";
import BookingCard from "../components/BookingCard";
import type { AppointmentsScreenProps, BookingFilter } from "../types/appointments";
import { clinicAppointmentCard } from "../utils/clinicAppointmentCard";
import { supabase } from "../../../services/supabase";

const bookingFilters: readonly BookingFilter[] = ["All", "Clinic Visit", "Home Visit", "Online", "Medicine and test"];

export function AppointmentsScreen({ onBackPress }: AppointmentsScreenProps) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<BookingFilter>("All");
  const [error, setError] = useState("");
  const [qr, setQr] = useState<{ appointmentId: string; token: string } | null>(null);
  const queryClient = useQueryClient();
  const appointments = useQuery<ClinicAppointment[]>({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase),
    refetchInterval: 15000,
  });
  useToastFeedback({ error: error || (appointments.isError ? "Could not load bookings. Reopen this page to retry." : "") });
  useEffect(() => {
    if (!qr) return;
    const timer = setTimeout(() => setQr(null), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [qr]);
  const cancel = useMutation({
    mutationFn: (item: ClinicAppointment) => transitionClinicAppointment(supabase!, {
      appointmentId: item.id,
      expectedVersion: Number(item.row_version),
      action: "cancel",
    }),
    onSuccess: () => { setError(""); showToast({ title: "Booking cancelled", type: "success" }); void queryClient.invalidateQueries({ queryKey: ["patient-clinic-appointments"] }); },
    onError: () => setError("Could not cancel this booking. Refresh and try again."),
  });
  const issueQr = useMutation({
    mutationFn: async (appointmentId: string) => ({ appointmentId, token: await issueClinicCheckinToken(supabase!, appointmentId) }),
    onSuccess: (result: { appointmentId: string; token: string }) => {
      setQr(result);
      setError("");
      showToast({ title: "Check-in QR ready", message: "Show it to the clinic within five minutes.", type: "success" });
      void queryClient.invalidateQueries({ queryKey: ["patient-clinic-appointments"] });
    },
    onError: () => setError("Check-in QR is available on your clinic day. Try again then."),
  });
  const visible: ClinicAppointment[] = appointments.data?.filter((item: ClinicAppointment) => filter === "All" || (filter === "Clinic Visit" && item.visit_mode === "clinic") || (filter === "Online" && item.visit_mode === "online") || (filter === "Home Visit" && item.visit_mode === "home")) ?? [];

  return <View style={styles.screen}>
    <Header title="My Bookings" app="patient" onBackPress={onBackPress} />
    <FadedScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
        {bookingFilters.map((option) => <Chip key={option} variant="radio" selected={filter === option} theme="patient" label={option} onPress={() => setFilter(option)} />)}
      </ScrollView>
      {appointments.isLoading ? <View style={styles.loadingList}><Skeleton theme="patient" height={148} radius={16} /><Skeleton theme="patient" height={148} radius={16} /></View> : null}
      {!appointments.isLoading && !appointments.isError && visible.length === 0 ? <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No {filter === "All" ? "" : `${filter.toLowerCase()} `}bookings yet</Text>
          <Text style={styles.emptyDescription}>{filter === "Medicine and test" ? "This booking type is not connected yet." : "Find a verified doctor and choose an available slot."}</Text>
          {filter !== "Medicine and test" ? <Button label="Find a doctor" onPress={() => router.push("/find-doctor" as Href)} /> : null}
        </View> : null}
        {visible.map((item) => <View key={item.id} style={styles.listItem}>
          <BookingCard appointment={clinicAppointmentCard(item)} statusLabel={item.status.replaceAll("_", " ")} onPress={() => router.push({ pathname: "/appointment-details/[id]", params: { id: item.id } } as Href)} />
          {item.visit_mode === "clinic" && item.queue_state ? <Text style={styles.description}>Queue: {item.queue_state.replaceAll("_", " ")}{item.ticket_number ? ` · ticket ${item.ticket_number}` : ""}{item.queue_state === "waiting" ? ` · ${item.ahead_count} ahead` : ""}</Text> : null}
          {item.status === "pending" || item.status === "confirmed" || (item.visit_mode === "online" && item.status === "in_consultation") ? <View style={styles.actionRow}>
            {item.visit_mode === "clinic" && item.status === "confirmed" && item.queue_state === "awaiting_arrival" ? <Button loading={issueQr.isPending && issueQr.variables === item.id} label="Show check-in QR" variant="outline" disabled={issueQr.isPending} onPress={() => issueQr.mutate(item.id)} style={styles.actionButton} labelStyle={styles.actionLabel} /> : null}
            {item.visit_mode === "online" && ["confirmed", "in_consultation"].includes(item.status) ? <Button label="Join consultation" onPress={() => router.push({ pathname: "/visit-session", params: { ...clinicAppointmentCard(item), mode: "online-video" } } as unknown as Href)} style={styles.actionButton} labelStyle={styles.actionLabel} /> : null}
            {item.status === "pending" || item.status === "confirmed" ? <Button loading={cancel.isPending && cancel.variables?.id === item.id} label="Cancel booking" variant="outline" disabled={cancel.isPending} onPress={() => cancel.mutate(item)} style={styles.actionButton} labelStyle={styles.actionLabel} /> : null}
          </View> : null}
          {item.status === "completed" ? <Button label="Thank you · Rate doctor" variant="outline" onPress={() => router.push({ pathname: "/rate-doctor/[id]", params: { id: item.id } } as Href)} /> : null}
          {qr && qr.appointmentId === item.id ? <View style={styles.qr}><QRCode value={qr.token} size={220} /><Text>Show this to the clinic. It expires in five minutes.</Text></View> : null}
        </View>)}
    </FadedScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { gap: 16, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 126 },
  filters: { gap: 8 },
  listItem: { gap: 10 },
  loadingList: { gap: 12 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, minWidth: 0, paddingHorizontal: 6 },
  actionLabel: { fontSize: 12 },
  description: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular },
  emptyState: { alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 56 },
  emptyTitle: { color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 16, fontWeight: "600" },
  emptyDescription: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 13, textAlign: "center" },
  qr: { alignItems: "center", gap: 8, padding: 16, backgroundColor: colors.white },
  error: { color: colors.patient.text, fontFamily: fontFamilies.medium },
});
