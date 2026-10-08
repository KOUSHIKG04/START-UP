import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@startup/design-tokens";

export default function AuthLayout() {
  return (
    <><StatusBar style="dark" /><Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 350,
        contentStyle: { backgroundColor: colors.patient.background },
      }}
    /></>
  );
}
