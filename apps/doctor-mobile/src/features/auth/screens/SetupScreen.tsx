import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import { mobileSession, useMobileSession } from "../../../services/supabase";
import { OnboardingShell } from "../components/OnboardingShell";

export default function SetupScreen() {
  const auth = useMobileSession();
  const [error, setError] = useState("");
  useToastFeedback({ error });
  useEffect(() => {
    let active = true;
    void mobileSession.refresh().then(() => {
      if (active) setError(mobileSession.getSnapshot().error ?? "");
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load your account."); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (auth.loading || auth.error || !auth.session) return;
    router.replace(auth.profile?.doctor?.status === "verified" ? "/(app)" : auth.profile?.doctor ? "/review-status" : "/onboarding");
  }, [auth.loading, auth.error, auth.session?.user.id, auth.profile]);
  return <OnboardingShell onBack={() => router.back()}><View style={styles.body}><Text style={styles.title}>Welcome to <Text style={styles.brand}>Clinzo⁺</Text></Text><Text style={styles.caption}>Setting things up for you..</Text><View style={styles.track}><View style={styles.progress} /></View></View></OnboardingShell>;
}
const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 46 }, title: { fontFamily: fontFamilies.medium, fontSize: 32, color: colors.black, textAlign: "center" }, brand: { color: colors.patient.primaryDark },
  caption: { fontFamily: fontFamilies.regular, fontSize: 18, marginTop: 47, textAlign: "center" },
  track: { height: 9, borderRadius: 10, width: 286, backgroundColor: "#D9D9D9", marginTop: 14 }, progress: { height: 9, borderRadius: 10, width: "65%", backgroundColor: colors.patient.primaryDark },
});
