import type { ViewStyle } from "react-native";
import { colors } from "@startup/design-tokens";

export const BOTTOM_NAV_BAR_HEIGHT = 72;
export const BOTTOM_NAV_BAR_DEFAULT_WIDTH = 360;
export const BOTTOM_NAV_BAR_WIDTH_TOLERANCE = 1;
export const BOTTOM_NAV_BAR_MIN_BOTTOM_PADDING = 4;
export const BOTTOM_NAV_BAR_SOS_SIZE = 64;

export const BOTTOM_NAV_BAR_SHADOW = {
  shadowColor: colors.navigation.shadow,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 8,
} satisfies ViewStyle;

export function splitBottomNavItems<T>(items: readonly T[]) {
  const midpoint = Math.ceil(items.length / 2);

  return {
    leftItems: items.slice(0, midpoint),
    rightItems: items.slice(midpoint),
  };
}
