import { Stack } from "expo-router";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function GroupLayout() {
  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 200,
        freezeOnBlur: true,
        statusBarStyle: "light",
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="select-location"
        options={{ animation: "slide_from_right", statusBarStyle: "light" }}
      />
    </Stack>
  );
}
