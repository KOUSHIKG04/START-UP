import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@startup/design-tokens";
import { albertSansFonts } from "@startup/mobile-ui";
import { AppProviders } from "@/providers/AppProviders";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(albertSansFonts);

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

  return (
    <AppProviders>
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
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </View>
    </AppProviders>
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
