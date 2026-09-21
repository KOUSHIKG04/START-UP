import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
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

void SplashScreen.preventAutoHideAsync();
export const unstable_settings = { initialRouteName: "(app)" };
export default function RootLayout() {
  const [loaded, error] = useFonts(albertSansFonts);
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
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
              <Stack.Screen name="(app)" />
              <Stack.Screen name="(auth)" />
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
