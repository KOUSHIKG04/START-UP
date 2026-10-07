import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { listClinicAppointments } from "@startup/data-access";
import type { ClinicAppointment } from "@startup/contracts";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Card, FadedScrollView, Header, Loader, useToastFeedback } from "@startup/mobile-ui";
import { Button } from "@startup/mobile-ui";
import BookingCard from "../../../features/appointments/components/BookingCard";
import { clinicAppointmentCard } from "../../../features/appointments/utils/clinicAppointmentCard";
import { supabase } from "../../../services/supabase";

export default function AppointmentDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointments = useQuery<ClinicAppointment[]>({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase),
    refetchInterval: 15000,
  });
  useToastFeedback({ error: appointments.isError ? "Could not load this appointment. Go back and try again." : "" });
  const item = appointments.data?.find((appointment: ClinicAppointment) => appointment.id === id) as ClinicAppointment | undefined;
  const card = item ? clinicAppointmentCard(item) : null;

  return <View style={styles.screen}>
    <Header title="Appointment Details" app="patient" onBackPress={() => router.back()} />
    <FadedScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {appointments.isLoading ? <Loader theme="patient" size="large" style={styles.loading} /> : null}
      {!appointments.isLoading && !appointments.isError && !item ? <Text style={styles.message}>This appointment is not available.</Text> : null}
      {item && card ? <>
        <BookingCard appointment={card} statusLabel={item.status.replaceAll("_", " ")} />
        <Card theme="patient" backgroundColor={colors.white} gap={12}>
          <Text style={styles.sectionTitle}>Appointment details</Text>
          <Detail label="Appointment ID" value={card.id} />
          <Detail label="Visit type" value={card.consultationType} />
          <Detail label="Date and time" value={`${card.date}, ${card.time}`} />
          <Detail label="Facility" value={card.hospital} />
          {card.location && card.location !== card.hospital ? <Detail label="Location" value={card.location} /> : null}
          <Detail label="Consultation fee" value={card.fee} />
          {card.experience ? <Detail label="Doctor experience" value={card.experience} /> : null}
          {card.qualification ? <Detail label="Qualification" value={card.qualification} /> : null}
          {item.reason ? <Detail label="Reason for visit" value={item.reason} /> : null}
        </Card>
        {item.status === "completed" ? <Button label="Thank you · Rate doctor" onPress={() => router.push({ pathname: "/rate-doctor/[id]", params: { id: item.id } })} /> : null}
        {item.visit_mode === "clinic" && item.queue_state ? <Text style={styles.message}>Queue: {item.queue_state.replaceAll("_", " ")}{item.ticket_number ? ` · ticket ${item.ticket_number}` : ""}{item.queue_state === "waiting" ? ` · ${item.ahead_count} ahead` : ""}</Text> : null}
      </> : null}
    </FadedScrollView>
  </View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { gap: 16, padding: spacing.lg, paddingBottom: 126 },
  loading: { minHeight: 160 },
  message: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 14 },
  sectionTitle: { color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  detailLabel: { flex: 1, color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 13 },
  detailValue: { flex: 1, color: colors.patient.text, fontFamily: fontFamilies.medium, fontSize: 13, textAlign: "right" },
});
