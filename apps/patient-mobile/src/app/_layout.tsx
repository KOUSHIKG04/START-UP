import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@startup/design-tokens";
import {
  albertSansFonts,
  Loader,
  SafeAreaProvider,
  MobileThemeProvider,
  ToastProvider,
  useToast,
} from "@startup/mobile-ui";
import { QueryProvider } from "../providers/QueryProvider";
import { Button } from "@startup/mobile-ui";
import { mobileSession, useMobileSession } from "../services/supabase";
import { signOutWithPushCleanup, useDeviceNotifications } from "../features/notifications/deviceNotifications";

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = { initialRouteName: "(app)" };

function DeviceNotificationsBridge({ identityId }: { identityId?: string }) {
  const { showToast } = useToast();
  useDeviceNotifications(identityId, showToast);
  return null;
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.patient.background,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(albertSansFonts);
  const auth = useMobileSession();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.error("Font loading failed:", fontError);
      }
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (auth.loading) return <View style={styles.root}><Loader theme="patient" size="large" style={{ flex: 1 }} /></View>;
  if (auth.session && auth.error) return <View style={[styles.root, { justifyContent: "center", padding: 24, gap: 16 }]}><Text accessibilityRole="alert">{auth.error}</Text><Button label="Retry" onPress={() => void mobileSession.refresh()} /><Button label="Sign out" variant="outline" onPress={() => void signOutWithPushCleanup()} /></View>;

  return (
    <MobileThemeProvider theme="patient">
      <SafeAreaProvider>
        <ToastProvider>
        <DeviceNotificationsBridge identityId={auth.profile?.identity_id} />
        <QueryProvider>
          <ThemeProvider value={navTheme}>
            <View style={styles.root}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                  animationDuration: 350,
                  freezeOnBlur: true,
                  contentStyle: styles.scene,
                }}
              >
                <Stack.Protected guard={Boolean(auth.session && auth.profile?.patient_id && auth.profile.patient_profile_complete)}><Stack.Screen name="(app)" /></Stack.Protected>
                <Stack.Protected guard={!auth.session || !auth.profile?.patient_id || !auth.profile.patient_profile_complete}><Stack.Screen name="(auth)" /></Stack.Protected>
              </Stack>
            </View>
          </ThemeProvider>
        </QueryProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </MobileThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.patient.background,
  },
  scene: {
    backgroundColor: colors.patient.background,
  },
});
