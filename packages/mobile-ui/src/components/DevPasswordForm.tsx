import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "@startup/design-tokens";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";

export function DevPasswordForm({
  title,
  onSignIn,
  configurationError,
}: {
  title: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  configurationError?: string | null;
}) {
  const theme = useMobileTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onSignIn(email, password);
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
        Development test login. Use a fixture account from the disposable Supabase project.
      </Text>
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
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />
      {configurationError || error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {configurationError ?? error}
        </Text>
      ) : null}
      {busy ? <ActivityIndicator color={theme.primary} /> : null}
      <Button
        label="Sign in to test account"
        disabled={busy || !email.trim() || !password || !!configurationError}
        onPress={() => void submit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", gap: 20, padding: 24 },
  title: { fontFamily: fontFamilies.bold, fontSize: 28 },
  description: { fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 22 },
  error: { color: "#B42318", fontFamily: fontFamilies.regular, fontSize: 14 },
});
