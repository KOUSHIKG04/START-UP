import { Stack } from "expo-router";
import { colors } from "@startup/design-tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: 350,
        contentStyle: { backgroundColor: colors.patient.background },
      }}
    />
  );
}
