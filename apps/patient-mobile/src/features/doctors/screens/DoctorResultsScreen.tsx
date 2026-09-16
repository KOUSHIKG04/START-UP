import type { DoctorResult } from "@/features/doctors/types";
import { doctors } from "@/features/doctors/data/mockDoctors";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import {
  Dropdown,
  FadedScrollView,
  Header,
  type DropdownOption,
} from "@startup/mobile-ui";
import DoctorCard from "@/features/doctors/components/DoctorCard";
import type { ConsultationType } from "@/types/appointment";
import { consultationFlows } from "@/features/appointments/utils/consultationFlow";
import type { PatientScreenProps } from "@/types/screen";

type DoctorResultsScreenProps = PatientScreenProps & {
  symptom: string;
  consultationType: ConsultationType;
};

type DoctorFilter = "distance" | "experience" | "rating" | "fee";

const filterOptions: readonly DropdownOption[] = [
  { label: "By distance", value: "distance" },
  { label: "By experience", value: "experience" },
  { label: "By ratings", value: "rating" },
  { label: "Consultation fee", value: "fee" },
];

function getDoctorProfileRoute(
  doctor: DoctorResult,
  consultationType: ConsultationType
) {
  return {
    pathname: "/doctor/[id]",
    params: { id: doctor.id, consultationType },
  } satisfies Href;
}

export function DoctorResultsScreen({
  symptom,
  consultationType,
  onBackPress,
}: DoctorResultsScreenProps) {
  const [filter, setFilter] = useState<DoctorFilter>("distance");
  const sortedDoctors = useMemo(() => {
    return [...doctors].sort((a, b) => {
      switch (filter) {
        case "experience":
          return b.experienceYears - a.experienceYears;
        case "rating":
          return b.ratingValue - a.ratingValue;
        case "fee":
          return a.feeValue - b.feeValue;
        case "distance":
        default:
          return a.distanceKm - b.distanceKm;
      }
    });
  }, [filter]);

  return (
    <View style={styles.screen}>
      <Header
        title={`Specialists for ${symptom}`}
        app="patient"
        onBackPress={onBackPress}
        titleStyle={styles.headerTitle}
      />

      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>Doctors available for your care</Text>
            <Text style={styles.subtitle}>
              {consultationFlows[consultationType].resultsDescription}
            </Text>
          </View>
          <Dropdown
            accessibilityLabel="Sort doctors"
            options={filterOptions}
            value={filter}
            onValueChange={(value) => setFilter(value as DoctorFilter)}
            containerStyle={styles.filterContainer}
            triggerStyle={styles.filterTrigger}
            valueStyle={styles.filterValue}
          />
        </View>

        <View style={styles.list}>
          {sortedDoctors.map((doctor) => (
            <DoctorCard
              key={doctor.name}
              {...doctor}
              contextLabel={consultationFlows[consultationType].profileContext}
              onPress={() =>
                router.push(getDoctorProfileRoute(doctor, consultationType))
              }
            />
          ))}
        </View>
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.patient.background,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 126,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  headingCopy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  subtitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  filterContainer: {
    width: 142,
  },
  filterTrigger: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 0,
    borderRadius: 18,
    backgroundColor: colors.patient.surface,
  },
  filterValue: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  list: {
    gap: 12,
  },
});
