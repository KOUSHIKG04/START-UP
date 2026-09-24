import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../services/supabase";

void SplashScreen.preventAutoHideAsync();
export const unstable_settings = { initialRouteName: "(app)" };
export default function RootLayout() {
  const [loaded, error] = useFonts(albertSansFonts);
  const auth = useMobileSession();
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  if (auth.loading)
    return (
      <View style={styles.root}>
        <ActivityIndicator style={{ flex: 1 }} />
      </View>
    );
  if (auth.session && auth.error)
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
          onPress={() => void supabase?.auth.signOut()}
        />
      </View>
    );
  return (
    <MobileThemeProvider theme="doctor">
      <SafeAreaProvider>
        <QueryProvider>
          <View style={styles.root}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "none",
                contentStyle: styles.scene,
              }}
            >
              <Stack.Protected
                guard={auth.profile?.doctor?.status === "verified"}
              >
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected
                guard={auth.profile?.doctor?.status !== "verified"}
              >
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
            </Stack>
            <StatusBar style="dark" />
          </View>
        </QueryProvider>
      </SafeAreaProvider>
    </MobileThemeProvider>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E6F5F4" },
  scene: { flex: 1, backgroundColor: "#FFFFFF" },
});
