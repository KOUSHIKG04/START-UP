import { Stack } from "expo-router";
import { colors } from "@startup/design-tokens";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 350,
        freezeOnBlur: true,
        contentStyle: { backgroundColor: colors.patient.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sos" options={{ presentation: "modal" }} />
    </Stack>
  );
}
