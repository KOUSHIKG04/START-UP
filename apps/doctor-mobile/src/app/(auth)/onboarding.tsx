import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { completeOnboarding } from "@startup/data-access";
import { Button, Input, SafeAreaView } from "@startup/mobile-ui";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../services/supabase";

export default function DoctorOnboarding() {
  const { session } = useMobileSession();
  const [solo, setSolo] = useState(false);
  const [name, setName] = useState("");
  const [authority, setAuthority] = useState("");
  const [registration, setRegistration] = useState("");
  const [started, setStarted] = useState("");
  const [clinic, setClinic] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!supabase || !session) return;
    setBusy(true);
    setError("");
    const details = {
      full_name: name,
      registration_authority: authority,
      registration_number: registration,
      practice_started_on: started,
    };
    try {
      await completeOnboarding(
        supabase,
        solo
          ? {
              kind: "solo_doctor",
              details: {
                ...details,
                clinic_name: clinic,
                address,
                latitude: Number(latitude),
                longitude: Number(longitude),
              },
            }
          : { kind: "doctor", details }
      );
      await mobileSession.refresh();
      router.replace("/review-status");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not submit credentials."
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Doctor registration</Text>
        <Text>
          Your registration is reviewed before clinical actions become
          available.
        </Text>
        <Input label="Full name" value={name} onChangeText={setName} />
        <Input
          label="Registration authority"
          value={authority}
          onChangeText={setAuthority}
        />
        <Input
          label="Registration number"
          value={registration}
          onChangeText={setRegistration}
        />
        <Input
          label="Practice start date (YYYY-MM-DD)"
          value={started}
          onChangeText={setStarted}
        />
        <Button
          label={
            solo ? "I work at an existing facility" : "I run my own clinic"
          }
          variant="outline"
          onPress={() => setSolo(!solo)}
        />
        {solo ? (
          <>
            <Input
              label="Clinic name"
              value={clinic}
              onChangeText={setClinic}
            />
            <Input
              label="Clinic address"
              value={address}
              onChangeText={setAddress}
            />
            <Input
              label="Latitude"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="decimal-pad"
            />
            <Input
              label="Longitude"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="decimal-pad"
            />
          </>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button
          label="Submit for review"
          disabled={busy || !session}
          onPress={() => void submit()}
        />
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => void supabase?.auth.signOut()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 25, fontWeight: "700" },
  error: { color: "#B42318" },
});
