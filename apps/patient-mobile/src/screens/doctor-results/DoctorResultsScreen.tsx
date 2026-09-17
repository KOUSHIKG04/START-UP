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
import DoctorCard, { type DoctorCardProps } from "../../components/DoctorCard";
import type { ConsultationType } from "../../types/appointment";
import { consultationFlows } from "../../utils/consultationFlow";
import type { PatientScreenProps } from "../types";

type DoctorResultsScreenProps = PatientScreenProps & {
  symptom: string;
  consultationType: ConsultationType;
};

type DoctorResult = DoctorCardProps & {
  distanceKm: number;
  experienceYears: number;
  ratingValue: number;
  feeValue: number;
};

type DoctorFilter = "distance" | "experience" | "rating" | "fee";

const filterOptions: readonly DropdownOption[] = [
  { label: "By distance", value: "distance" },
  { label: "By experience", value: "experience" },
  { label: "By ratings", value: "rating" },
  { label: "Consultation fee", value: "fee" },
];

const doctors: DoctorResult[] = [
  {
    name: "Dr. Ananya Sharma",
    qualification: "MBBS, MD (General Medicine)",
    specialty: "General Physician",
    experience: "8+ years experience",
    rating: "4.8 (120+ reviews)",
    fee: "₹500",
    distanceKm: 2.4,
    experienceYears: 8,
    ratingValue: 4.8,
    feeValue: 500,
  },
  {
    name: "Dr. Mandira Rao",
    qualification: "MBBS, MD (General Medicine)",
    specialty: "General Physician",
    experience: "7+ years experience",
    rating: "4.7 (96 reviews)",
    fee: "₹450",
    distanceKm: 1.8,
    experienceYears: 7,
    ratingValue: 4.7,
    feeValue: 450,
  },
  {
    name: "Dr. Sriram Reddy",
    qualification: "MBBS, DNB, Superspecialist",
    specialty: "General Physician",
    experience: "11+ years experience",
    rating: "4.9 (180+ reviews)",
    fee: "₹650",
    distanceKm: 4.1,
    experienceYears: 11,
    ratingValue: 4.9,
    feeValue: 650,
  },
  {
    name: "Dr. Deepthi Nair",
    qualification: "MBBS, DNB, Superspecialist",
    specialty: "General Physician",
    experience: "9+ years experience",
    rating: "4.8 (140+ reviews)",
    fee: "₹600",
    distanceKm: 3.2,
    experienceYears: 9,
    ratingValue: 4.8,
    feeValue: 600,
  },
];

function getDoctorProfileRoute(
  doctor: DoctorResult,
  consultationType: ConsultationType
) {
  return {
    pathname: "/doctor-profile",
    params: {
      name: doctor.name,
      qualification: doctor.qualification,
      specialty: doctor.specialty,
      experience: doctor.experience,
      rating: doctor.rating,
      fee: doctor.fee,
      consultationType,
    },
  } as unknown as Href;
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
    color: colors.white,
    // fontFamily: fontFamilies.medium,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
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
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 28,
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
