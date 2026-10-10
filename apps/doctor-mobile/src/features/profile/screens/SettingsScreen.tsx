import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  ChevronRight,
  LogOut,
  MessageCircle,
  Moon,
  ShieldCheck,
} from "lucide-react-native";
import { Button, Card, ModalSurface, useToast } from "@startup/mobile-ui";
import { fontFamilies } from "@startup/design-tokens";
import { DoctorScreen, Heading, Label } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { signOutWithPushCleanup } from "../../notifications/deviceNotifications";
import { useDoctorStore } from "../../../stores/useDoctorStore";
export function SettingsScreen() {
  const [logout, setLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const mounted = useRef(false);
  const { showToast } = useToast();
  const reset = useDoctorStore((s) => s.reset);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await signOutWithPushCleanup();
      if (result?.error) throw result.error;
      reset();
      router.replace("/");
    } catch (cause) {
      if (mounted.current)
        showToast({
          title: "Could not sign out",
          message: cause instanceof Error ? cause.message : "Try again.",
          type: "error",
        });
    } finally {
      if (mounted.current) setSigningOut(false);
    }
  }
  return (
    <DoctorScreen title="Settings" bottomNav={false} contentStyle={{ gap: 14 }}>
      <Card
        theme="doctor"
        variant="outlined"
        padding={16}
        style={{ opacity: 0.55 }}
      >
        <View style={styles.row}>
          <View style={styles.icon}>
            <Moon size={20} color={palette.muted} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Dark Mode</Text>
            <Text style={styles.subtitle}>
              System default • Dark mode coming soon
            </Text>
          </View>
          <Switch
            accessibilityLabel="Dark mode unavailable"
            disabled
            value={false}
          />
        </View>
      </Card>
      {[
        { title: "Notification Preferences", subtitle: "Manage device notification permissions", icon: Bell },
        {
          title: "Help & Support",
          subtitle: "Contact your clinic or operator",
          icon: MessageCircle,
        },
        {
          title: "Privacy Policy",
          subtitle: "Account and document information",
          icon: ShieldCheck,
        },
        {
          title: "Log Out",
          subtitle: "Sign out of your Clinzo doctor account",
          icon: LogOut,
        },
      ].map(({ title, subtitle, icon: Icon }) => (
        <Card
          key={title}
          theme="doctor"
          variant="outlined"
          padding={0}
          style={styles.card}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              title === "Log Out"
                ? setLogout(true)
                : router.push({
                    pathname: "/profile-option",
                    params: { option: title },
                  })
            }
            style={({ pressed }) => [
              styles.row,
              styles.action,
              pressed && { backgroundColor: "#0C243408" },
            ]}
          >
            <View style={styles.icon}>
              <Icon
                size={20}
                color={title === "Log Out" ? palette.danger : palette.primary}
              />
            </View>
            <View style={styles.copy}>
              <Text
                style={[
                  styles.title,
                  title === "Log Out" && { color: palette.danger },
                ]}
              >
                {title}
              </Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <ChevronRight size={18} color={palette.muted} />
          </Pressable>
        </Card>
      ))}
      <ModalSurface
        visible={logout}
        onClose={() => {
          if (!signingOut) setLogout(false);
        }}
      >
        <Heading>Sign out of your account?</Heading>
        <Label>You can sign back in with the same verified account.</Label>
        <View style={ui.row}>
          <Button
            label="Cancel"
            theme="doctor"
            variant="secondary"
            style={ui.flex}
            disabled={signingOut}
            onPress={() => setLogout(false)}
          />
          <Button
            label="Sign out"
            theme="doctor"
            style={ui.flex}
            loading={signingOut}
            onPress={() => void signOut()}
          />
        </View>
      </ModalSurface>
    </DoctorScreen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  action: { padding: 16, borderRadius: 12 },
  card: { overflow: "hidden", borderColor: palette.border },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDF9F7",
    justifyContent: "center",
    alignItems: "center",
  },
  copy: { flex: 1, gap: 3 },
  title: { fontFamily: fontFamilies.medium, fontSize: 14, color: palette.text },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: palette.muted,
  },
});
