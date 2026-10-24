import type { DarkButtonProps } from "../types/sos";
import { s } from "./SosEmergency.styles";

import { AppText as Text } from "@startup/mobile-ui";

import { Pressable } from "react-native";

export function DarkButton({ label, icon, onPress, compact }: DarkButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.darkButton,
        compact && s.darkButtonCompact,
        pressed && s.pressed,
      ]}
    >
      {icon}
      <Text variant="button" style={s.darkButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}
