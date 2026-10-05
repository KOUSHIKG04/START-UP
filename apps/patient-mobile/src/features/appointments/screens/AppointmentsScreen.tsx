import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { issueClinicCheckinToken, listClinicAppointments, transitionClinicAppointment } from "@startup/data-access";
import { formatDisplayDate, type ClinicAppointment } from "@startup/contracts";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Button, Chip, FadedScrollView, Header } from "@startup/mobile-ui";
import BookingCard from "../components/BookingCard";
import type { Appointment } from "../types/appointment";
import type { AppointmentsScreenProps, BookingFilter } from "../types/appointments";
import { supabase } from "../../../services/supabase";

const bookingFilters: readonly BookingFilter[] = ["Clinic Visit", "Home Visit", "Online", "Medicine and test"];

function asCard(item: ClinicAppointment): Appointment {
  const start = new Date(item.starts_at);
  return {
    id: item.public_code,
    backendId: item.id,
    doctorName: item.doctor_name,
    qualification: "",
    specialty: item.facility_name,
    consultationType: item.visit_mode === "online" ? "Online" : item.visit_mode === "home" ? "Home Visit" : "Clinic Visit",
    date: formatDisplayDate(start),
    time: start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    hospital: item.facility_name,
    location: item.facility_name,
    experience: "",
    rating: "",
    fee: `${item.currency} ${(Number(item.fee_minor) / 100).toFixed(2)}`,
    status: item.status === "confirmed" || item.status === "in_consultation" || item.status === "completed" ? "approved" : "pending",
  };
}

export function AppointmentsScreen({ onBackPress }: AppointmentsScreenProps) {
  const [filter, setFilter] = useState<BookingFilter>("Clinic Visit");
  const [error, setError] = useState("");
  const [qr, setQr] = useState<{ appointmentId: string; token: string } | null>(null);
  const queryClient = useQueryClient();
  const appointments = useQuery({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase),
    refetchInterval: 15000,
  });
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
    onSuccess: () => { setError(""); void queryClient.invalidateQueries({ queryKey: ["patient-clinic-appointments"] }); },
    onError: () => setError("Could not cancel this booking. Refresh and try again."),
  });
  const issueQr = useMutation({
    mutationFn: async (appointmentId: string) => ({ appointmentId, token: await issueClinicCheckinToken(supabase!, appointmentId) }),
    onSuccess: (result) => {
      setQr(result);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["patient-clinic-appointments"] });
    },
    onError: () => setError("Check-in QR is available on your clinic day. Try again then."),
  });

  return <View style={styles.screen}>
    <Header title="My Bookings" app="patient" onBackPress={onBackPress} />
    <FadedScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
        {bookingFilters.map((option) => <Chip key={option} variant="radio" selected={filter === option} theme="patient" label={option} onPress={() => setFilter(option)} />)}
      </ScrollView>
      {filter === "Clinic Visit" || filter === "Online" ? <>
        {appointments.isLoading ? <Text style={styles.description}>Loading your bookings…</Text> : null}
        {appointments.isError ? <Text accessibilityRole="alert" style={styles.description}>Could not load bookings. Reopen this page to retry.</Text> : null}
        {appointments.data?.filter(item => item.visit_mode === (filter === "Online" ? "online" : "clinic")).length === 0 ? <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No {filter === "Online" ? "online" : "clinic"} bookings yet</Text>
          <Text style={styles.emptyDescription}>Find a verified doctor and choose an available slot.</Text>
          <Button label="Find a doctor" onPress={() => router.push("/find-doctor" as Href)} />
        </View> : null}
        {appointments.data?.filter(item => item.visit_mode === (filter === "Online" ? "online" : "clinic")).map((item) => <View key={item.id} style={styles.listItem}>
          <BookingCard appointment={asCard(item)} statusLabel={item.status.replaceAll("_", " ")} onPress={item.visit_mode === "online" && ["pending", "confirmed", "in_consultation"].includes(item.status) ? () => router.push({ pathname: "/booking-status", params: asCard(item) } as unknown as Href) : undefined} />
          {item.queue_state ? <Text style={styles.description}>Queue: {item.queue_state.replaceAll("_", " ")}{item.ticket_number ? ` · ticket ${item.ticket_number}` : ""}{item.queue_state === "waiting" ? ` · ${item.ahead_count} ahead` : ""}</Text> : null}
          {item.visit_mode === "clinic" && item.status === "confirmed" && item.queue_state === "awaiting_arrival" ? <Button label="Show check-in QR" variant="outline" disabled={issueQr.isPending} onPress={() => issueQr.mutate(item.id)} /> : null}
          {item.visit_mode === "online" && ["confirmed", "in_consultation"].includes(item.status) ? <Button label="Join consultation" onPress={() => router.push({ pathname: "/visit-session", params: { ...asCard(item), mode: "online-video" } } as unknown as Href)} /> : null}
          {qr?.appointmentId === item.id ? <View style={styles.qr}><QRCode value={qr.token} size={220} /><Text>Show this to the clinic. It expires in five minutes.</Text></View> : null}
          {item.status === "pending" || item.status === "confirmed" ? <Button label="Cancel booking" variant="outline" disabled={cancel.isPending} onPress={() => cancel.mutate(item)} /> : null}
          {item.status === "completed" ? (
            <Button
              label="View Prescription"
              onPress={() =>
                router.push({
                  pathname: "/prescription",
                  params: {
                    appointmentId: item.id,
                    id: item.public_code,
                    doctorName: item.doctor_name,
                    hospital: item.facility_name,
                    date: formatDisplayDate(item.starts_at),
                  },
                } as unknown as Href)
              }
            />
          ) : null}
        </View>)}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </> : <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No {filter.toLowerCase()} bookings yet</Text>
        <Text style={styles.emptyDescription}>This booking type is not connected yet.</Text>
      </View>}
    </FadedScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { gap: 16, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 126 },
  filters: { gap: 8 },
  listItem: { gap: 10 },
  description: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular },
  emptyState: { alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 56 },
  emptyTitle: { color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 16, fontWeight: "600" },
  emptyDescription: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 13, textAlign: "center" },
  qr: { alignItems: "center", gap: 8, padding: 16, backgroundColor: colors.white },
  error: { color: colors.patient.text, fontFamily: fontFamilies.medium },
});
