import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicPracticeBio,
  listPracticeClinicSlots,
  searchPublicPractices,
} from "@startup/data-access";
import { Button, Header, SafeAreaView } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";

export function LiveDoctorProfileScreen({
  practiceId,
  serviceId,
  consultationType,
}: {
  practiceId: string;
  serviceId: string;
  consultationType: string;
}) {
  const practiceQuery = useQuery({
    queryKey: ["public-practice", practiceId],
    queryFn: () => searchPublicPractices(supabase!, { practiceId, limit: 50 }),
    enabled: !!supabase && !!practiceId,
  });
  const slotsQuery = useQuery({
    queryKey: ["clinic-slots", practiceId, serviceId],
    queryFn: () => listPracticeClinicSlots(supabase!, practiceId, serviceId),
    enabled: !!supabase && !!practiceId && !!serviceId,
  });
  const bioQuery = useQuery({
    queryKey: ["practice-bio", practiceId, serviceId],
    queryFn: () => getPublicPracticeBio(supabase!, practiceId, serviceId),
    enabled: !!supabase && !!practiceId && !!serviceId,
  });
  const practice = practiceQuery.data?.find(
    (item) => item.practice_service_id === serviceId
  );
  const slots =
    slotsQuery.data?.filter(
      (item) =>
        item.practice_id === practiceId &&
        item.practice_service_id === serviceId
    ) ?? [];
  return (
    <SafeAreaView style={styles.screen}>
      <Header
        title="Doctor profile"
        app="patient"
        onBackPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {practiceQuery.isLoading ? <Text>Loading doctor…</Text> : null}
        {practiceQuery.error ? (
          <Text accessibilityRole="alert">{practiceQuery.error.message}</Text>
        ) : null}
        {!practice && !practiceQuery.isLoading && !practiceQuery.error ? (
          <Text>This practice is no longer available.</Text>
        ) : null}
        {practice ? (
          <>
            <Text style={styles.title}>{practice.doctor_name}</Text>
            <Text>
              {practice.specialties.map((item) => item.name).join(", ") ||
                practice.service_name}
            </Text>
            <Text>{practice.experience_years} years in practice</Text>
            {practice.languages.length ? (
              <Text>Languages: {practice.languages.join(", ")}</Text>
            ) : null}
            {bioQuery.data ? <Text>{bioQuery.data}</Text> : null}
            <View style={styles.card}>
              <Text style={styles.heading}>{practice.facility_name}</Text>
              <Text>
                {practice.facility_kind} · {practice.address}
              </Text>
              <Text>
                Consultation: {practice.currency}{" "}
                {(Number(practice.fee_minor) / 100).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.heading}>Clinic availability</Text>
            {slotsQuery.error ? (
              <Text accessibilityRole="alert">{slotsQuery.error.message}</Text>
            ) : null}
            {slots.length === 0 ? (
              <Text>No open clinic slots at this practice right now.</Text>
            ) : (
              slots
                .slice(0, 5)
                .map((slot) => (
                  <Text key={slot.window_id}>
                    {new Date(slot.starts_at).toLocaleString()}
                  </Text>
                ))
            )}
            <Button
              label="Choose a clinic slot"
              onPress={() =>
                router.push({
                  pathname: "/(app)/clinic",
                  params: { practiceId, serviceId },
                } as unknown as Href)
              }
            />
            {consultationType !== "Clinic Visit" ? (
              <Text>
                {consultationType} booking is not connected yet. Clinic visits
                are available above.
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 26, fontWeight: "700" },
  heading: { fontSize: 19, fontWeight: "600" },
  card: { padding: 16, borderRadius: 16, backgroundColor: "#E6F4F3", gap: 8 },
});
