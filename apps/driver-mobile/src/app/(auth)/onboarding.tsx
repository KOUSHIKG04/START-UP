import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { completeOnboarding } from "@startup/data-access";
import { Button, Input, SafeAreaView } from "@startup/mobile-ui";
import { mobileSession, supabase, useMobileSession } from "../../services/supabase";

export default function DriverOnboarding() {
  const { session } = useMobileSession();
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [expires, setExpires] = useState("");
  const [invitation, setInvitation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!supabase || !session) return;
    setBusy(true); setError("");
    const details = { full_name: name, license_number: license, license_expires_on: expires };
    try {
      await completeOnboarding(supabase, invitation.trim()
        ? { kind: "driver_invited", details: { ...details, invitation_token: invitation.trim() } }
        : { kind: "driver_independent", details });
      await mobileSession.refresh();
      router.replace("/(app)/(tabs)/home");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit driver registration.");
    } finally { setBusy(false); }
  }
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Driver registration</Text>
    <Text>Independent drivers can leave the invitation field blank. An operator-invited driver should enter the invitation token.</Text>
    <Input label="Full name" value={name} onChangeText={setName} />
    <Input label="Driver license number" value={license} onChangeText={setLicense} />
    <Input label="License expiry (YYYY-MM-DD)" value={expires} onChangeText={setExpires} />
    <Input label="Operator invitation token (optional)" value={invitation} onChangeText={setInvitation} />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Button label="Submit for review" disabled={busy || !session} onPress={() => void submit()} />
    <Button label="Sign out" variant="ghost" onPress={() => void supabase?.auth.signOut()} />
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 24, gap: 16 }, title: { fontSize: 25, fontWeight: "700" }, error: { color: "#B42318" } });
