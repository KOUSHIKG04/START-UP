import { Button } from "@startup/mobile-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { listMyPatientLocations, searchPublicPractices } from "@startup/data-access";
import type { PublicPractice } from "@startup/contracts";
import type { SavedPatientLocation } from "@startup/contracts";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Dropdown, FadedScrollView, Header, Loader, Skeleton, useToast, useToastFeedback } from "@startup/mobile-ui";
import DoctorCard from "../components/DoctorCard";
import { filterOptions } from "../utils/doctorResultsConstants";
import { resolveDoctorSearch, uniqueDoctorPractices } from "../utils/doctorSearch";
import type { DoctorResultsScreenProps } from "../types/doctor-results";
import { formatConsultationFee } from "../utils/doctorDisplay";
import { supabase, useMobileSession } from "../../../services/supabase";

type SortBy = "distance" | "experience" | "rating" | "fee";

export function DoctorResultsScreen({ symptom, consultationType, onBackPress }: DoctorResultsScreenProps) {
  const { showToast } = useToast();
  const { profile } = useMobileSession();
  const isOnline = consultationType === "Online";
  const [filter, setFilter] = useState<SortBy>(isOnline ? "rating" : "distance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(isOnline ? "desc" : "asc");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [onlineOffset, setOnlineOffset] = useState(0);
  const [onlineRows, setOnlineRows] = useState<PublicPractice[]>([]);
  const locationRequested = useRef(false);
  const savedLocations = useQuery({
    queryKey: ["my-patient-locations", profile?.patient_id],
    queryFn: () => listMyPatientLocations(supabase!),
    enabled: Boolean(supabase && profile?.patient_id && !isOnline),
  });
  const selectedLocation = savedLocations.data?.find((item: SavedPatientLocation) => item.selected);
  const query = useQuery({
    queryKey: ["public-practices", symptom, consultationType, isOnline ? null : coordinates],
    queryFn: () => searchPublicPractices(supabase!, {
      ...resolveDoctorSearch(symptom),
      latitude: isOnline ? undefined : coordinates?.latitude,
      longitude: isOnline ? undefined : coordinates?.longitude,
      limit: 50,
    }),
    enabled: Boolean(supabase) && !isOnline,
    refetchInterval: 30_000,
  });
  const onlineQuery = useQuery({
    queryKey: ["public-online-practices", symptom, onlineOffset],
    queryFn: () => searchPublicPractices(supabase!, {
      ...resolveDoctorSearch(symptom),
      serviceMode: "online",
      offset: onlineOffset,
      limit: 50,
    }),
    enabled: Boolean(supabase) && isOnline,
    refetchInterval: 30_000,
  });
  useEffect(() => { setOnlineOffset(0); setOnlineRows([]); }, [symptom, consultationType]);
  useEffect(() => {
    if (!isOnline || !onlineQuery.data) return;
    setOnlineRows(previous => {
      if (onlineOffset === 0) return onlineQuery.data;
      const merged = new Map(previous.map(item => [item.practice_service_id, item]));
      for (const item of onlineQuery.data) merged.set(item.practice_service_id, item);
      return [...merged.values()];
    });
  }, [isOnline, onlineOffset, onlineQuery.data]);
  const isLoading = isOnline ? onlineQuery.isLoading : query.isLoading;
  const isError = isOnline ? onlineQuery.isError : query.isError;
  const rows = isOnline ? onlineRows : query.data ?? [];
  useToastFeedback({ error: locationError || (isError ? "Could not search doctors. Reopen this page to retry." : "") });
  useFocusEffect(useCallback(() => {
    if (isOnline) void onlineQuery.refetch();
    else void query.refetch();
  }, [isOnline, onlineQuery.refetch, query.refetch]));
  const practices = useMemo(() => uniqueDoctorPractices(rows, consultationType === "Online"
    ? "online" : consultationType === "Home Visit" ? "home" : "clinic").sort((a, b) => {
    const difference = filter === "fee" ? Number(a.fee_minor) - Number(b.fee_minor)
      : filter === "rating" ? Number(a.rating ?? -1) - Number(b.rating ?? -1)
      : filter === "experience" ? a.experience_years - b.experience_years
      : (a.distance_meters ?? Number.MAX_SAFE_INTEGER) - (b.distance_meters ?? Number.MAX_SAFE_INTEGER);
    return sortOrder === "asc" ? difference : -difference;
  }), [rows, filter, sortOrder, consultationType]);

  const requestLocation = useCallback(async () => {
    setLocating(true);
    setLocationError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setLocationError("Location is off. You can still browse doctors by fee or experience."); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch { setLocationError("Could not get your location. You can still browse doctors."); }
    finally { setLocating(false); }
  }, []);
  useEffect(() => {
    if (isOnline) return;
    if (savedLocations.isLoading) return;
    if (selectedLocation?.latitude != null && selectedLocation.longitude != null) {
      setCoordinates({ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude });
      return;
    }
    if (locationRequested.current) return;
    locationRequested.current = true;
    void requestLocation();
  }, [isOnline, requestLocation, savedLocations.isLoading, selectedLocation?.latitude, selectedLocation?.longitude]);

  const toggleSortOrder = () => {
    const nextOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(nextOrder);
    const label = filter === "distance" ? "distance" : filter === "experience" ? "experience" : filter === "rating" ? "rating" : "consultation fee";
    showToast({
      title: `Sorting in ${nextOrder === "asc" ? "ascending" : "descending"} order`,
      message: `Doctors are sorted by ${label}.`,
      type: "info",
    });
  };

  return <View style={styles.screen}>
    <Header title={symptom === "your symptoms" ? "All doctors" : `Specialists for ${symptom}`} app="patient" onBackPress={onBackPress} titleStyle={styles.headerTitle} />
    <View style={styles.topSection}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}><Text style={styles.title}>Doctors available for your care</Text></View>
        <View style={styles.filterActions}>
          <Dropdown accessibilityLabel="Sort doctors" options={isOnline ? filterOptions.filter(option => option.value !== "distance") : filterOptions} value={filter} onValueChange={(value) => { setFilter(value as SortBy); setSortOrder(value === "rating" || value === "experience" ? "desc" : "asc"); if (value === "distance" && !coordinates) void requestLocation(); }} triggerLabel="Filter" chevronSize={12} chevronColor={colors.patient.primaryDark} containerStyle={styles.filterContainer} triggerStyle={styles.filterTrigger} valueStyle={styles.filterValue} menuWidth={176} />
          <Pressable accessibilityLabel={sortOrder === "asc" ? "Sort ascending (tap for descending)" : "Sort descending (tap for ascending)"} accessibilityRole="button" onPress={toggleSortOrder} style={({ pressed }) => [styles.sortOrderButton, pressed && styles.sortOrderButtonPressed]}>
            {sortOrder === "asc" ? <ArrowUp color={colors.patient.primaryDark} size={14} strokeWidth={2.4} /> : <ArrowDown color={colors.patient.primaryDark} size={14} strokeWidth={2.4} />}
          </Pressable>
        </View>
      </View>
    </View>
    <FadedScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {locating && !isLoading ? <Loader theme="patient" style={styles.loading} /> : null}
      {isLoading ? <View accessibilityLabel="Loading doctors" style={styles.skeletonList}>{[0, 1, 2].map(index => <View key={index} style={styles.skeletonCard}><Skeleton theme="patient" width={54} height={54} radius={27} /><View style={styles.skeletonCopy}><Skeleton theme="patient" width="72%" height={18} /><Skeleton theme="patient" width="50%" height={14} /><Skeleton theme="patient" width="88%" height={14} /></View></View>)}</View> : null}
      {practices.length === 0 && !locating && !isLoading && !isError ? <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{symptom === "your symptoms" ? "No doctors available yet" : "No doctors match this search"}</Text>
        <Text style={styles.message}>{symptom === "your symptoms" ? "Doctors appear here after their clinic is verified and they publish a service." : "Try another symptom, category, or browse all available doctors."}</Text>
      </View> : null}
      <View style={styles.list}>{practices.map((practice) => <DoctorCard
        key={practice.practice_service_id}
        name={practice.doctor_name}
        qualification={practice.qualification ?? ""}
        specialty={practice.specialties.map((item) => item.name).join(", ") || practice.service_name}
        experience={`${practice.experience_years} Years Experience`}
        rating={practice.rating === null ? "No ratings yet" : `${practice.rating} (${practice.review_count} reviews)`}
        showRating
        fee={formatConsultationFee(practice.fee_minor, practice.currency)}
        distanceMeters={isOnline ? null : practice.distance_meters}
        contextLabel={consultationType === "Online" ? "Video consultation" : consultationType === "Home Visit" ? "Home Visit" : "Clinic Visit"}
        onPress={() => router.push({ pathname: "/doctor-profile", params: { practiceId: practice.practice_id, serviceId: practice.practice_service_id, consultationType } } as unknown as Href)}
      />)}</View>
      {isOnline && onlineQuery.data?.length === 50 ? <Button loading={onlineQuery.isFetching} variant="ghost" label="Load more doctors" labelStyle={styles.moreLabel} accessibilityRole="button" accessibilityLabel="Load more online doctors" disabled={onlineQuery.isFetching} onPress={() => setOnlineOffset(value => value + 50)} style={styles.moreButton}><Text style={styles.moreLabel}>{onlineQuery.isFetching ? "Loading doctors…" : "Load more doctors"}</Text></Button> : null}
    </FadedScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: "600", lineHeight: 28 },
  topSection: { paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 6, backgroundColor: colors.patient.background },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingHorizontal: spacing.xs },
  headingCopy: { flex: 1, paddingRight: spacing.xs },
  title: { color: colors.patient.text, fontFamily: fontFamilies.medium, fontSize: 16, fontWeight: "600", lineHeight: 24 },
  filterActions: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  filterContainer: { flexShrink: 0 },
  filterTrigger: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderWidth: 1, borderColor: colors.patient.surfaceBorder, borderRadius: 999, backgroundColor: colors.patient.surface },
  filterValue: { flexShrink: 0, color: colors.patient.primaryDark, fontFamily: fontFamilies.semibold, fontSize: 12, fontWeight: "600", lineHeight: 16 },
  sortOrderButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.patient.surfaceBorder, borderRadius: 999, backgroundColor: colors.patient.surface },
  sortOrderButtonPressed: { opacity: 0.72 },
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 126 },
  list: { gap: 12 },
  loading: { paddingVertical: 12 },
  skeletonList: { gap: 12 },
  skeletonCard: { minHeight: 124, flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "#E6F4F3" },
  skeletonCopy: { flex: 1, gap: 10 },
  message: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular },
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 16 },
  moreButton: { alignSelf: "center", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.patient.surface },
  moreLabel: { color: colors.patient.primaryDark, fontFamily: fontFamilies.semibold, fontSize: 14 },
});
