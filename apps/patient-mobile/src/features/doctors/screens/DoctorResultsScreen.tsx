import { useDoctorResults } from "../hooks/useDoctorResults";
import type { SortBy } from "../types/doctor-results";

export type { SortBy } from "../types/doctor-results";

import { AppText as Text } from "@startup/mobile-ui";
import { Button } from "@startup/mobile-ui";

import { Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import { ArrowDown, ArrowUp } from "lucide-react-native";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import {
  Dropdown,
  FadedScrollView,
  Header,
  Loader,
  Skeleton,
} from "@startup/mobile-ui";
import DoctorCard from "../components/DoctorCard";
import { filterOptions } from "../utils/doctorResultsConstants";

import type { DoctorResultsScreenProps } from "../types/doctor-results";
import { formatConsultationFee } from "../utils/doctorDisplay";

export function DoctorResultsScreen({
  symptom,
  consultationType,
  onBackPress,
}: DoctorResultsScreenProps) {
  const {
    refresh,
    isOnline,
    filter,
    setFilter,
    sortOrder,
    setSortOrder,
    coordinates,
    locating,
    setOnlineOffset,
    onlineQuery,
    isLoading,
    isError,
    practices,
    requestLocation,
    toggleSortOrder,
  } = useDoctorResults({ symptom, consultationType, onBackPress });
  return (
    <View style={styles.screen}>
      <Header
        title={
          symptom === "your symptoms"
            ? "All doctors"
            : `Specialists for ${symptom}`
        }
        app="patient"
        onBackPress={onBackPress}
        titleStyle={styles.headerTitle}
      />
      <View style={styles.topSection}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text variant="cardHeading" style={styles.title}>
              Find a doctor for your care
            </Text>
          </View>
          <View style={styles.filterActions}>
            <Dropdown
              accessibilityLabel="Sort doctors"
              options={
                isOnline
                  ? filterOptions.filter(
                      (option) => option.value !== "distance"
                    )
                  : filterOptions
              }
              value={filter}
              onValueChange={(value) => {
                setFilter(value as SortBy);
                setSortOrder(
                  value === "rating" || value === "experience" ? "desc" : "asc"
                );
                if (value === "distance" && !coordinates)
                  void requestLocation();
              }}
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
        onRefresh={refresh}
        refreshTheme="patient"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {locating && !isLoading ? (
          <Loader theme="patient" style={styles.loading} />
        ) : null}
        {isLoading ? (
          <View
            accessibilityLabel="Loading doctors"
            style={styles.skeletonList}
          >
            {[0, 1, 2].map((index) => (
              <View key={index} style={styles.skeletonCard}>
                <Skeleton theme="patient" width={54} height={54} radius={27} />
                <View style={styles.skeletonCopy}>
                  <Skeleton theme="patient" width="72%" height={18} />
                  <Skeleton theme="patient" width="50%" height={14} />
                  <Skeleton theme="patient" width="88%" height={14} />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {practices.length === 0 && !locating && !isLoading && !isError ? (
          <View style={styles.empty}>
            <Text variant="cardHeading" style={styles.emptyTitle}>
              {symptom === "your symptoms"
                ? "No doctors available yet"
                : "No doctors match this search"}
            </Text>
            <Text variant="body" style={styles.message}>
              {symptom === "your symptoms"
                ? "Doctors appear here after their clinic is verified and they publish a service."
                : "Try another symptom, category, or browse all available doctors."}
            </Text>
          </View>
        ) : null}
        <View style={styles.list}>
          {practices.map((practice) => (
            <DoctorCard
              key={practice.doctor_id}
              name={practice.doctor_name}
              qualification={practice.qualification ?? ""}
              specialty={
                practice.specialties.map((item) => item.name).join(", ") ||
                practice.service_name
              }
              experience={`${practice.experience_years} Years Experience`}
              rating={
                practice.rating === null
                  ? "No ratings yet"
                  : `${practice.rating} (${practice.review_count} reviews)`
              }
              showRating
              fee={formatConsultationFee(practice.fee_minor, practice.currency)}
              distanceMeters={isOnline ? null : practice.distance_meters}
              contextLabel={
                consultationType === "Online"
                  ? "Video consultation"
                  : consultationType === "Home Visit"
                    ? "Home Visit"
                    : "Clinic Visit"
              }
              onPress={() =>
                router.push({
                  pathname: "/doctor-profile",
                  params: {
                    practiceId: practice.practice_id,
                    serviceId: practice.practice_service_id ?? "",
                    consultationType,
                  },
                } as unknown as Href)
              }
            />
          ))}
        </View>
        {isOnline && onlineQuery.data?.length === 50 ? (
          <Button
            loading={onlineQuery.isFetching}
            variant="ghost"
            label="Load more doctors"
            labelStyle={styles.moreLabel}
            accessibilityRole="button"
            accessibilityLabel="Load more online doctors"
            disabled={onlineQuery.isFetching}
            onPress={() => setOnlineOffset((value) => value + 50)}
            style={styles.moreButton}
          >
            <Text variant="label" style={styles.moreLabel}>
              {onlineQuery.isFetching
                ? "Loading doctors…"
                : "Load more doctors"}
            </Text>
          </Button>
        ) : null}
      </FadedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  headerTitle: {
    color: colors.white,
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
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headingCopy: { flex: 1, paddingRight: spacing.xs },
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
  filterContainer: { flexShrink: 0 },
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
  sortOrderButtonPressed: { opacity: 0.72 },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 126,
  },
  list: { gap: 12 },
  loading: { paddingVertical: 12 },
  skeletonList: { gap: 12 },
  skeletonCard: {
    minHeight: 124,
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#E6F4F3",
  },
  skeletonCopy: { flex: 1, gap: 10 },
  message: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
  },
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  moreButton: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.patient.surface,
  },
  moreLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
});
