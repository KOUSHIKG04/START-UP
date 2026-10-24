import { usePhoneSignIn } from "../hooks/usePhoneSignIn";
import { AppText as Text } from "@startup/mobile-ui";
import { Button } from "@startup/mobile-ui";
import { Input } from "@startup/mobile-ui";

import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";

import {
  onboardingButtonStyles,
  OnboardingShell,
} from "../components/OnboardingShell";

export default function PhoneScreen() {
  const { phone, setPhone, busy, submit } = usePhoneSignIn();
  return (
    <OnboardingShell onBack={() => router.back()}>
      <View style={styles.body}>
        <Text variant="screenTitle" style={styles.title}>
          Enter your mobile number
        </Text>
        <Text variant="body" style={styles.caption}>
          we’ll send you 6-digit OTP
        </Text>
        <View style={styles.number}>
          <Text variant="label" style={styles.country}>
            +91
          </Text>
          <View style={styles.divider} />
          <Input
            variant="unstyled"
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

        <View style={styles.action}>
          <Button
            loading={busy}
            theme="patient"
            style={onboardingButtonStyles.button}
            labelStyle={onboardingButtonStyles.label}
            rightIcon={
              <Text variant="button" style={onboardingButtonStyles.label}>
                ›
              </Text>
            }
            label={busy ? "Sending…" : "Send OTP"}
            disabled={busy || phone.replace(/\D/g, "").length !== 10}
            onPress={() => void submit()}
          />
        </View>
        <Text variant="body" style={styles.safe}>
          ♢ Your number is safe with us.
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: 24 },
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
