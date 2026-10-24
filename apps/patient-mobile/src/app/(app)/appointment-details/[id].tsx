import { AppText as Text } from "@startup/mobile-ui";
import { useLocalSearchParams, router, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { listClinicAppointments } from "@startup/data-access";
import type { ClinicAppointment } from "@startup/contracts";
import { appointmentRecoveryView } from "@startup/contracts";
import { AppointmentRecoveryActions } from "../../../features/appointments/components/AppointmentRecoveryActions";
import { useAppointmentClock } from "../../../features/appointments/hooks/useAppointmentClock";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import {
  Card,
  FadedScrollView,
  Header,
  Loader,
  useToastFeedback,
} from "@startup/mobile-ui";
import { Button } from "@startup/mobile-ui";
import BookingCard from "../../../features/appointments/components/BookingCard";
import { clinicAppointmentCard } from "../../../features/appointments/utils/clinicAppointmentCard";
import {
  canOpenClinicVisit,
  clinicVisitRoute,
} from "../../../features/appointments/utils/clinicVisit";
import { supabase } from "../../../services/supabase";

export default function AppointmentDetailsRoute() {
  const now = useAppointmentClock();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointments = useQuery<ClinicAppointment[]>({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase),
  });
  useToastFeedback({
    error: appointments.isError
      ? "Could not load this appointment. Go back and try again."
      : "",
  });
  const item = appointments.data?.find(
    (appointment: ClinicAppointment) => appointment.id === id
  ) as ClinicAppointment | undefined;
  const card = item ? clinicAppointmentCard(item) : null;

  return (
    <View style={styles.screen}>
      <Header
        title="Appointment Details"
        app="patient"
        onBackPress={() => router.back()}
      />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {appointments.isLoading ? (
          <Loader theme="patient" size="large" style={styles.loading} />
        ) : null}
        {!appointments.isLoading && !appointments.isError && !item ? (
          <Text variant="body" style={styles.message}>
            This appointment is not available.
          </Text>
        ) : null}
        {item && card ? (
          <>
            <BookingCard
              appointment={card}
              statusLabel={appointmentRecoveryView(item, now).patientStatus}
            />
            <AppointmentRecoveryActions item={item} now={now} />
            <Card theme="patient" backgroundColor={colors.white} gap={12}>
              <Text variant="sectionHeading" style={styles.sectionTitle}>
                Appointment details
              </Text>
              <Detail label="Appointment ID" value={card.id.slice(-8)} />
              <Detail label="Visit type" value={card.consultationType} />
              <Detail
                label="Date and time"
                value={`${card.date}, ${card.time}`}
              />
              <Detail label="Facility" value={card.hospital} />
              {card.location && card.location !== card.hospital ? (
                <Detail label="Location" value={card.location} />
              ) : null}
              <Detail label="Consultation fee" value={card.fee} />
              {card.experience ? (
                <Detail label="Doctor experience" value={card.experience} />
              ) : null}
              {card.qualification ? (
                <Detail label="Qualification" value={card.qualification} />
              ) : null}
              {item.reason ? (
                <Detail label="Reason for visit" value={item.reason} />
              ) : null}
            </Card>
            {item.status === "completed" ? (
              <View style={styles.ratingRow}>
                <Text variant="body" style={styles.thankYou}>
                  Thank you
                </Text>
                <Button
                  label="Rate doctor"
                  onPress={() =>
                    router.push({
                      pathname: "/rate-doctor/[id]",
                      params: { id: item.id },
                    })
                  }
                />
              </View>
            ) : null}
            {canOpenClinicVisit(item, new Date(now)) ? (
              <Button
                label={
                  item.queue_state === "awaiting_arrival"
                    ? "Show check-in QR"
                    : "View clinic queue"
                }
                onPress={() =>
                  router.push(clinicVisitRoute(item) as unknown as Href)
                }
              />
            ) : null}
          </>
        ) : null}
      </FadedScrollView>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="label" style={styles.detailLabel}>
        {label}
      </Text>
      <Text variant="bodyEmphasis" style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: { gap: 16, padding: spacing.lg, paddingBottom: 126 },
  loading: { minHeight: 160 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  thankYou: { color: colors.patient.text, fontFamily: fontFamilies.medium },
  message: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  detailLabel: {
    flex: 1,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  detailValue: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    textAlign: "right",
  },
});
