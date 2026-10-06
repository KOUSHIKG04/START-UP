import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import { sendPhoneOtp, verifyPhoneOtp } from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import { OnboardingShell } from "../components/OnboardingShell";

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState(""); const [seconds, setSeconds] = useState(30); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useToastFeedback({ error });
  const input = useRef<TextInput>(null);
  useEffect(() => { if (seconds <= 0) return; const timer = setTimeout(() => setSeconds((current) => current - 1), 1000); return () => clearTimeout(timer); }, [seconds]);
  async function verify(value: string) {
    if (!supabase || !phone || value.length !== 6 || busy) return;
    setBusy(true); setError("");
    try { await verifyPhoneOtp(supabase, phone, value); router.replace("/setup"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Incorrect code. Try again."); setCode(""); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (!supabase || !phone || seconds > 0) return;
    try { await sendPhoneOtp(supabase, phone); setSeconds(30); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not resend the code."); }
  }
  return <OnboardingShell onBack={() => router.back()}><View style={styles.body}>
    <Text style={styles.title}>Verify OTP</Text><Text style={styles.caption}>Enter the 6-digit OTP sent to</Text><Text style={styles.phone}>{phone}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Enter six-digit code" onPress={() => input.current?.focus()} style={styles.digits}>
      {Array.from({ length: 6 }, (_, index) => <View key={index} style={styles.digit}><Text style={styles.digitText}>{code[index] ?? ""}</Text></View>)}
      <TextInput ref={input} accessibilityLabel="Six-digit verification code" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} value={code} onChangeText={value => { const digits = value.replace(/\D/g, "").slice(0, 6); setCode(digits); if (digits.length === 6) void verify(digits); }} style={styles.hiddenInput} />
    </Pressable>

    <Pressable accessibilityRole="button" accessibilityState={{ disabled: seconds > 0 || busy }} disabled={seconds > 0 || busy} onPress={() => void resend()} style={styles.resend}><Text style={styles.resendText}>Resend OTP {seconds > 0 ? `in 00:${String(seconds).padStart(2, "0")}` : "now"}</Text></Pressable>
  </View></OnboardingShell>;
}
const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: 123 }, title: { fontFamily: fontFamilies.medium, fontSize: 24, color: colors.black },
  caption: { marginTop: 8, fontFamily: fontFamilies.regular, fontStyle: "italic", fontSize: 14 },
  phone: { marginTop: 8, color: colors.patient.primaryDark, fontFamily: fontFamilies.medium, fontStyle: "italic", fontSize: 14 },
  digits: { width: "100%", maxWidth: 316, flexDirection: "row", justifyContent: "space-between", marginTop: 37 },
  digit: { width: 40, height: 47, borderRadius: 12, borderWidth: 1, borderColor: "#BDBDBD", alignItems: "center", justifyContent: "center" },
  digitText: { fontFamily: fontFamilies.medium, fontSize: 23, color: colors.black },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  resend: { marginTop: 25, padding: 8 }, resendText: { fontFamily: fontFamilies.regular, fontSize: 14, color: colors.patient.primaryDark },
  error: { marginTop: 12, color: colors.danger, textAlign: "center", fontSize: 13 },
});
