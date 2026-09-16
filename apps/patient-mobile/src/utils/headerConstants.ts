import { Animated } from "react-native";

export const EXPANDED_HEADER_HEIGHT = 165;
export const COLLAPSED_HEADER_HEIGHT = 88;
export const SEARCH_HEIGHT = 48;
export const SEARCH_OVERLAP = 22;
export const COLLAPSE_DISTANCE = 64;
export const CONTENT_TOP =
  EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP + SEARCH_HEIGHT + 18;

export type HeaderAnimationOptions = {
  expandedHeight?: number;
  searchOverlap?: number;
  collapsedHeight?: number;
  collapseDistance?: number;
  searchEndTop?: number;
};

export function getHeaderAnimationStyles(
  scrollY: Animated.Value,
  topInset: number,
  options?: HeaderAnimationOptions
) {
  const expandedHeight = options?.expandedHeight ?? EXPANDED_HEADER_HEIGHT;
  const searchOverlap = options?.searchOverlap ?? SEARCH_OVERLAP;
  const collapsedHeaderH = options?.collapsedHeight ?? COLLAPSED_HEADER_HEIGHT;
  const collapseDist = options?.collapseDistance ?? COLLAPSE_DISTANCE;

  const collapsedHeight = topInset + collapsedHeaderH;
  const searchStartTop = expandedHeight - searchOverlap;
  const searchEndTop = options?.searchEndTop ?? (topInset + 20);

  const expandedHeaderStyle = {
    opacity: scrollY.interpolate({
      inputRange: [0, collapseDist * 0.72],
      outputRange: [1, 0],
      extrapolate: "clamp" as const,
    }),
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, collapseDist],
          outputRange: [0, -20],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  const searchStyle = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, collapseDist],
          outputRange: [0, searchEndTop - searchStartTop],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  return {
    collapsedHeight,
    searchStartTop,
    searchEndTop,
    expandedHeaderStyle,
    searchStyle,
  };
}
