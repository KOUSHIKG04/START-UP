import { useState, type Ref } from "react";
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
  topEdgeOffset?: number;
  ref?: Ref<ScrollView>;
};

export const DEFAULT_FADED_EDGE_COLOR = "#E6F7F6";

export function FadedScrollView({
  containerStyle,
  edgeColor = DEFAULT_FADED_EDGE_COLOR,
  edgeSize = 28,
  topEdgeOffset = 0,
  horizontal = false,
  onContentSizeChange,
  onLayout,
  onScroll,
  scrollEventThrottle = 16,
  style,
  ref,
  ...props
}: FadedScrollViewProps) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [showLeftEdge, setShowLeftEdge] = useState(false);
  const [showRightEdge, setShowRightEdge] = useState(false);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [showTopEdge, setShowTopEdge] = useState(false);
  const [showBottomEdge, setShowBottomEdge] = useState(false);

  const transparentEdge = toTransparent(edgeColor);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (horizontal) {
      setViewportWidth(width);
      setShowRightEdge(contentWidth > width + 2);
    } else {
      setViewportHeight(height);
      setShowBottomEdge(contentHeight > height + 2);
    }
    onLayout?.(event);
  };

  const handleContentSizeChange = (width: number, height: number) => {
    if (horizontal) {
      setContentWidth(width);
      setShowRightEdge(width > viewportWidth + 2);
    } else {
      setContentHeight(height);
      setShowBottomEdge(height > viewportHeight + 2);
    }
    onContentSizeChange?.(width, height);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { x, y } = event.nativeEvent.contentOffset;
    if (horizontal) {
      const scrollableDistance = Math.max(contentWidth - viewportWidth, 0);
      setShowLeftEdge(x > 2);
      setShowRightEdge(scrollableDistance - x > 2);
    } else {
      const scrollableDistance = Math.max(contentHeight - viewportHeight, 0);
      setShowTopEdge(y > 2);
      setShowBottomEdge(scrollableDistance - y > 2);
    }
    onScroll?.(event);
  };

  return (
    <View
      style={[
        horizontal ? styles.horizontalContainer : styles.container,
        containerStyle,
      ]}
    >
      <ScrollView
        ref={ref}
        horizontal={horizontal}
        {...props}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle}
        style={[horizontal ? styles.horizontalScrollView : styles.scrollView, style]}
      />
      {horizontal ? (
        <>
          {showLeftEdge ? (
            <LinearGradient
              colors={[edgeColor, transparentEdge]}
              end={{ x: 1, y: 0 }}
              pointerEvents="none"
              start={{ x: 0, y: 0 }}
              style={[styles.leftEdge, { width: edgeSize }]}
            />
          ) : null}
          {showRightEdge ? (
            <LinearGradient
              colors={[transparentEdge, edgeColor]}
              end={{ x: 1, y: 0 }}
              pointerEvents="none"
              start={{ x: 0, y: 0 }}
              style={[styles.rightEdge, { width: edgeSize }]}
            />
          ) : null}
        </>
      ) : (
        <>
          {showTopEdge ? (
            <LinearGradient
              colors={[edgeColor, transparentEdge]}
              pointerEvents="none"
              style={[
                styles.topEdge,
                { height: edgeSize, top: topEdgeOffset },
              ]}
            />
          ) : null}
          {showBottomEdge ? (
            <LinearGradient
              colors={[transparentEdge, edgeColor]}
              pointerEvents="none"
              style={[styles.bottomEdge, { height: edgeSize }]}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function toTransparent(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : "transparent";
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  horizontalContainer: { position: "relative", width: "100%" },
  scrollView: { flex: 1 },
  horizontalScrollView: { width: "100%" },
  topEdge: { position: "absolute", left: 0, right: 0, zIndex: 2 },
  bottomEdge: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2 },
  leftEdge: { position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2 },
  rightEdge: { position: "absolute", right: 0, top: 0, bottom: 0, zIndex: 2 },
});
