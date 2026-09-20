import { Stack } from "expo-router";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function GroupLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: "#FFFFFF" } }} />;
}
