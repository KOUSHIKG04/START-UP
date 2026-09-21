import { useEffect } from "react";
import { View } from "react-native";
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
export const unstable_settings = { initialRouteName: "(auth)" };
export default function RootLayout() {
  const [loaded, error] = useFonts(albertSansFonts);
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <MobileThemeProvider theme="driver">
      <SafeAreaProvider>
        <QueryProvider>
          <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#fff" },
                animation: "none",
              }}
            />
            <StatusBar style="light" />
          </View>
        </QueryProvider>
      </SafeAreaProvider>
    </MobileThemeProvider>
  );
}
