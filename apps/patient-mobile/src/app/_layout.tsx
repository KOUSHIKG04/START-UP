import { StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@startup/design-tokens";
import { SafeAreaProvider } from "@startup/mobile-ui";

export default function RootLayout() {
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
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
        </Stack>
      </View>
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
