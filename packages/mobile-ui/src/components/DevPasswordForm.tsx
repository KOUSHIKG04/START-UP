import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "@startup/design-tokens";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";

export function DevPasswordForm({
  title,
  onSignIn,
  onSignUp,
  configurationError,
}: {
  title: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp?: (email: string, password: string) => Promise<boolean>;
  configurationError?: string | null;
}) {
  const theme = useMobileTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup" && onSignUp) {
        if (password.length < 12 || password !== confirmPassword) {
          throw new Error("Use matching passwords with at least 12 characters.");
        }
        const signedIn = await onSignUp(email, password);
        if (!signedIn) setConfirmationNeeded(true);
      } else {
        await onSignIn(email, password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: theme.text }]}>
        {confirmationNeeded ? "Check your email for a confirmation link, then sign in." : mode === "signup" ? "Create a development account on the disposable Supabase project." : "Development test login. Use a fixture account from the disposable Supabase project."}
      </Text>
      {confirmationNeeded ? (
        <Button label="Back to sign in" onPress={() => { setConfirmationNeeded(false); setMode("signin"); setPassword(""); setConfirmPassword(""); }} />
      ) : <>
      <Input
        label="Test account email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <Input
        label="Password"
        secureTextEntry
        autoComplete={mode === "signup" ? "new-password" : "password"}
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />
      {mode === "signup" ? <Input label="Confirm password" secureTextEntry autoComplete="new-password" value={confirmPassword} onChangeText={setConfirmPassword} editable={!busy} /> : null}
      {configurationError || error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {configurationError ?? error}
        </Text>
      ) : null}
      {busy ? <ActivityIndicator color={theme.primary} /> : null}
      <Button
        label={mode === "signup" ? "Create account" : "Sign in to test account"}
        disabled={busy || !email.trim() || !password || !!configurationError || (mode === "signup" && !confirmPassword)}
        onPress={() => void submit()}
      />
      {onSignUp ? <Button variant="ghost" label={mode === "signup" ? "Already have an account? Sign in" : "Create a test account"} disabled={busy} onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }} /> : null}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", gap: 20, padding: 24 },
  title: { fontFamily: fontFamilies.bold, fontSize: 28 },
  description: { fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 22 },
  error: { color: "#B42318", fontFamily: fontFamilies.regular, fontSize: 14 },
});
