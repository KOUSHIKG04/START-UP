import { useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "@startup/design-tokens";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";

export function PhoneOtpForm({
  title,
  description,
  onSend,
  onVerify,
  configurationError,
  footer,
}: {
  title: string;
  description: string;
  onSend: (phone: string) => Promise<void>;
  onVerify: (phone: string, code: string) => Promise<void>;
  configurationError?: string | null;
  footer?: ReactNode;
}) {
  const theme = useMobileTheme();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: theme.text }]}
      >
        {title}
      </Text>
      <Text style={[styles.description, { color: theme.text }]}>
        {description}
      </Text>
      <Input
        label="Phone number"
        placeholder="+919876543210"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={setPhone}
        editable={!sent && !busy}
      />
      {sent ? (
        <Input
          label="SMS sign-in code"
          placeholder="Enter code"
          keyboardType="number-pad"
          autoComplete="sms-otp"
          value={code}
          onChangeText={setCode}
          editable={!busy}
        />
      ) : null}
      {configurationError || error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {configurationError ?? error}
        </Text>
      ) : null}
      {busy ? <ActivityIndicator color={theme.primary} /> : null}
      {sent ? (
        <>
          <Button
            label="Verify and continue"
            disabled={busy || !!configurationError}
            onPress={() => void submit(() => onVerify(phone, code))}
          />
          <Button
            label="Use another number"
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setSent(false);
              setCode("");
              setError(null);
            }}
          />
        </>
      ) : (
        <Button
          label="Send sign-in code"
          disabled={busy || !!configurationError}
          onPress={() =>
            void submit(async () => {
              await onSend(phone);
              setSent(true);
            })
          }
        />
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", gap: 20, padding: 24 },
  title: { fontFamily: fontFamilies.bold, fontSize: 28 },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  error: { color: "#B42318", fontFamily: fontFamilies.regular, fontSize: 14 },
});
