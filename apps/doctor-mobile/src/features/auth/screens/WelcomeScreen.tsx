import { Image, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import { OnboardingButton, OnboardingShell } from "../components/OnboardingShell";

export default function WelcomeScreen() {
  return <OnboardingShell><View style={styles.body}>
    <View style={styles.brand}><Text style={styles.name}>Clinzo<Text style={styles.plus}>+</Text></Text><Text style={styles.tagline}>Right Care. Right Time.</Text></View>
    <View style={styles.action}><OnboardingButton label="GET STARTED" onPress={() => router.push("/login")} /><Text style={styles.trust}>Care for patients with Clinzo</Text></View>
  </View></OnboardingShell>;
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 195 },
  brand: { alignItems: "center" },
  name: { color: colors.patient.primaryDark, fontFamily: fontFamilies.medium, fontSize: 48 },
  plus: { fontSize: 30 },
  tagline: { color: colors.black, fontFamily: fontFamilies.regular, fontStyle: "italic", fontSize: 16, marginTop: 3 },
  action: { width: "100%", maxWidth: 296, marginTop: 108 },
  trust: { color: "#6B7280", textAlign: "center", fontFamily: fontFamilies.regular, fontSize: 13, marginTop: 16 },
});
