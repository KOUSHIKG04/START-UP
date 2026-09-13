import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Chip, Header } from "@startup/mobile-ui";
import BookingCard from "../../components/BookingCard";
import type { Appointment } from "../../types/appointment";
import { appointments } from "../../utils/appointments";
import type { PatientScreenProps } from "../types";

type BookingFilter =
  | "Clinic Visit"
  | "Home Visit"
  | "Online"
  | "Medicine and test";

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

export function AppointmentsScreen({ onBackPress }: PatientScreenProps) {
  const [filter, setFilter] = useState<BookingFilter>("Home Visit");
  const visibleAppointments = useMemo(
    () => appointments.filter((item) => item.consultationType === filter),
    [filter]
  );

  return (
    <View style={styles.screen}>
      <Header title="My Bookings" app="patient" onBackPress={onBackPress} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Bookings</Text>
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
                label={option}
                accessibilityState={{ selected }}
                onPress={() => setFilter(option)}
                style={[styles.filter, selected && styles.selectedFilter]}
                labelStyle={
                  selected ? styles.selectedFilterText : styles.filterText
                }
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
      </ScrollView>
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
  filter: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderWidth: 0,
    backgroundColor: colors.patient.surface,
  },
  selectedFilter: { backgroundColor: colors.patient.primaryDark },
  filterText: { color: colors.patient.primaryDark },
  selectedFilterText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
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
