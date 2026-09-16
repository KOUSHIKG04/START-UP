import { useRef } from "react";
import { Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  COLLAPSED_HEADER_HEIGHT,
  COLLAPSE_DISTANCE,
  EXPANDED_HEADER_HEIGHT,
  SEARCH_OVERLAP,
} from "../data/homeLayout";

export function useCollapsingHeader() {
  const { top: topInset } = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const collapsedHeight = topInset + COLLAPSED_HEADER_HEIGHT;
  const searchStartTop = EXPANDED_HEADER_HEIGHT - SEARCH_OVERLAP;
  const searchEndTop = topInset + 20;

  const expandedHeaderStyle = {
    opacity: scrollY.interpolate({
      inputRange: [0, COLLAPSE_DISTANCE * 0.72],
      outputRange: [1, 0],
      extrapolate: "clamp" as const,
    }),
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, COLLAPSE_DISTANCE],
          outputRange: [0, -24],
          extrapolate: "clamp",
        }),
      },
    ],
  };
  const searchStyle = {
    transform: [
      {
        translateY: scrollY.interpolate({
          inputRange: [0, COLLAPSE_DISTANCE],
          outputRange: [0, searchEndTop - searchStartTop],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  return {
    collapsedHeight,
    expandedHeaderStyle,
    searchStyle,
    onScroll: Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false }
    ),
  };
}
