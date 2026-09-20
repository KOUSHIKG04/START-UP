import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { albertSansFonts, SafeAreaProvider } from "@startup/mobile-ui";

void SplashScreen.preventAutoHideAsync();
export const unstable_settings = { initialRouteName: "(app)" };
export default function RootLayout() {
  const [loaded, error] = useFonts(albertSansFonts);
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E6F5F4" },
  scene: { flex: 1, backgroundColor: "#FFFFFF" },
});
