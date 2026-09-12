import React, { useState } from "react";
import { View, Text, Pressable, type ViewStyle } from "react-native";
import { cn } from "cn";
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
  className,
  style,
}: SOSButtonProps) {
  const [internalFullRed, setInternalFullRed] = useState(false);
  const isRed = controlledFullRed ?? internalFullRed;

  const { radius, innerRingSize, innerRingRadius } =
    getSOSButtonDimensions(size);

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
      className={cn(
        "relative z-50 items-center justify-center border-2 active:scale-[0.96] active:opacity-[0.92]",
        isRed
          ? "border-sos-border-dark bg-sos-primary"
          : "border-sos-border bg-sos-light",
        className
      )}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <View
        className={cn(
          "absolute border-[1.2px]",
          isRed ? "border-sos-ring-on-primary" : "border-sos-ring"
        )}
        style={[
          {
            width: innerRingSize,
            height: innerRingSize,
            borderRadius: innerRingRadius,
          },
        ]}
      />

      <Text
        className={cn(
          "text-center text-sm leading-[15px] font-black tracking-[0.8px]",
          isRed ? "text-on-primary" : "text-sos-primary"
        )}
      >
        SOS
      </Text>
    </Pressable>
  );
}
