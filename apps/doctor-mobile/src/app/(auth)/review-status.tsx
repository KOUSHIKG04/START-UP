import { Image, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Button, useToastFeedback } from "@startup/mobile-ui";
import { colors, fontFamilies } from "@startup/design-tokens";
import { OnboardingShell } from "../../features/auth/components/OnboardingShell";
import { useDoctorVerification } from "../../features/auth/hooks/useDoctorVerification";

const verification = require("../../../assets/images/onboarding/verification.png");

export default function ReviewStatus() {
  const { profile, submitted, review, error } = useDoctorVerification();
  useToastFeedback({ error });
  const description = profile?.doctor?.status === "suspended"
    ? "Your account needs support before you can practise."
    : submitted === false ? "Complete your profile to submit it for verification."
    : review?.status === "needs_resubmission" ? "Your submission needs an update. Check Status to see what to replace."
    : "Please wait until we verify your profile.";
  return <OnboardingShell onBack={() => router.back()} scroll>
    <View style={styles.body}>
      <Image source={verification} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>Thank You!</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.actions}>
        <Button theme="doctor" variant="outline" label="Check Status"
          onPress={() => router.push("/verification-status" as Href)} />
      </View>
    </View>
  </OnboardingShell>;
}
const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 75, paddingBottom: 30 },
  image: { width: "100%", height: 240, maxWidth: 361 },
  title: { marginTop: 10, fontFamily: fontFamilies.bold, color: "#0A4A47", fontSize: 26 },
  description: { marginTop: 16, fontFamily: fontFamilies.regular, color: colors.textPrimary, fontSize: 17, textAlign: "center", lineHeight: 27 },
  actions: { width: "100%", maxWidth: 296, marginTop: 30 },
});
