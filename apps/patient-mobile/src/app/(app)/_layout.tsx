import { Stack } from "expo-router";
import { colors } from "@startup/design-tokens";

// Add the session guard when authentication is connected. The UI stays accessible for now.
export const unstable_settings = { initialRouteName: "(tabs)" };

export default function AppLayout() {
  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 350,
        freezeOnBlur: true,
        contentStyle: { backgroundColor: colors.patient.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="learn-booking" options={{ statusBarStyle: "dark" }} />
      <Stack.Screen name="select-location" options={{ animation: "slide_from_right", statusBarStyle: "light" }} />
      <Stack.Screen name="pick-location" options={{ animation: "slide_from_right", statusBarStyle: "light" }} />
      <Stack.Screen name="family-profile" options={{ statusBarStyle: "dark" }} />
      <Stack.Screen name="add-family-member" options={{ statusBarStyle: "dark" }} />
    </Stack>
  );
}
