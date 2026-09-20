import { Stack } from "expo-router";
import { colors } from "@startup/design-tokens";

// Add the session guard when authentication is connected. The UI stays accessible for now.
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
    </Stack>
  );
}
