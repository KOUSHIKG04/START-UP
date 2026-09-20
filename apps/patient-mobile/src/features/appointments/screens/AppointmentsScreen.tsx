import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Chip, FadedScrollView, Header } from "@startup/mobile-ui";
import BookingCard from "../components/BookingCard";
import type { Appointment } from "../types/appointment";
import { appointments } from "../utils/appointments";
import type {
  AppointmentsScreenProps,
  BookingFilter,
} from "../types/appointments";

const bookingFilters: readonly BookingFilter[] = [
  "Clinic Visit",
  "Home Visit",
  "Online",
  "Medicine and test",
];

function openAppointment(appointment: Appointment) {
  router.push({
    pathname: "/booking-status",
    params: { ...appointment, status: "approved" },
  } as unknown as Href);
}

export function AppointmentsScreen({ onBackPress }: AppointmentsScreenProps) {
  const [filter, setFilter] = useState<BookingFilter>("Home Visit");
  const visibleAppointments = useMemo(
    () => appointments.filter((item) => item.consultationType === filter),
    [filter]
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
          {bookingFilters.map((option) => {
            const selected = filter === option;
            return (
              <Chip
                key={option}
                variant="radio"
                selected={selected}
                theme="patient"
                label={option}
                onPress={() => setFilter(option)}
              />
            );
          })}
        </ScrollView>

        {visibleAppointments.length ? (
          <View style={styles.list}>
            {visibleAppointments.map((appointment) => (
              <BookingCard
                key={appointment.id}
                appointment={appointment}
                onPress={() => openAppointment(appointment)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No bookings here yet</Text>
            <Text style={styles.emptyDescription}>
              Appointments of this type will appear here.
            </Text>
          </View>
        )}
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
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  filters: { gap: 8 },
  list: { gap: 14 },
  emptyState: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  emptyTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyDescription: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    textAlign: "center",
  },
});
