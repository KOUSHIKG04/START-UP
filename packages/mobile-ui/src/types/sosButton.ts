import type { ViewStyle } from "react-native";

export type SOSButtonProps = {
  onLongPress?: () => void;
  onPress?: () => void;
  size?: number;
  isFullRed?: boolean;
  className?: string;
  style?: ViewStyle;
};
