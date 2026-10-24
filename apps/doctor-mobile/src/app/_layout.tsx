import { LiveUpdatesBridge } from "../services/LiveUpdatesBridge";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  interFonts,
  Loader,
  SafeAreaProvider,
  MobileThemeProvider,
  ToastProvider,
  useToast,
  useToastFeedback,
} from "@startup/mobile-ui";
import { QueryProvider } from "../providers/QueryProvider";
import { Button } from "@startup/mobile-ui";
import { signOutWithPushCleanup } from "../features/notifications/services/deviceNotifications";
import { useDeviceNotifications } from "../features/notifications/hooks/useDeviceNotifications";
import { mobileSession, useMobileSession } from "../services/supabase";

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = { initialRouteName: "(app)" };

function DeviceNotificationsBridge({ identityId }: { identityId?: string }) {
  const { showToast } = useToast();
  useDeviceNotifications(identityId, showToast);
  return null;
}

function SessionFeedback({ error }: { error: string | null }) {
  useToastFeedback({ error: error ?? "" });
  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts(interFonts);
  const auth = useMobileSession();
  const routedAccount = useRef<string | null>(null);
  useEffect(() => {
    if (auth.loading || (!loaded && !error)) return;
    if (!auth.session) {
      routedAccount.current = null;
      return;
    }
    if (auth.error || routedAccount.current === auth.session.user.id) return;
    routedAccount.current = auth.session.user.id;
    if (auth.profile?.doctor?.status !== "verified")
      router.replace(auth.profile?.doctor ? "/review-status" : "/onboarding");
  }, [
    auth.loading,
    auth.error,
    auth.session?.user.id,
    auth.profile,
    loaded,
    error,
  ]);

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  if (auth.loading)
    return (
      <View style={styles.root}>
        <Loader theme="doctor" size="large" style={{ flex: 1 }} />
      </View>
    );
  if (auth.session && auth.error && !auth.profile)
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", padding: 24, gap: 16 },
        ]}
      >
        <Text accessibilityRole="alert">{auth.error}</Text>
        <Button label="Retry" onPress={() => void mobileSession.refresh()} />
        <Button
          label="Sign out"
          variant="outline"
          onPress={() => void signOutWithPushCleanup()}
        />
      </View>
    );
  return (
    <MobileThemeProvider theme="doctor">
      <SafeAreaProvider>
        <ToastProvider>
          <SessionFeedback error={auth.error} />
          <DeviceNotificationsBridge identityId={auth.profile?.identity_id} />
          <QueryProvider>
            <LiveUpdatesBridge identityId={auth.profile?.identity_id} />
            <View style={styles.root}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "none",
                  contentStyle: styles.scene,
                }}
              >
                <Stack.Protected
                  guard={Boolean(
                    auth.session && auth.profile?.doctor?.status === "verified"
                  )}
                >
                  <Stack.Screen name="(app)" />
                </Stack.Protected>
                <Stack.Protected
                  guard={
                    !auth.session || auth.profile?.doctor?.status !== "verified"
                  }
                >
                  <Stack.Screen name="(auth)" />
                </Stack.Protected>
              </Stack>
              <StatusBar
                style={
                  auth.profile?.doctor?.status === "verified" ? "light" : "dark"
                }
              />
            </View>
          </QueryProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </MobileThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  scene: { flex: 1, backgroundColor: "#FFFFFF" },
});
