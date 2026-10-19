import { useVerifyOtp } from "../hooks/useVerifyOtp";
import { AppText as Text } from "@startup/mobile-ui";
import { Button } from "@startup/mobile-ui";
import { Input } from "@startup/mobile-ui";

import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";

import { OnboardingShell } from "../components/OnboardingShell";

export default function VerifyOtpScreen() {
  const {
    phone,
    code,
    setCode,
    resending,
    seconds,
    busy,
    input,
    verify,
    resend,
  } = useVerifyOtp();
  return (
    <OnboardingShell onBack={() => router.back()}>
      <View style={styles.body}>
        <Text variant="screenTitle" style={styles.title}>
          Verify OTP
        </Text>
        <Text variant="body" style={styles.caption}>
          Enter the 6-digit OTP sent to
        </Text>
        <Text variant="body" style={styles.phone}>
          {phone}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter six-digit code"
          onPress={() => input.current?.focus()}
          style={styles.digits}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <View key={index} style={styles.digit}>
              <Text variant="body" style={styles.digitText}>
                {code[index] ?? ""}
              </Text>
            </View>
          ))}
          <Input
            variant="unstyled"
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

        <Button
          loading={resending}
          label="Resend OTP"
          variant="ghost"
          labelStyle={styles.resendText}
          accessibilityRole="button"
          accessibilityState={{ disabled: seconds > 0 || busy || resending }}
          disabled={seconds > 0 || busy || resending}
          onPress={() => void resend()}
          style={styles.resend}
        >
          <Text variant="body" style={styles.resendText}>
            Resend OTP{" "}
            {seconds > 0 ? `in 00:${String(seconds).padStart(2, "0")}` : "now"}
          </Text>
        </Button>
      </View>
    </OnboardingShell>
  );
}
const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: 24 },
  title: { fontFamily: fontFamilies.medium, fontSize: 24, color: colors.black },
  caption: {
    marginTop: 8,
    fontFamily: fontFamilies.regular,
    fontStyle: "italic",
    fontSize: 14,
  },
  phone: {
    marginTop: 8,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontStyle: "italic",
    fontSize: 14,
  },
  digits: {
    width: "100%",
    maxWidth: 316,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 37,
  },
  digit: {
    width: 40,
    height: 47,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontFamily: fontFamilies.medium,
    fontSize: 23,
    color: colors.black,
  },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  resend: { marginTop: 25, padding: 8 },
  resendText: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.patient.primaryDark,
  },
  error: {
    marginTop: 12,
    color: colors.danger,
    textAlign: "center",
    fontSize: 13,
  },
});
