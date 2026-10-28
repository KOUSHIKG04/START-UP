import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function GroupLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          statusBarStyle: "dark",
          animation: "none",
          contentStyle: { backgroundColor: "#FFFFFF" },
        }}
      />
    </>
  );
}
