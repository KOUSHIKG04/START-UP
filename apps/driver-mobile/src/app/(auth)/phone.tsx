import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { sendPhoneOtp } from "@startup/data-access";
import { colors, fontFamilies } from "@startup/design-tokens";
import { supabase } from "../../services/supabase";

export default function DriverPhone() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    const number = `+91${phone.replace(/\D/g, "")}`;
    setBusy(true);
    setError("");
    try {
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
    <View style={styles.screen}>
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.title}>Enter your mobile number</Text>
        <Text style={styles.subtitle}>We’ll send you a 6-digit OTP</Text>
        <View style={styles.number}>
          <Text style={styles.country}>+91</Text>
          <TextInput
            accessibilityLabel="Mobile number"
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            placeholder="9483XXXXXX"
            style={styles.input}
          />
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy || phone.replace(/\D/g, "").length !== 10}
          onPress={() => void submit()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {busy ? "Sending…" : "Send OTP"}
          </Text>
        </Pressable>
        <Text style={styles.safe}>Your number is safe with us.</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white", padding: 24, paddingTop: 58 },
  back: { color: colors.driver.primary, fontSize: 17 },
  content: { alignItems: "center", paddingTop: 110 },
  title: {
    fontFamily: fontFamilies.medium,
    fontSize: 24,
    color: colors.driver.text,
    textAlign: "center",
  },
  subtitle: { fontFamily: fontFamilies.regular, fontSize: 14, marginTop: 8 },
  number: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 305,
    height: 54,
    borderWidth: 1,
    borderColor: "#C7D9D9",
    borderRadius: 12,
    marginTop: 38,
  },
  country: {
    paddingHorizontal: 16,
    fontSize: 19,
    borderRightWidth: 1,
    borderRightColor: "#C7D9D9",
  },
  input: { flex: 1, height: 52, paddingHorizontal: 15, fontSize: 19 },
  button: {
    width: "100%",
    maxWidth: 305,
    minHeight: 54,
    backgroundColor: colors.driver.primary,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginTop: 18,
  },
  buttonText: { color: "white", fontFamily: fontFamilies.bold, fontSize: 17 },
  safe: { color: colors.driver.textSecondary, marginTop: 20 },
  error: { color: colors.danger, marginTop: 15 },
});
