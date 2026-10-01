import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { sendPhoneOtp, verifyPhoneOtp } from "@startup/data-access";
import { colors, fontFamilies } from "@startup/design-tokens";
import { mobileSession, supabase } from "../../services/supabase";

export default function DriverVerifyOtp() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<TextInput>(null);
  
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  
  async function verify(value: string) {
    if (!supabase || !phone || value.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      await verifyPhoneOtp(supabase, phone, value);
      await mobileSession.refresh();
      router.replace(
        mobileSession.getSnapshot().profile?.driver ? "/(app)" : "/onboarding"
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Incorrect code. Try again."
      );
      setCode("");
    } finally {
      setBusy(false);
    }
  }
  
  async function resend() {
    if (!supabase || !phone || seconds > 0) return;
    try {
      await sendPhoneOtp(supabase, phone);
      setSeconds(30);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not resend the code."
      );
    }
  }
  
  return (
    <View style={styles.screen}>
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the 6-digit OTP sent to</Text>
        <Text style={styles.phone}>{phone}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter six-digit code"
          onPress={() => input.current?.focus()}
          style={styles.digits}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={styles.digit}>
              <Text style={styles.digitText}>{code[index] ?? ""}</Text>
            </View>
          ))}
          <TextInput
            ref={input}
            accessibilityLabel="Six-digit verification code"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            value={code}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, "").slice(0, 6);
              setCode(digits);
              if (digits.length === 6) void verify(digits);
            }}
            style={styles.hiddenInput}
          />
        </Pressable>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={seconds > 0 || busy}
          onPress={() => void resend()}
          style={styles.resend}
        >
          <Text style={styles.resendText}>
            Resend OTP{" "}
            {seconds > 0 ? `in 00:${String(seconds).padStart(2, "0")}` : "now"}
          </Text>
        </Pressable>
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
  },
  subtitle: { fontFamily: fontFamilies.regular, fontSize: 14, marginTop: 8 },
  phone: {
    color: colors.driver.primary,
    fontFamily: fontFamilies.medium,
    marginTop: 7,
  },
  digits: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 320,
    justifyContent: "space-between",
    marginTop: 36,
  },
  digit: {
    width: 42,
    height: 48,
    borderWidth: 1,
    borderColor: "#BACFD0",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: { fontFamily: fontFamilies.medium, fontSize: 23 },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  resend: { marginTop: 25, padding: 8 },
  resendText: { color: colors.driver.primary, fontSize: 14 },
  error: { color: colors.danger, marginTop: 15 },
});
