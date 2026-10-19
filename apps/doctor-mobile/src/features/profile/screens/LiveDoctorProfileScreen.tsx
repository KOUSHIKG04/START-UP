import { useLiveDoctorProfile } from "../hooks/useLiveDoctorProfile";

import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatDisplayDate } from "@startup/contracts";

import { Button, Input, SafeAreaView, Skeleton } from "@startup/mobile-ui";

import { signOutWithPushCleanup } from "../../notifications/services/deviceNotifications";

export function LiveDoctorProfileScreen() {
  const {
    profile,
    name,
    setName,
    bio,
    setBio,
    languages,
    setLanguages,
    editing,
    setEditing,
    save,
  } = useLiveDoctorProfile();
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Doctor profile</Text>
        {profile.isLoading ? (
          <Skeleton theme="doctor" height={120} radius={12} />
        ) : null}
        {profile.data ? (
          <>
            <Text>Status: {profile.data.credential_status}</Text>
            <Text>
              Registration: {profile.data.registration_authority} ·{" "}
              {profile.data.registration_number}
            </Text>
            <Text>
              Practicing since{" "}
              {formatDisplayDate(profile.data.practice_started_on)}
            </Text>
            <Text>
              Specialties:{" "}
              {profile.data.specialties.map((item) => item.name).join(", ") ||
                "Awaiting verified specialty assignment"}
            </Text>
            {editing ? (
              <>
                <Input label="Full name" value={name} onChangeText={setName} />
                <Input
                  label="Bio"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                />
                <Input
                  label="Languages (codes separated by commas)"
                  value={languages}
                  onChangeText={setLanguages}
                  placeholder="en, hi"
                />
                <Button
                  loading={save.isPending}
                  label={save.isPending ? "Saving…" : "Save profile"}
                  disabled={save.isPending}
                  onPress={() => save.mutate()}
                />
                <Button
                  label="Cancel"
                  variant="outline"
                  disabled={save.isPending}
                  onPress={() => {
                    if (profile.data) {
                      setName(profile.data.full_name);
                      setBio(profile.data.bio ?? "");
                      setLanguages(profile.data.languages.join(", "));
                    }
                    setEditing(false);
                  }}
                />
              </>
            ) : (
              <>
                <Text>
                  {profile.data.bio ||
                    "Add a bio to introduce yourself to patients."}
                </Text>
                <Text>
                  Languages: {profile.data.languages.join(", ") || "Not added"}
                </Text>
                <Button label="Edit profile" onPress={() => setEditing(true)} />
              </>
            )}
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
