import { useAppointments } from "../hooks/useAppointments";
import { appointmentRecoveryView } from "@startup/contracts";
import { AppointmentRecoveryActions } from "../components/AppointmentRecoveryActions";
import { bookingFilters } from "../utils/appointmentsConstants";
import { AppText as Text } from "@startup/mobile-ui";
import { useState } from "react";

import { ScrollView, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import {
  Button,
  Chip,
  FadedScrollView,
  Header,
  ModalSurface,
  Skeleton,
} from "@startup/mobile-ui";
import BookingCard from "../components/BookingCard";
import type { AppointmentsScreenProps } from "../types/appointments";
import { clinicAppointmentCard } from "../utils/clinicAppointmentCard";
import { clinicVisitRoute } from "../utils/clinicVisit";

export function AppointmentsScreen({ onBackPress }: AppointmentsScreenProps) {
  const { filter, setFilter, appointments, cancel, visible, now } =
    useAppointments({
      onBackPress,
    });
  const [menuAppointmentId, setMenuAppointmentId] = useState<string | null>(
    null
  );
  const menuAppointment = visible.find(
    (item) =>
      item.id === menuAppointmentId &&
      appointmentRecoveryView(item, now).canCancel
  );
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
            <Skeleton theme="patient" height={144} radius={16} />
            <Skeleton theme="patient" height={144} radius={16} />
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
        {visible.map((item) => {
          const recovery = appointmentRecoveryView(item, now);
          const canShowQr = recovery.canShowQr;
          const canJoin = recovery.canJoin;
          const canCancel = recovery.canCancel;
          const showQueue = recovery.canShowQueue;
          const hasFooter =
            canShowQr ||
            canJoin ||
            showQueue ||
            item.status === "completed" ||
            recovery.canReschedule ||
            recovery.canReview ||
            recovery.bookAgain ||
            Boolean(recovery.message) ||
            Boolean(item.recovery?.request) ||
            Boolean(item.recovery?.rescheduled_to_id);
          return (
            <BookingCard
              key={item.id}
              appointment={clinicAppointmentCard(item)}
              statusLabel={recovery.patientStatus}
              onMorePress={
                canCancel ? () => setMenuAppointmentId(item.id) : undefined
              }
              moreDisabled={cancel.isPending}
              moreLoading={cancel.isPending && cancel.variables?.id === item.id}
              onPress={() =>
                router.push({
                  pathname: "/appointment-details/[id]",
                  params: { id: item.id },
                } as Href)
              }
              footer={
                hasFooter ? (
                  <View style={styles.cardActions}>
                    <AppointmentRecoveryActions
                      item={item}
                      now={now}
                      buttonStyle={styles.actionButton}
                      labelStyle={styles.actionLabel}
                    />
                    {canShowQr || showQueue ? (
                      <Button
                        label={
                          canShowQr ? "Show check-in QR" : "View clinic queue"
                        }
                        onPress={() =>
                          router.push(clinicVisitRoute(item) as unknown as Href)
                        }
                        style={styles.actionButton}
                        labelStyle={styles.actionLabel}
                      />
                    ) : null}
                    {canJoin ? (
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
                    {item.status === "completed" ? (
                      <View style={styles.ratingRow}>
                        <Text variant="inherit" style={styles.thankYou}>
                          Thank you
                        </Text>
                        <Button
                          label="Rate doctor"
                          variant="outline"
                          style={styles.actionButton}
                          labelStyle={styles.actionLabel}
                          onPress={() =>
                            router.push({
                              pathname: "/rate-doctor/[id]",
                              params: { id: item.id },
                            } as Href)
                          }
                        />
                      </View>
                    ) : null}
                  </View>
                ) : undefined
              }
            />
          );
        })}
      </FadedScrollView>
      <ModalSurface
        visible={Boolean(menuAppointment)}
        onClose={() => setMenuAppointmentId(null)}
        dismissOnBackdrop
      >
        <Text variant="inherit" style={styles.menuTitle}>
          Booking actions
        </Text>
        <Text variant="inherit" style={styles.description}>
          {menuAppointment?.doctor_name}
          {menuAppointment ? ` · ${menuAppointment.public_code.slice(-8)}` : ""}
        </Text>
        <Button
          theme="patient"
          label="Cancel booking"
          variant="danger"
          disabled={cancel.isPending || !menuAppointment}
          loading={
            cancel.isPending && cancel.variables?.id === menuAppointmentId
          }
          onPress={() => {
            if (!menuAppointment || cancel.isPending) return;
            setMenuAppointmentId(null);
            cancel.mutate(menuAppointment);
          }}
        />
        <Button
          theme="patient"
          label="Close"
          variant="ghost"
          onPress={() => setMenuAppointmentId(null)}
        />
      </ModalSurface>
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
  loadingList: { gap: 12 },
  cardActions: { gap: 12 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  thankYou: {
    color: colors.white,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    alignSelf: "stretch",
    minWidth: 0,
    borderColor: "#FFFFFF99",
    borderWidth: 1,
  },
  actionLabel: { fontSize: 14, color: colors.white },
  menuTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  description: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
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
  error: { color: colors.patient.text, fontFamily: fontFamilies.medium },
});
