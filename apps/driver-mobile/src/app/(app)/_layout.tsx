import { Stack } from "expo-router";

export const unstable_settings = { initialRouteName: "index" };

export default function GroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="select-location" options={{ animation: "slide_from_right", statusBarStyle: "light" }} />
    </Stack>
  );
}
