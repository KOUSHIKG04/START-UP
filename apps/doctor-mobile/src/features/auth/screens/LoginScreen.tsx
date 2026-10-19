import { loginScreenItems } from "../utils/loginConstants";
import { useLogin } from "../hooks/useLogin";
import { doctor } from "../utils/loginConstants";
import { Input } from "@startup/mobile-ui";

import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";

import { devPasswordLoginEnabled } from "../../../services/supabase";
import { OnboardingShell } from "../components/OnboardingShell";
import { OnboardingButton } from "../components/OnboardingButton";

export default function LoginScreen() {
  const {
    mode,
    setMode,
    emailOpen,
    emailMode,
    setEmailMode,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    confirmationPending,
    setConfirmationPending,
    busy,
    setError,
    signIn,
    signUp,
    switchEmailMode,
  } = useLogin();
  return (
    <OnboardingShell onBack={() => router.back()} scroll={emailOpen}>
      <View style={styles.body}>
        {devPasswordLoginEnabled ? (
          <View style={styles.switchContainer}>
            {loginScreenItems.map((loginMode) => (
              <Pressable
                key={loginMode}
                accessibilityRole="tab"
                accessibilityState={{
                  selected: mode === loginMode,
                  disabled: busy,
                }}
                accessibilityLabel={
                  loginMode === "dev"
                    ? "Switch to Development mode"
                    : "Switch to Production mode"
                }
                disabled={busy}
                onPress={() => {
                  setMode(loginMode);
                  setError("");
                }}
                style={[
                  styles.modeButton,
                  mode === loginMode && styles.modeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === loginMode && styles.modeTextActive,
                  ]}
                >
                  {loginMode === "dev" ? "Dev (Email)" : "Prod (Figma)"}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text style={styles.heading}>
          Welcome to{" "}
          <Text style={styles.brand}>
            Clinzo<Text style={styles.plus}>+</Text>
          </Text>
        </Text>
        <Text style={styles.tagline}>Right Care. Right Time.</Text>
        {emailOpen ? (
          <View style={styles.form}>
            <Text style={styles.formHeading}>
              {confirmationPending
                ? "Check your email"
                : emailMode === "signup"
                  ? "Create your account"
                  : "Sign in with email"}
            </Text>
            {confirmationPending ? (
              <>
                <Text style={styles.info}>
                  Open the confirmation link sent to {email.trim()}, then return
                  and sign in to complete your doctor profile.
                </Text>
                <OnboardingButton
                  label="Back to sign in"
                  onPress={() => {
                    setConfirmationPending(false);
                    setEmailMode("signin");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                />
              </>
            ) : (
              <>
                <Input
                  variant="unstyled"
                  accessibilityLabel="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="your@email.com"
                  placeholderTextColor={colors.ui.cardDescription}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  editable={!busy}
                />
                <Input
                  variant="unstyled"
                  accessibilityLabel="Password"
                  autoComplete={
                    emailMode === "signup" ? "new-password" : "password"
                  }
                  secureTextEntry
                  placeholder="Password"
                  placeholderTextColor={colors.ui.cardDescription}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  editable={!busy}
                />
                {emailMode === "signup" ? (
                  <Input
                    variant="unstyled"
                    accessibilityLabel="Confirm password"
                    autoComplete="new-password"
                    secureTextEntry
                    placeholder="Confirm password"
                    placeholderTextColor={colors.ui.cardDescription}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={styles.input}
                    editable={!busy}
                  />
                ) : null}

                <OnboardingButton
                  loading={busy}
                  label={
                    busy
                      ? "Please wait…"
                      : emailMode === "signup"
                        ? "Create account"
                        : "Sign in"
                  }
                  disabled={
                    busy ||
                    !email ||
                    !password ||
                    (emailMode === "signup" && !confirmPassword)
                  }
                  onPress={() =>
                    void (emailMode === "signup" ? signUp() : signIn())
                  }
                />
                {devPasswordLoginEnabled ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={switchEmailMode}
                    disabled={busy}
                  >
                    <Text style={styles.switchText}>
                      {emailMode === "signup"
                        ? "Already have an account? Sign in"
                        : "New here? Create an account"}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ) : (
          <>
            <Image source={doctor} style={styles.doctor} resizeMode="contain" />
            <View style={styles.choices}>
              <OnboardingButton
                variant="outline"
                label="Continue with Google"
                onPress={() =>
                  setError(
                    devPasswordLoginEnabled
                      ? "Google sign-in is not configured yet. Use Dev (Email) for testing."
                      : "Google sign-in is not configured yet."
                  )
                }
              />
              <OnboardingButton
                variant="outline"
                label="Continue with Phone"
                onPress={() => router.push("/phone")}
              />
            </View>
            <Text style={styles.terms}>
              By continuing, you agree to our{"\n"}
              <Text style={styles.link}>Terms of Services</Text> and{" "}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </>
        )}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 24 },
  switchContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F4F5",
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E1E7E8",
    marginBottom: 16,
  },
  modeButton: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 18 },
  modeButtonActive: { backgroundColor: colors.patient.primaryDark },
  modeText: { fontFamily: fontFamilies.medium, fontSize: 13, color: "#64748B" },
  modeTextActive: { color: colors.white, fontFamily: fontFamilies.bold },
  heading: {
    color: colors.black,
    fontFamily: fontFamilies.medium,
    fontSize: 24,
  },
  brand: { color: colors.patient.primaryDark },
  plus: { fontSize: 16 },
  tagline: {
    marginTop: 4,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    fontStyle: "italic",
    color: colors.black,
  },
  doctor: { width: 268, height: 194, marginTop: 28 },
  choices: { width: "100%", maxWidth: 296, marginTop: 36, gap: 14 },
  terms: {
    marginTop: 44,
    textAlign: "center",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
  },
  link: { color: colors.patient.primaryDark },
  form: {
    width: "100%",
    maxWidth: 330,
    gap: 14,
    marginTop: 32,
    paddingBottom: 24,
  },
  formHeading: {
    fontFamily: fontFamilies.medium,
    fontSize: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#CFCFCF",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.regular,
    fontSize: 17,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  info: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  switchText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    textAlign: "center",
    padding: 8,
  },
});
