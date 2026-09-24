import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { completeOnboarding } from "@startup/data-access";
import { Button, Input, SafeAreaView } from "@startup/mobile-ui";
import { mobileSession, supabase, useMobileSession } from "../../../services/supabase";

export default function OnboardingScreen() {
  const { session } = useMobileSession();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!supabase || !session) return;
    setBusy(true);
    setError("");
    try {
      await completeOnboarding(supabase, { kind: "patient", details: { full_name: name } });
      await mobileSession.refresh();
      router.replace("/(app)/(tabs)");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create your profile.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Create your patient profile</Text>
      <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button label="Continue" disabled={busy || !session} onPress={() => void submit()} />
      <Button label="Sign out" variant="ghost" onPress={() => void supabase?.auth.signOut()} />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: "center", padding: 24, gap: 18 }, title: { fontSize: 25, fontWeight: "700" }, error: { color: "#B42318" } });
