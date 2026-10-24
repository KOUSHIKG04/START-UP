import { useAccountSetup } from "../hooks/useAccountSetup";

import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";

import { OnboardingShell } from "../components/OnboardingShell";

export default function SetupScreen() {
  const {} = useAccountSetup();
  return (
    <OnboardingShell onBack={() => router.back()}>
      <View style={styles.body}>
        <Text style={styles.title}>
          Welcome to <Text style={styles.brand}>Clinzo⁺</Text>
        </Text>
        <Text style={styles.caption}>Setting things up for you..</Text>
        <View style={styles.track}>
          <View style={styles.progress} />
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 46,
  },
  title: {
    fontFamily: fontFamilies.medium,
    fontSize: 32,
    color: colors.black,
    textAlign: "center",
  },
  brand: { color: colors.patient.primaryDark },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    marginTop: 47,
    textAlign: "center",
  },
  track: {
    height: 9,
    borderRadius: 10,
    width: 286,
    backgroundColor: "#D9D9D9",
    marginTop: 14,
  },
  progress: {
    height: 9,
    borderRadius: 10,
    width: "65%",
    backgroundColor: colors.patient.primaryDark,
  },
});
