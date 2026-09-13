import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@startup/design-tokens";

export type FadedScrollViewProps = ScrollViewProps & {
  containerStyle?: StyleProp<ViewStyle>;
  edgeColor?: string;
  edgeSize?: number;
};

export function FadedScrollView({
  containerStyle,
  edgeColor = colors.background,
  edgeSize = 28,
  onContentSizeChange,
  onLayout,
  onScroll,
  scrollEventThrottle = 16,
  style,
  ...props
}: FadedScrollViewProps) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [showTopEdge, setShowTopEdge] = useState(false);
  const [showBottomEdge, setShowBottomEdge] = useState(false);
  const transparentEdge = toTransparent(edgeColor);

  const updateEdges = (offsetY: number) => {
    const scrollableDistance = Math.max(contentHeight - viewportHeight, 0);
    setShowTopEdge(offsetY > 2);
    setShowBottomEdge(scrollableDistance - offsetY > 2);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setViewportHeight(height);
    setShowBottomEdge(contentHeight > height + 2);
    onLayout?.(event);
  };

  const handleContentSizeChange = (width: number, height: number) => {
    setContentHeight(height);
    setShowBottomEdge(height > viewportHeight + 2);
    onContentSizeChange?.(width, height);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateEdges(event.nativeEvent.contentOffset.y);
    onScroll?.(event);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <ScrollView
        {...props}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
        style={[styles.scrollView, style]}
      />
      {showTopEdge ? (
        <LinearGradient
          colors={[edgeColor, transparentEdge]}
          pointerEvents="none"
          style={[styles.topEdge, { height: edgeSize }]}
        />
      ) : null}
      {showBottomEdge ? (
        <LinearGradient
          colors={[transparentEdge, edgeColor]}
          pointerEvents="none"
          style={[styles.bottomEdge, { height: edgeSize }]}
        />
      ) : null}
    </View>
  );
}

function toTransparent(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : "transparent";
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  scrollView: { flex: 1 },
  topEdge: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 },
  bottomEdge: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2 },
});
