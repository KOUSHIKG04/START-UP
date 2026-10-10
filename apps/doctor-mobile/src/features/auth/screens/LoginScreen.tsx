import { Input } from "@startup/mobile-ui";
import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { colors, fontFamilies } from "@startup/design-tokens";
import {
  signInWithDevPassword,
  signUpWithDevPassword,
} from "@startup/data-access";
import { devPasswordLoginEnabled, supabase } from "../../../services/supabase";
import {
  OnboardingButton,
  OnboardingShell,
} from "../components/OnboardingShell";

const doctor = require("../../../../assets/images/onboarding/doctor.png");

export default function LoginScreen() {
  const [mode, setMode] = useState<"dev" | "prod">(
    devPasswordLoginEnabled ? "dev" : "prod"
  );
  const emailOpen = devPasswordLoginEnabled && mode === "dev";
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });


  async function signIn() {
    if (!devPasswordLoginEnabled || busy) return;
    if (!supabase) {
      setError("Supabase is not configured on this device.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signInWithDevPassword(supabase, email, password);
      router.replace("/setup");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }


  async function signUp() {
    if (!devPasswordLoginEnabled || busy) return;

    if (!supabase) {
      setError("Supabase is not configured on this device.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const session = await signUpWithDevPassword(supabase, email, password);
      if (session) router.replace("/setup");
      else setConfirmationPending(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create your account."
      );
    } finally {
      setBusy(false);
    }

  }


  function switchEmailMode() {
    setEmailMode(emailMode === "signin" ? "signup" : "signin");
    setError("");
    setConfirmPassword("");
    setConfirmationPending(false);
  }


  return (
    <OnboardingShell
      onBack={() => router.back()}
      scroll={emailOpen}
    >
      <View style={styles.body}>
        {devPasswordLoginEnabled ? (
          <View style={styles.switchContainer}>
            {(["dev", "prod"] as const).map((loginMode) => (
              <Pressable
                key={loginMode}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === loginMode, disabled: busy }}
                accessibilityLabel={loginMode === "dev" ? "Switch to Development mode" : "Switch to Production mode"}
                disabled={busy}
                onPress={() => {
                  setMode(loginMode);
                  setError("");
                }}
                style={[styles.modeButton, mode === loginMode && styles.modeButtonActive]}
              >
                <Text style={[styles.modeText, mode === loginMode && styles.modeTextActive]}>
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
                <Input variant="unstyled"
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
                <Input variant="unstyled"
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
                  <Input variant="unstyled"
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

                <OnboardingButton loading={busy}
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
                onPress={() => setError(devPasswordLoginEnabled
                  ? "Google sign-in is not configured yet. Use Dev (Email) for testing."
                  : "Google sign-in is not configured yet.")}
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
  form: { width: "100%", maxWidth: 330, gap: 14, marginTop: 32, paddingBottom: 24 },
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
