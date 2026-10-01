import { ActivityIndicator, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { completePatientProfile, getMyPatientProfileDetail } from "@startup/data-access";
import { ProfileForm } from "../../features/auth/components/ProfileForm";
import { mobileSession, supabase, useMobileSession } from "../../services/supabase";

export default function EditPatientProfile() {
  const { profile, session } = useMobileSession();
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ["my-patient-profile-detail", profile?.patient_id], queryFn: () => getMyPatientProfileDetail(supabase!), enabled: Boolean(supabase && profile?.patient_id) });
  if (detail.isLoading) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator /></View>;
  if (detail.error || !detail.data) return <View style={{ padding: 24 }}><Text accessibilityRole="alert">Could not load your profile.</Text></View>;
  return <ProfileForm initialEmail={session?.user.email ?? ""} initialProfile={detail.data} onSave={async value => {
    if (!supabase) throw new Error("Supabase is not configured.");
    await completePatientProfile(supabase, { fullName: value.fullName, age: value.age, gender: value.gender as "Male" | "Female" | "Other" | "Prefer not to say", bloodGroup: value.bloodGroup as "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-", email: value.email, address: value.address });
    await Promise.all([client.invalidateQueries({ queryKey: ["my-patient-profile-detail"] }), mobileSession.refresh()]);
    router.back();
  }} />;
}
