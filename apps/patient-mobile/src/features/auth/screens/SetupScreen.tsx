import { Button } from "@startup/mobile-ui";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { mobileSession } from "../../../services/supabase";
import { onboardingButtonStyles, OnboardingShell } from "../components/OnboardingShell";

export default function SetupScreen() {
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { showToast } = useToast();
  useToastFeedback({ error });
  useEffect(() => {
    let active = true;
    setError("");
    setReady(false);
    Promise.resolve(mobileSession.refresh()).then(() => {
      if (!active) return;
      const { profile, error: accountError } = mobileSession.getSnapshot();
      if (accountError) throw new Error(accountError);
      if (profile?.patient_id && profile.patient_profile_complete) router.replace("/(app)/(tabs)");
      else {
        setReady(true);
        router.replace("/onboarding");
      }
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load your account.");
    });
    return () => { active = false; };
  }, [attempt]);

  function openEmergency() {
    router.push("/onboarding-sos");
  }

  return (
    <OnboardingShell onBack={() => router.back()}>
      <View style={styles.body}>
        <Text style={styles.title}>Welcome to <Text style={styles.brand}>Clinzo⁺</Text></Text>
        <Text style={styles.caption}>Setting things up for you..</Text>
        <View style={styles.track}><View style={styles.progress} /></View>
        {/* Temporarily hidden: onboarding SOS, instructions, and manual continuation.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS"
          accessibilityHint="Hold for 2.3 seconds to open the in-app emergency SOS flow."
          accessibilityActions={[{ name: "activate", label: "Open emergency SOS" }]}
          onAccessibilityAction={openEmergency}
          delayLongPress={2300}
          onLongPress={openEmergency}
          onPress={() => showToast({ title: "Hold Emergency SOS", message: "Hold for 2.3 seconds to open emergency assistance.", type: "info" })}
          style={({ pressed }) => [styles.sos, pressed && styles.sosPressed]}
        >
          <TriangleAlert size={18} color={colors.white} />
          <Text style={styles.sosTitle}>Emergency SOS</Text>
        </Pressable>
        <Text style={styles.instruction}>
          In an emergency, hold this button for 2.3 seconds to request an ambulance before continuing with profile setup.
        </Text>
        <View style={styles.continue}>
          <Button theme="patient" style={onboardingButtonStyles.button} labelStyle={onboardingButtonStyles.label} rightIcon={<Text style={onboardingButtonStyles.label}>›</Text>} label={error ? "Retry setup" : "Continue setup"} disabled={!ready && !error}
            onPress={() => error ? setAttempt(current => current + 1) : router.push("/onboarding")} />
        </View>
        */}
      </View>
    </OnboardingShell>
  );
}
const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 24, paddingBottom: 40 }, title: { fontFamily: fontFamilies.medium, fontSize: 32, color: colors.black, textAlign: "center" }, brand: { color: colors.patient.primaryDark },
  caption: { fontFamily: fontFamilies.regular, fontSize: 18, marginTop: 47, textAlign: "center" },
  track: { height: 9, borderRadius: 10, width: "85%", maxWidth: 286, backgroundColor: "#D9D9D9", marginTop: 14 }, progress: { height: 9, borderRadius: 10, width: "65%", backgroundColor: colors.patient.primaryDark },
  complete: { width: "100%" },
  sos: { marginTop: 40, width: "100%", minHeight: 48, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, backgroundColor: "#E32228", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", boxShadow: "0px 5px 12px #DB141440" },
  sosPressed: { opacity: 0.8 },
  sosTitle: { fontFamily: fontFamilies.bold, fontSize: 16, color: colors.white },
  instruction: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: "center", marginTop: 16 },
  continue: { width: "100%", marginTop: 28 },
});
