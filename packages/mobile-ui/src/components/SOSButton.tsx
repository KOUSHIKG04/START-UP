import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  type ViewStyle,
} from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { getSOSButtonDimensions } from "../utils/sosButtonDimensions";

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

  const { radius, innerRingSize, innerRingRadius } = getSOSButtonDimensions(size);

  const handleLongPress = () => {
    setInternalFullRed(true);
    onLongPress?.();
  };

  const handlePress = () => {
    onPress?.();
  };

  return (
    <Pressable
      accessibilityHint="Press and hold to activate emergency SOS"
      accessibilityLabel="Emergency SOS"
      accessibilityRole="button"
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

  buttonLightRed: {
    backgroundColor: "#FFEAEB",
    borderWidth: 2,
    borderColor: "#FFA4AC",
  },

  buttonFullRed: {
    backgroundColor: colors.patient.sos.primary,
    borderWidth: 2,
    borderColor: "#D62D35",
  },

  innerRing: {
    position: "absolute",
    borderWidth: 1.2,
  },

  textRed: {
    color: colors.patient.sos.primary,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    lineHeight: 15,
    textAlign: "center",
  },
  textWhite: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    lineHeight: 15,
    textAlign: "center",
  },
});
