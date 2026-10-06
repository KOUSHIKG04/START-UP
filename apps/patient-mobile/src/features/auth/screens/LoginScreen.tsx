import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Phone } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import {
  signInWithDevPassword,
  signUpWithDevPassword,
} from "@startup/data-access";
import {
  devPasswordLoginEnabled,
  supabase,
} from "../../../services/supabase";
import {
  OnboardingButton,
  OnboardingShell,
} from "../components/OnboardingShell";
import { DevEmailAuthForm } from "../components/DevEmailAuthForm";
import { ProdAuthChoices } from "../components/ProdAuthChoices";

const doctor = require("../../../../assets/images/onboarding/doctor.png");

export default function LoginScreen() {
  const [mode, setMode] = useState<"dev" | "prod">("dev");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });

  async function signIn() {
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
    if (!supabase) {
      setError("Supabase is not configured on this device.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 12) {
      setError("Use a password with at least 12 characters.");
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
        cause instanceof Error ? cause.message : "Could not create your account."
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

  async function continueWithGoogle() {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Google sign-in is not configured yet on this development project."
      );
    }
  }

  return (
    <OnboardingShell
      onBack={() => router.back()}
      scroll={mode === "dev"}
      bottomArt
    >
      <View style={styles.body}>
        {/* Top Environment Switch */}
        <View style={styles.switchWrapper}>
          <View style={styles.switchContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to Development mode"
              accessibilityState={{ selected: mode === "dev" }}
              onPress={() => {
                setMode("dev");
                setError("");
              }}
              style={[
                styles.switchBtn,
                mode === "dev" && styles.switchBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.switchBtnText,
                  mode === "dev" && styles.switchBtnTextActive,
                ]}
              >
                Dev (Email)
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch to Production mode"
              accessibilityState={{ selected: mode === "prod" }}
              onPress={() => {
                setMode("prod");
                setError("");
              }}
              style={[
                styles.switchBtn,
                mode === "prod" && styles.switchBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.switchBtnText,
                  mode === "prod" && styles.switchBtnTextActive,
                ]}
              >
                Prod (Figma)
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.heading}>
          Welcome to{" "}
          <Text style={styles.brand}>
            Clinzo<Text style={styles.plus}>⁺</Text>
          </Text>
        </Text>
        <Text style={styles.tagline}>Right Care. Right Time.</Text>

        {mode === "dev" ? (
          <DevEmailAuthForm
            confirmationPending={confirmationPending}
            onBackToSignIn={() => {
              setConfirmationPending(false);
              setEmailMode("signin");
              setPassword("");
              setConfirmPassword("");
            }}
            emailMode={emailMode}
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            confirmPassword={confirmPassword}
            onConfirmPasswordChange={setConfirmPassword}
            busy={busy}
            onSubmit={() => void (emailMode === "signup" ? signUp() : signIn())}
            onSwitchEmailMode={switchEmailMode}
          />
        ) : (
          <>
            <Image source={doctor} style={styles.doctor} resizeMode="contain" />
            <ProdAuthChoices
              onContinueWithGoogle={() => void continueWithGoogle()}
              onContinueWithPhone={() => router.push("/phone")}
            />
          </>
        )}

            <Text style={styles.terms}>
              By continuing, you agree to our{"\n"}
              <Text style={styles.link}>Terms of Services</Text> and{" "}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 20,
    width: "100%",
  },
  switchWrapper: {
    marginBottom: 16,
    alignItems: "center",
  },
  switchContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F4F5",
    borderRadius: 22,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E1E7E8",
  },
  switchBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  switchBtnActive: {
    backgroundColor: colors.patient.primaryDark,
    shadowColor: colors.patient.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchBtnText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: "#64748B",
  },
  switchBtnTextActive: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
  },
  heading: {
    color: colors.black,
    fontFamily: fontFamilies.medium,
    fontSize: 24,
  },
  brand: {
    color: colors.patient.primaryDark,
  },
  plus: {
    fontSize: 18,
  },
  tagline: {
    marginTop: 4,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    fontStyle: "italic",
    color: colors.black,
  },
  doctor: {
    width: 268,
    height: 194,
    marginTop: 28,
  },
  choices: {
    width: "100%",
    maxWidth: 296,
    marginTop: 36,
    gap: 14,
  },
  socialButton: {
    width: "100%",
    height: 54,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.19)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  socialButtonText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
  },
  buttonPressed: {
    opacity: 0.72,
    backgroundColor: "#F9FBFB",
  },
  terms: {
    marginTop: 36,
    textAlign: "center",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
  },
  link: {
    color: colors.patient.primaryDark,
  },
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
    backgroundColor: colors.white,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: "center",
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
