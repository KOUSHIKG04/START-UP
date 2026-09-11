import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  type ViewStyle,
} from "react-native";
import { colors } from "@startup/design-tokens";

export type SOSButtonProps = {
  onLongPress?: () => void;
  onPress?: () => void;
  size?: number;
  isFullRed?: boolean;
  className?: string;
  style?: ViewStyle;
};

export function SOSButton({
  onLongPress,
  onPress,
  size = 64,
  isFullRed: controlledFullRed,
  style,
}: SOSButtonProps) {
  const [internalFullRed, setInternalFullRed] = useState(false);
  const isRed = controlledFullRed ?? internalFullRed;

  const radius = size / 2;
  const innerRingSize = size - 8;
  const innerRingRadius = innerRingSize / 2;

  const handleLongPress = () => {
    setInternalFullRed(true);
    onLongPress?.();
  };

  const handlePress = () => {
    onPress?.();
  };

  return (
    <Pressable
      onLongPress={handleLongPress}
      onPress={handlePress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.buttonBase,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        isRed ? styles.buttonFullRed : styles.buttonLightRed,
        pressed && styles.buttonPressed,
        style,
      ]}
    >
      {/* Concentric Inner Ring Accent */}
      <View
        style={[
          styles.innerRing,
          {
            width: innerRingSize,
            height: innerRingSize,
            borderRadius: innerRingRadius,
            borderColor: isRed
              ? "rgba(255, 255, 255, 0.45)"
              : "rgba(239, 59, 67, 0.25)",
          },
        ]}
      />

      {/* Center SOS Typography */}
      <Text style={isRed ? styles.textWhite : styles.textRed}>SOS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 50,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },

  /* Light Red Idle State */
  buttonLightRed: {
    backgroundColor: "#FFEAEB", // Soft pastel light red disc
    borderWidth: 2,
    borderColor: "#FFA4AC", // Crisp light red outer ring
  },

  /* Full Red Active State */
  buttonFullRed: {
    backgroundColor: colors.patient.sos.primary, // Solid full red (#EF3B43)
    borderWidth: 2,
    borderColor: "#D62D35",
  },

  /* Concentric inner ring */
  innerRing: {
    position: "absolute",
    borderWidth: 1.2,
  },

  /* Main SOS Typography */
  textRed: {
    color: colors.patient.sos.primary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    lineHeight: 15,
    textAlign: "center",
  },
  textWhite: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    lineHeight: 15,
    textAlign: "center",
  },
});
