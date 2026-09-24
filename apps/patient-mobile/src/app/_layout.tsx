import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@startup/design-tokens";
import {
  albertSansFonts,
  SafeAreaProvider,
  MobileThemeProvider,
} from "@startup/mobile-ui";
import { QueryProvider } from "../providers/QueryProvider";
import { Button } from "@startup/mobile-ui";
import { mobileSession, supabase, useMobileSession } from "../services/supabase";

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = { initialRouteName: "(app)" };

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

  if (auth.loading) return <View style={styles.root}><ActivityIndicator style={{ flex: 1 }} /></View>;
  if (auth.session && auth.error) return <View style={[styles.root, { justifyContent: "center", padding: 24, gap: 16 }]}><Text accessibilityRole="alert">{auth.error}</Text><Button label="Retry" onPress={() => void mobileSession.refresh()} /><Button label="Sign out" variant="outline" onPress={() => void supabase?.auth.signOut()} /></View>;

  return (
    <MobileThemeProvider theme="patient">
      <SafeAreaProvider>
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
                <Stack.Protected guard={Boolean(auth.session && auth.profile?.patient_id)}><Stack.Screen name="(app)" /></Stack.Protected>
                <Stack.Protected guard={!auth.session || !auth.profile?.patient_id}><Stack.Screen name="(auth)" /></Stack.Protected>
              </Stack>
            </View>
          </ThemeProvider>
        </QueryProvider>
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
