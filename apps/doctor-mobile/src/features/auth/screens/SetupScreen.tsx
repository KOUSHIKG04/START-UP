import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import { mobileSession } from "../../../services/supabase";
import { OnboardingShell } from "../components/OnboardingShell";

export default function SetupScreen() {
  const [error, setError] = useState("");
  useToastFeedback({ error });
  useEffect(() => { let active = true; Promise.resolve(mobileSession.refresh()).then(() => { if (!active) return; const profile = mobileSession.getSnapshot().profile; router.replace(profile?.doctor ? "/review-status" : "/onboarding"); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load your account."); }); return () => { active = false; }; }, []);
  return <OnboardingShell onBack={() => router.back()}><View style={styles.body}><Text style={styles.title}>Welcome to <Text style={styles.brand}>Clinzo⁺</Text></Text><Text style={styles.caption}>Setting things up for you..</Text><View style={styles.track}><View style={styles.progress} /></View></View></OnboardingShell>;
}
const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 24 }, title: { fontFamily: fontFamilies.medium, fontSize: 32, color: colors.black }, brand: { color: colors.patient.primaryDark },
  caption: { fontFamily: fontFamilies.regular, fontSize: 18, marginTop: 47, textAlign: "center" },
  track: { height: 9, borderRadius: 10, width: 286, backgroundColor: "#D9D9D9", marginTop: 14 }, progress: { height: 9, borderRadius: 10, width: "65%", backgroundColor: colors.patient.primaryDark },
});
