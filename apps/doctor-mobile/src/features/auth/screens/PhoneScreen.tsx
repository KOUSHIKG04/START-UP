import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import { sendPhoneOtp } from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import {
  OnboardingButton,
  OnboardingShell,
} from "../components/OnboardingShell";

export default function PhoneScreen() {

  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const number = `+91${phone.replace(/\D/g, "")}`;
      await sendPhoneOtp(supabase, number);
      router.push({ pathname: "/verify-otp", params: { phone: number } });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send the code."
      );
    } finally {
      setBusy(false);
    }
    
  }


  return (
    <OnboardingShell onBack={() => router.back()}>
      <View style={styles.body}>
        <Text style={styles.title}>Enter your mobile number</Text>
        <Text style={styles.caption}>we’ll send you 6-digit OTP</Text>
        <View style={styles.number}>
          <Text style={styles.country}>+91</Text>
          <View style={styles.divider} />
          <TextInput
            accessibilityLabel="Mobile number"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={10}
            placeholder="9483XXXXXX"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
          />
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <View style={styles.action}>
          <OnboardingButton
            label={busy ? "Sending…" : "Send OTP"}
            disabled={busy || phone.replace(/\D/g, "").length !== 10}
            onPress={() => void submit()}
          />
        </View>
        <Text style={styles.safe}>♢ Your number is safe with us.</Text>
      </View>
    </OnboardingShell>
  );
}


const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: 135 },
  title: {
    fontFamily: fontFamilies.medium,
    fontSize: 24,
    color: colors.black,
    textAlign: "center",
  },
  caption: {
    marginTop: 8,
    fontFamily: fontFamilies.regular,
    fontStyle: "italic",
    fontSize: 14,
  },
  number: {
    marginTop: 36,
    width: "100%",
    maxWidth: 296,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7C7C7",
    borderRadius: 12,
  },
  country: {
    paddingHorizontal: 15,
    fontFamily: fontFamilies.regular,
    fontSize: 20,
  },
  divider: { height: 52, width: 1, backgroundColor: "#C7C7C7" },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.regular,
    fontSize: 20,
  },
  action: { width: "100%", maxWidth: 296, marginTop: 17 },
  safe: {
    marginTop: 17,
    color: "#777",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  error: { color: colors.danger, marginTop: 10, fontSize: 13 },
});
