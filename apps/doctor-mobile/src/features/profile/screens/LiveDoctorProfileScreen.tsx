import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDisplayDate } from "@startup/contracts";
import {
  getMyDoctorProfile,
  updateMyDoctorProfile,
} from "@startup/data-access";
import { Button, Input, SafeAreaView, useToast, useToastFeedback } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
import { signOutWithPushCleanup } from "../../notifications/deviceNotifications";

export function LiveDoctorProfileScreen() {
  const client = useQueryClient();
  const { showToast } = useToast();
  const profile = useQuery({
    queryKey: ["my-doctor-profile"],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: !!supabase,
  });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  useToastFeedback({ error: profile.error?.message });
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.full_name);
    setBio(profile.data.bio ?? "");
    setLanguages(profile.data.languages.join(", "));
  }, [profile.data]);
  const save = useMutation({
    mutationFn: () =>
      updateMyDoctorProfile(supabase!, {
        fullName: name,
        bio,
        languages: languages
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      }),
    onSuccess: async () => {
      showToast({ title: "Profile saved", type: "success" });
      setEditing(false);
      await client.invalidateQueries({ queryKey: ["my-doctor-profile"] });
    },
    onError: (error) => { showToast({ title: "Could not save profile", message: error.message, type: "error" }); },
  });
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Doctor profile</Text>
        {profile.isLoading ? <Text>Loading profile…</Text> : null}
        {profile.data ? (
          <>
            <Text>Status: {profile.data.credential_status}</Text>
            <Text>
              Registration: {profile.data.registration_authority} ·{" "}
              {profile.data.registration_number}
            </Text>
            <Text>Practicing since {formatDisplayDate(profile.data.practice_started_on)}</Text>
            <Text>
              Specialties:{" "}
              {profile.data.specialties.map((item) => item.name).join(", ") ||
                "Awaiting verified specialty assignment"}
            </Text>
            {editing ? <>
              <Input label="Full name" value={name} onChangeText={setName} />
              <Input label="Bio" value={bio} onChangeText={setBio} multiline />
              <Input label="Languages (codes separated by commas)" value={languages} onChangeText={setLanguages} placeholder="en, hi" />
              <Button label={save.isPending ? "Saving…" : "Save profile"} disabled={save.isPending} onPress={() => save.mutate()} />
              <Button label="Cancel" variant="outline" disabled={save.isPending} onPress={() => { if (profile.data) { setName(profile.data.full_name); setBio(profile.data.bio ?? ""); setLanguages(profile.data.languages.join(", ")); } setEditing(false); }} />
            </> : <>
              <Text>{profile.data.bio || "Add a bio to introduce yourself to patients."}</Text>
              <Text>Languages: {profile.data.languages.join(", ") || "Not added"}</Text>
              <Button label="Edit profile" onPress={() => setEditing(true)} />
            </>}
            <Text style={styles.subtitle}>Associated facilities</Text>
            {profile.data.facilities.map((facility) => (
              <View key={facility.practice_id} style={styles.card}>
                <Text>
                  {facility.facility_name} · {facility.facility_kind}
                </Text>
                <Text>{facility.address}</Text>
              </View>
            ))}
          </>
        ) : null}
        <Button
          label="Sign out"
          variant="outline"
          onPress={() => void signOutWithPushCleanup()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 120, gap: 16 },
  title: { fontSize: 25, fontWeight: "700" },
  subtitle: { fontSize: 19, fontWeight: "600" },
  card: { padding: 14, borderRadius: 12, backgroundColor: "#E6F5F4", gap: 5 },
});
