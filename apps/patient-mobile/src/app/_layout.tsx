import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@startup/design-tokens";
import { albertSansFonts, SafeAreaProvider } from "@startup/mobile-ui";
import { QueryProvider } from "../providers/QueryProvider";

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
              <Stack.Screen name="(app)" />
              <Stack.Screen name="(auth)" />
            </Stack>
          </View>
        </ThemeProvider>
      </QueryProvider>
    </SafeAreaProvider>
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
