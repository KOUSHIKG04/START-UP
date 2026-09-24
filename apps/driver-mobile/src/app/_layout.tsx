import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  albertSansFonts,
  SafeAreaProvider,
  MobileThemeProvider,
} from "@startup/mobile-ui";
import { QueryProvider } from "../providers/QueryProvider";
import { Button } from "@startup/mobile-ui";
import { mobileSession, supabase, useMobileSession } from "../services/supabase";
import { DriverLocationReporter } from "../features/tracking/DriverLocationReporter";

void SplashScreen.preventAutoHideAsync();
export const unstable_settings = { initialRouteName: "(auth)" };
export default function RootLayout() {
  const [loaded, error] = useFonts(albertSansFonts);
  const auth = useMobileSession();
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  if (auth.loading) return <View style={{ flex: 1 }}><ActivityIndicator style={{ flex: 1 }} /></View>;
  if (auth.session && auth.error) return <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}><Text accessibilityRole="alert">{auth.error}</Text><Button label="Retry" onPress={() => void mobileSession.refresh()} /><Button label="Sign out" variant="outline" onPress={() => void supabase?.auth.signOut()} /></View>;
  return (
    <MobileThemeProvider theme="driver">
      <SafeAreaProvider>
        <QueryProvider>
          {auth.profile?.driver?.id ? <DriverLocationReporter /> : null}
          <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fff" }, animation: "none" }}>
              <Stack.Protected guard={Boolean(auth.profile?.driver?.id)}><Stack.Screen name="(app)" /></Stack.Protected>
              <Stack.Protected guard={!auth.profile?.driver?.id}><Stack.Screen name="(auth)" /></Stack.Protected>
            </Stack>
            <StatusBar style="light" />
          </View>
        </QueryProvider>
      </SafeAreaProvider>
    </MobileThemeProvider>
  );
}
