import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Dropdown, FadedScrollView, Header } from "@startup/mobile-ui";
import DoctorCard from "../../components/DoctorCard";
import type { ConsultationType } from "../../types/appointment";
import { consultationFlows } from "../../utils/consultationFlow";
import {
  doctors,
  filterOptions,
  getDoctorProfileRoute,
} from "../../utils/doctorResultsConstants";
import type {
  DoctorFilter,
  DoctorResultsScreenProps,
} from "../../types/doctor-results";

export function DoctorResultsScreen({
  symptom,
  consultationType,
  onBackPress,
}: DoctorResultsScreenProps) {
  const [filter, setFilter] = useState<DoctorFilter>("distance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleFilterChange = (newFilter: DoctorFilter) => {
    setFilter(newFilter);
    if (newFilter === "rating" || newFilter === "experience") {
      setSortOrder("desc");
    } else {
      setSortOrder("asc");
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const sortedDoctors = useMemo(() => {
    return [...doctors].sort((a, b) => {
      let diff = 0;
      switch (filter) {
        case "experience":
          diff = a.experienceYears - b.experienceYears;
          break;
        case "rating":
          diff = a.ratingValue - b.ratingValue;
          break;
        case "fee":
          diff = a.feeValue - b.feeValue;
          break;
        case "distance":
        default:
          diff = a.distanceKm - b.distanceKm;
          break;
      }
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [filter, sortOrder]);

  return (
    <View style={styles.screen}>
      <Header
        title={`Specialists for ${symptom}`}
        app="patient"
        onBackPress={onBackPress}
        titleStyle={styles.headerTitle}
      />

      <View style={styles.topSection}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>Doctors available for your care</Text>
          </View>
          <View style={styles.filterActions}>
            <Dropdown
              accessibilityLabel="Sort doctors"
              options={filterOptions}
              value={filter}
              onValueChange={(value) => handleFilterChange(value as DoctorFilter)}
              triggerLabel="Filter"
              chevronSize={12}
              chevronColor={colors.patient.primaryDark}
              containerStyle={styles.filterContainer}
              triggerStyle={styles.filterTrigger}
              valueStyle={styles.filterValue}
              menuWidth={176}
            />
            <Pressable
              accessibilityLabel={
                sortOrder === "asc"
                  ? "Sort ascending (tap for descending)"
                  : "Sort descending (tap for ascending)"
              }
              accessibilityRole="button"
              onPress={toggleSortOrder}
              style={({ pressed }) => [
                styles.sortOrderButton,
                pressed && styles.sortOrderButtonPressed,
              ]}
            >
              {sortOrder === "asc" ? (
                <ArrowUp
                  color={colors.patient.primaryDark}
                  size={14}
                  strokeWidth={2.4}
                />
              ) : (
                <ArrowDown
                  color={colors.patient.primaryDark}
                  size={14}
                  strokeWidth={2.4}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>
      <FadedScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: colors.patient.background,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 126,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
     paddingHorizontal: spacing.xs,
  },
  headingCopy: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  filterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  filterContainer: {
    flexShrink: 0,
  },
  filterTrigger: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
    borderRadius: 999,
    backgroundColor: colors.patient.surface,
  },
  filterValue: {
    flexShrink: 0,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  sortOrderButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
    borderRadius: 999,
    backgroundColor: colors.patient.surface,
  },
  sortOrderButtonPressed: {
    opacity: 0.72,
  },
  list: {
    gap: 12,
  },
});
