import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { OnboardingButton } from "./OnboardingShell";

type DevEmailAuthFormProps = {
  confirmationPending: boolean;
  onBackToSignIn: () => void;
  emailMode: "signin" | "signup";
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  busy: boolean;
  error: string;
  onSubmit: () => void;
  onSwitchEmailMode: () => void;
};

function EmailConfirmationNotice({
  email,
  onBackToSignIn,
}: {
  email: string;
  onBackToSignIn: () => void;
}) {
  return (
    <>
      <Text style={styles.info}>
        If an account can be created for {email.trim()}, Supabase will send a
        confirmation link. Open it, then return here and sign in to create your
        patient profile.
      </Text>
      <OnboardingButton label="Back to sign in" onPress={onBackToSignIn} />
    </>
  );
}

function EmailCredentialsForm({
  emailMode,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  busy,
  error,
  onSubmit,
  onSwitchEmailMode,
}: Omit<DevEmailAuthFormProps, "confirmationPending" | "onBackToSignIn">) {
  const isSignUp = emailMode === "signup";
  const isSubmitDisabled =
    busy || !email || !password || (isSignUp && !confirmPassword);

  const submitLabel = busy
    ? isSignUp
      ? "Creating account…"
      : "Signing in…"
    : isSignUp
      ? "Create account"
      : "Sign in";

  return (
    <>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="your@email.com"
        value={email}
        onChangeText={onEmailChange}
        style={styles.input}
        editable={!busy}
      />
      <TextInput
        accessibilityLabel="Password"
        autoComplete={isSignUp ? "new-password" : "password"}
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={onPasswordChange}
        style={styles.input}
        editable={!busy}
      />
      {isSignUp ? (
        <TextInput
          accessibilityLabel="Confirm password"
          autoComplete="new-password"
          secureTextEntry
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={onConfirmPasswordChange}
          style={styles.input}
          editable={!busy}
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <OnboardingButton
        label={submitLabel}
        disabled={isSubmitDisabled}
        onPress={onSubmit}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onSwitchEmailMode}
        disabled={busy}
      >
        <Text style={styles.switchText}>
          {isSignUp
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </Text>
      </Pressable>
    </>
  );
}

export function DevEmailAuthForm(props: DevEmailAuthFormProps) {
  if (props.confirmationPending) {
    return (
      <View style={styles.form}>
        <Text style={styles.formHeading}>Check your email</Text>
        <EmailConfirmationNotice
          email={props.email}
          onBackToSignIn={props.onBackToSignIn}
        />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formHeading}>
        {props.emailMode === "signup"
          ? "Create your account"
          : "Sign in with email"}
      </Text>
      <EmailCredentialsForm {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  formHeading: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    color: colors.patient.text,
    marginBottom: 4,
  },
  info: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: colors.patient.textSecondary,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: colors.patient.text,
    backgroundColor: "#FAFAFA",
  },
  error: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: "#DC2626",
  },
  switchText: {
    fontSize: 13,
    fontFamily: fontFamilies.medium,
    color: colors.patient.primaryDark,
    textAlign: "center",
    marginTop: 6,
  },
});
