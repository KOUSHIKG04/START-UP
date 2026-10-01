import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import { getMyVerificationCase, hasMyDoctorClaim, type MyVerificationCase } from "@startup/data-access";
import { OnboardingButton, OnboardingShell } from "../../features/auth/components/OnboardingShell";
import { mobileSession, supabase, useMobileSession } from "../../services/supabase";
import { signOutWithPushCleanup } from "../../features/notifications/deviceNotifications";

const verification = require("../../../assets/images/onboarding/verification.png");

export default function ReviewStatus() {
  const { profile } = useMobileSession();
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [review, setReview] = useState<MyVerificationCase | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!supabase) return;
    try { const claim = await hasMyDoctorClaim(supabase); setSubmitted(claim); const doctorId = profile?.doctor?.id; setReview(doctorId ? await getMyVerificationCase(supabase,"doctor",doctorId) : null); await mobileSession.refresh(); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not refresh verification status."); }
  }, [profile?.doctor?.id]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <OnboardingShell onBack={() => router.back()}><View style={styles.body}>
    <Image source={verification} style={styles.image} resizeMode="contain" />
    <Text style={styles.title}>Thank You!</Text>
    <Text style={styles.description}>{profile?.doctor?.status === "suspended" ? "Your account needs support before you can practise." : submitted === false ? "Complete your credential submission to start verification." : review?.status === "needs_resubmission" ? "A document needs a clearer replacement before verification can continue." : "Please Wait Until We Verify Your Profile"}</Text>
    {review?.documents.filter((document) => document.status === "rejected").map((document) => <Text key={document.kind} style={styles.error}>{document.kind.replaceAll("_"," ")}: {document.rejection_reason}</Text>)}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.actions}>{submitted === false || review?.status === "needs_resubmission" ? <OnboardingButton label={submitted === false ? "Complete profile" : "Replace document"} onPress={() => router.push("/onboarding")} /> : <OnboardingButton variant="outline" label="Check status" onPress={() => void refresh()} />}</View>
    <Pressable accessibilityRole="button" onPress={() => void signOutWithPushCleanup()} style={styles.signOut}><Text style={styles.signOutText}>Sign out</Text></Pressable>
  </View></OnboardingShell>;
}
const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 75 }, image: { width: "100%", height: 240, maxWidth: 361 },
  title: { marginTop: 10, fontFamily: fontFamilies.bold, color: "#0A4A47", fontSize: 26 },
  description: { marginTop: 16, fontFamily: fontFamilies.regular, color: colors.textPrimary, fontSize: 17, textAlign: "center", lineHeight: 27 },
  actions: { width: "100%", maxWidth: 296, marginTop: 30 }, signOut: { padding: 15, marginTop: 7 }, signOutText: { color: colors.patient.primaryDark, fontFamily: fontFamilies.medium, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fontFamilies.regular, marginTop: 10, textAlign: "center" },
});
