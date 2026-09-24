import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { searchPublicPractices } from "@startup/data-access";
import { Button, FadedScrollView, Header } from "@startup/mobile-ui";
import { colors } from "@startup/design-tokens";
import { supabase } from "../../../services/supabase";
import type { DoctorResultsScreenProps } from "../types/doctor-results";

type SortBy = "distance" | "experience" | "fee";

export function LiveDoctorResultsScreen({ symptom, consultationType, onBackPress }: DoctorResultsScreenProps) {
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const query = useQuery({
    queryKey: ["public-practices", symptom, coordinates],
    queryFn: () => searchPublicPractices(supabase!, { query: symptom === "your symptoms" ? undefined : symptom,
      latitude: coordinates?.latitude, longitude: coordinates?.longitude, limit: 50 }),
    enabled: !!supabase,
  });
  const practices = useMemo(() => [...(query.data ?? [])].sort((a, b) => {
    if (sortBy === "fee") return Number(a.fee_minor) - Number(b.fee_minor);
    if (sortBy === "experience") return b.experience_years - a.experience_years;
    return (a.distance_meters ?? Number.MAX_SAFE_INTEGER) - (b.distance_meters ?? Number.MAX_SAFE_INTEGER);
  }), [query.data, sortBy]);
  async function useLocation() {
    setLocating(true); setLocationError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setLocationError("Location permission is off. You can still search by name and fee."); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch { setLocationError("Could not read your location. You can still browse doctors."); }
    finally { setLocating(false); }
  }
  return <View style={styles.screen}>
    <Header title={`Doctors for ${symptom}`} app="patient" onBackPress={onBackPress} />
    <FadedScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Verified doctors and facilities</Text>
      <Text>Availability and fees are loaded from the shared backend. Share your location to sort nearby clinics.</Text>
      <Button label={locating ? "Finding location…" : coordinates ? "Refresh my location" : "Use my location"} disabled={locating} variant="outline" onPress={() => void useLocation()} />
      {locationError ? <Text accessibilityRole="alert">{locationError}</Text> : null}
      <View style={styles.sort}>
        <Button label="Nearest" disabled={!coordinates} variant={sortBy === "distance" ? "primary" : "outline"} onPress={() => setSortBy("distance")} />
        <Button label="Experience" variant={sortBy === "experience" ? "primary" : "outline"} onPress={() => setSortBy("experience")} />
        <Button label="Fee" variant={sortBy === "fee" ? "primary" : "outline"} onPress={() => setSortBy("fee")} />
      </View>
      {query.isLoading ? <Text>Searching doctors…</Text> : null}
      {query.error ? <Text accessibilityRole="alert">Could not search practices. Try again.</Text> : null}
      {practices.length === 0 && !query.isLoading && !query.error ? <Text>No verified practices match this search yet.</Text> : null}
      {practices.map((practice) => <View key={practice.practice_service_id} style={styles.card}>
        <Text style={styles.name}>{practice.doctor_name}</Text>
        <Text>{practice.specialties.map((item) => item.name).join(", ") || practice.service_name}</Text>
        <Text>{practice.experience_years} years in practice · {practice.facility_name}</Text>
        <Text>{practice.address}</Text>
        <Text>{practice.currency} {(Number(practice.fee_minor) / 100).toFixed(2)} · {practice.duration_minutes} min</Text>
        {practice.distance_meters !== null ? <Text>{(practice.distance_meters / 1000).toFixed(1)} km away</Text> : null}
        <Button label="View doctor and slots" onPress={() => router.push({ pathname: "/doctor-profile", params: { practiceId: practice.practice_id, serviceId: practice.practice_service_id, consultationType } } as Href)} />
      </View>)}
    </FadedScrollView>
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.patient.background }, content: { padding: 20, gap: 14, paddingBottom: 120 }, heading: { fontSize: 21, fontWeight: "700", color: colors.patient.text }, sort: { gap: 8 }, card: { padding: 16, borderRadius: 16, backgroundColor: colors.patient.surface, gap: 7 }, name: { fontSize: 18, fontWeight: "700", color: colors.patient.text } });
