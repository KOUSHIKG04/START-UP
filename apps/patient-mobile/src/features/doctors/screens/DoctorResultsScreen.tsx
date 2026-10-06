import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { searchPublicPractices } from "@startup/data-access";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Dropdown, FadedScrollView, Header, useToastFeedback } from "@startup/mobile-ui";
import DoctorCard from "../components/DoctorCard";
import { filterOptions } from "../utils/doctorResultsConstants";
import { resolveDoctorSearch, uniqueDoctorPractices } from "../utils/doctorSearch";
import type { DoctorResultsScreenProps } from "../types/doctor-results";
import { formatConsultationFee } from "../utils/doctorDisplay";
import { supabase } from "../../../services/supabase";

type SortBy = "distance" | "experience" | "rating" | "fee";

export function DoctorResultsScreen({ symptom, consultationType, onBackPress }: DoctorResultsScreenProps) {
  const [filter, setFilter] = useState<SortBy>("distance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationRequested = useRef(false);
  const query = useQuery({
    queryKey: ["public-practices", symptom, coordinates],
    queryFn: () => searchPublicPractices(supabase!, {
      ...resolveDoctorSearch(symptom),
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      limit: 50,
    }),
    enabled: Boolean(supabase),
    refetchInterval: 30_000,
  });
  useToastFeedback({ error: locationError || (query.isError ? "Could not search doctors. Reopen this page to retry." : "") });
  useFocusEffect(useCallback(() => {
    void query.refetch();
  }, [query.refetch]));
  const practices = useMemo(() => uniqueDoctorPractices(query.data ?? [], consultationType === "Online"
    ? "online" : consultationType === "Home Visit" ? "home" : "clinic").sort((a, b) => {
    const difference = filter === "fee" ? Number(a.fee_minor) - Number(b.fee_minor)
      : filter === "rating" ? Number(a.rating ?? -1) - Number(b.rating ?? -1)
      : filter === "experience" ? a.experience_years - b.experience_years
      : (a.distance_meters ?? Number.MAX_SAFE_INTEGER) - (b.distance_meters ?? Number.MAX_SAFE_INTEGER);
    return sortOrder === "asc" ? difference : -difference;
  }), [query.data, filter, sortOrder, consultationType]);

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
    if (locationRequested.current) return;
    locationRequested.current = true;
    void requestLocation();
  }, [requestLocation]);

  return <View style={styles.screen}>
    <Header title={symptom === "your symptoms" ? "All doctors" : `Specialists for ${symptom}`} app="patient" onBackPress={onBackPress} titleStyle={styles.headerTitle} />
    <View style={styles.topSection}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}><Text style={styles.title}>Doctors available for your care</Text></View>
        <View style={styles.filterActions}>
          <Dropdown accessibilityLabel="Sort doctors" options={filterOptions} value={filter} onValueChange={(value) => { setFilter(value as SortBy); setSortOrder(value === "rating" || value === "experience" ? "desc" : "asc"); if (value === "distance" && !coordinates) void requestLocation(); }} triggerLabel="Filter" chevronSize={12} chevronColor={colors.patient.primaryDark} containerStyle={styles.filterContainer} triggerStyle={styles.filterTrigger} valueStyle={styles.filterValue} menuWidth={176} />
          <Pressable accessibilityLabel={sortOrder === "asc" ? "Sort ascending (tap for descending)" : "Sort descending (tap for ascending)"} accessibilityRole="button" onPress={() => setSortOrder((value) => value === "asc" ? "desc" : "asc")} style={({ pressed }) => [styles.sortOrderButton, pressed && styles.sortOrderButtonPressed]}>
            {sortOrder === "asc" ? <ArrowUp color={colors.patient.primaryDark} size={14} strokeWidth={2.4} /> : <ArrowDown color={colors.patient.primaryDark} size={14} strokeWidth={2.4} />}
          </Pressable>
        </View>
      </View>
    </View>
    <FadedScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {locating ? <Text style={styles.message}>Finding your location…</Text> : null}
      {query.isLoading ? <Text style={styles.message}>Searching verified doctors…</Text> : null}
      {practices.length === 0 && !query.isLoading && !query.isError ? <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{symptom === "your symptoms" ? "No doctors available yet" : "No doctors match this search"}</Text>
        <Text style={styles.message}>{symptom === "your symptoms" ? "Doctors appear here after their clinic is verified and they publish a service." : "Try another symptom, category, or browse all available doctors."}</Text>
      </View> : null}
      <View style={styles.list}>{practices.map((practice) => <DoctorCard
        key={practice.practice_service_id}
        name={practice.doctor_name}
        qualification={practice.qualification ?? "Qualification pending review"}
        specialty={practice.specialties.map((item) => item.name).join(", ") || practice.service_name}
        experience={`${practice.experience_years} Years Experience`}
        rating={practice.rating === null ? "No ratings yet" : `${practice.rating} (${practice.review_count} reviews)`}
        fee={formatConsultationFee(practice.fee_minor, practice.currency)}
        distanceMeters={practice.distance_meters}
        contextLabel={consultationType === "Online" ? "Video consultation" : consultationType === "Home Visit" ? "Home Visit" : "Clinic Visit"}
        onPress={() => router.push({ pathname: "/doctor-profile", params: { practiceId: practice.practice_id, serviceId: practice.practice_service_id, consultationType } } as unknown as Href)}
      />)}</View>
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
  message: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular },
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { color: colors.patient.text, fontFamily: fontFamilies.semibold, fontSize: 16 },
});
