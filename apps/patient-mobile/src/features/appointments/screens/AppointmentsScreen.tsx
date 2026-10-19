import { useAppointments } from "../hooks/useAppointments";
import { bookingFilters } from "../utils/appointmentsConstants";
import { AppText as Text } from "@startup/mobile-ui";

import { ScrollView, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import QRCode from "react-qr-code";

import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import {
  Button,
  Chip,
  FadedScrollView,
  Header,
  Skeleton,
} from "@startup/mobile-ui";
import BookingCard from "../components/BookingCard";
import type { AppointmentsScreenProps } from "../types/appointments";
import { clinicAppointmentCard } from "../utils/clinicAppointmentCard";

export function AppointmentsScreen({ onBackPress }: AppointmentsScreenProps) {
  const { filter, setFilter, qr, appointments, cancel, issueQr, visible } =
    useAppointments({ onBackPress });
  return (
    <View style={styles.screen}>
      <Header title="My Bookings" app="patient" onBackPress={onBackPress} />
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          contentContainerStyle={styles.filters}
          showsHorizontalScrollIndicator={false}
        >
          {bookingFilters.map((option) => (
            <Chip
              key={option}
              variant="radio"
              selected={filter === option}
              theme="patient"
              label={option}
              onPress={() => setFilter(option)}
            />
          ))}
        </ScrollView>
        {appointments.isLoading ? (
          <View style={styles.loadingList}>
            <Skeleton theme="patient" height={148} radius={16} />
            <Skeleton theme="patient" height={148} radius={16} />
          </View>
        ) : null}
        {!appointments.isLoading &&
        !appointments.isError &&
        visible.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="cardHeading" style={styles.emptyTitle}>
              No {filter === "All" ? "" : `${filter.toLowerCase()} `}bookings
              yet
            </Text>
            <Text variant="body" style={styles.emptyDescription}>
              {filter === "Medicine and test"
                ? "This booking type is not connected yet."
                : "Find a verified doctor and choose an available slot."}
            </Text>
            {filter !== "Medicine and test" ? (
              <Button
                label="Find a doctor"
                onPress={() => router.push("/find-doctor" as Href)}
              />
            ) : null}
          </View>
        ) : null}
        {visible.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <BookingCard
              appointment={clinicAppointmentCard(item)}
              statusLabel={item.status.replaceAll("_", " ")}
              onPress={() =>
                router.push({
                  pathname: "/appointment-details/[id]",
                  params: { id: item.id },
                } as Href)
              }
            />
            {item.visit_mode === "clinic" && item.queue_state ? (
              <Text variant="body" style={styles.description}>
                Queue: {item.queue_state.replaceAll("_", " ")}
                {item.ticket_number ? ` · ticket ${item.ticket_number}` : ""}
                {item.queue_state === "waiting"
                  ? ` · ${item.ahead_count} ahead`
                  : ""}
              </Text>
            ) : null}
            {item.status === "pending" ||
            item.status === "confirmed" ||
            (item.visit_mode === "online" &&
              item.status === "in_consultation") ? (
              <View style={styles.actionRow}>
                {item.visit_mode === "clinic" &&
                item.status === "confirmed" &&
                item.queue_state === "awaiting_arrival" ? (
                  <Button
                    loading={issueQr.isPending && issueQr.variables === item.id}
                    label="Show check-in QR"
                    variant="outline"
                    disabled={issueQr.isPending}
                    onPress={() => issueQr.mutate(item.id)}
                    style={styles.actionButton}
                    labelStyle={styles.actionLabel}
                  />
                ) : null}
                {item.visit_mode === "online" &&
                ["confirmed", "in_consultation"].includes(item.status) ? (
                  <Button
                    label="Join consultation"
                    onPress={() =>
                      router.push({
                        pathname: "/visit-session",
                        params: {
                          ...clinicAppointmentCard(item),
                          mode: "online-video",
                        },
                      } as unknown as Href)
                    }
                    style={styles.actionButton}
                    labelStyle={styles.actionLabel}
                  />
                ) : null}
                {item.status === "pending" || item.status === "confirmed" ? (
                  <Button
                    loading={
                      cancel.isPending && cancel.variables?.id === item.id
                    }
                    label="Cancel booking"
                    variant="outline"
                    disabled={cancel.isPending}
                    onPress={() => cancel.mutate(item)}
                    style={styles.actionButton}
                    labelStyle={styles.actionLabel}
                  />
                ) : null}
              </View>
            ) : null}
            {item.status === "completed" ? (
              <Button
                label="Thank you · Rate doctor"
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: "/rate-doctor/[id]",
                    params: { id: item.id },
                  } as Href)
                }
              />
            ) : null}
            {qr && qr.appointmentId === item.id ? (
              <View style={styles.qr}>
                <QRCode value={qr.token} size={220} />
                <Text variant="body">
                  Show this to the clinic. It expires in five minutes.
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: {
    gap: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  filters: { gap: 8 },
  listItem: { gap: 10 },
  loadingList: { gap: 12 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, minWidth: 0, paddingHorizontal: 6 },
  actionLabel: { fontSize: 12 },
  description: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  emptyTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyDescription: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: "center",
  },
  qr: {
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: colors.white,
  },
  error: { color: colors.patient.text, fontFamily: fontFamilies.medium },
});
