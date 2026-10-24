import type { HotlineProps } from "../types/sos";
import { s } from "./SosEmergency.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { Pressable } from "react-native";

export function Hotline({ label, onPress }: HotlineProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.hotline, pressed && s.pressed]}
    >
      <Text variant="body" style={s.hotlineText}>
        {label}
      </Text>
    </Pressable>
  );
}
