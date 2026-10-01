import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import { mobileSession } from "../../../services/supabase";
import { OnboardingShell } from "../components/OnboardingShell";

export default function SetupScreen() {
  const [error, setError] = useState("");
  useEffect(() => { let active = true; Promise.resolve(mobileSession.refresh()).then(() => { if (!active) return; const profile = mobileSession.getSnapshot().profile; router.replace(profile?.patient_id ? "/(app)/(tabs)" : "/onboarding"); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load your account."); }); return () => { active = false; }; }, []);
  return <OnboardingShell onBack={() => router.back()}><View style={styles.body}><Text style={styles.title}>Welcome to <Text style={styles.brand}>Clinzo⁺</Text></Text><Text style={styles.caption}>{error || "Setting things up for you.."}</Text><View style={styles.track}><View style={styles.progress} /></View><Pressable accessibilityRole="button" onPress={() => void Linking.openURL("tel:112")} style={styles.sos}><Text style={styles.sosTitle}>✚  Call emergency services</Text><Text style={styles.sosSub}>Call 112 during an emergency</Text></Pressable></View></OnboardingShell>;
}
const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 176 }, title: { fontFamily: fontFamilies.medium, fontSize: 32, color: colors.black }, brand: { color: colors.patient.primaryDark },
  caption: { fontFamily: fontFamilies.regular, fontSize: 18, marginTop: 47, textAlign: "center" },
  track: { height: 9, borderRadius: 10, width: 286, backgroundColor: "#D9D9D9", marginTop: 14 }, progress: { height: 9, borderRadius: 10, width: "65%", backgroundColor: colors.patient.primaryDark },
  sos: { marginTop: 21, width: "100%", height: 72, borderRadius: 16, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", boxShadow: "0px 3px 6px rgba(219, 20, 20, 0.25)" },
  sosTitle: { fontFamily: fontFamilies.bold, fontSize: 16, color: colors.white }, sosSub: { fontFamily: fontFamilies.medium, fontSize: 11, color: colors.white },
});
