import { useRef, type Ref } from "react";
import {
  Animated,
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

export const DEFAULT_FADED_EDGE_COLOR = colors.ui.fade;

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
  const viewportWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const leftOpacityRef = useRef<Animated.Value | null>(null);
  if (leftOpacityRef.current === null) leftOpacityRef.current = new Animated.Value(0);
  const leftOpacity = leftOpacityRef.current;

  const rightOpacityRef = useRef<Animated.Value | null>(null);
  if (rightOpacityRef.current === null) rightOpacityRef.current = new Animated.Value(0);
  const rightOpacity = rightOpacityRef.current;

  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const topOpacityRef = useRef<Animated.Value | null>(null);
  if (topOpacityRef.current === null) topOpacityRef.current = new Animated.Value(0);
  const topOpacity = topOpacityRef.current;

  const bottomOpacityRef = useRef<Animated.Value | null>(null);
  if (bottomOpacityRef.current === null) bottomOpacityRef.current = new Animated.Value(0);
  const bottomOpacity = bottomOpacityRef.current;

  const transparentEdge = toTransparent(edgeColor);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (horizontal) {
      viewportWidthRef.current = width;
      rightOpacity.setValue(contentWidthRef.current > width + 2 ? 1 : 0);
    } else {
      viewportHeightRef.current = height;
      bottomOpacity.setValue(contentHeightRef.current > height + 2 ? 1 : 0);
    }
    onLayout?.(event);
  };

  const handleContentSizeChange = (width: number, height: number) => {
    if (horizontal) {
      contentWidthRef.current = width;
      rightOpacity.setValue(width > viewportWidthRef.current + 2 ? 1 : 0);
    } else {
      contentHeightRef.current = height;
      bottomOpacity.setValue(height > viewportHeightRef.current + 2 ? 1 : 0);
    }
    onContentSizeChange?.(width, height);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { x, y } = event.nativeEvent.contentOffset;
    if (horizontal) {
      const scrollableDistance = Math.max(contentWidthRef.current - viewportWidthRef.current, 0);
      leftOpacity.setValue(x > 2 ? 1 : 0);
      rightOpacity.setValue(scrollableDistance - x > 2 ? 1 : 0);
    } else {
      const scrollableDistance = Math.max(contentHeightRef.current - viewportHeightRef.current, 0);
      topOpacity.setValue(y > 2 ? 1 : 0);
      bottomOpacity.setValue(scrollableDistance - y > 2 ? 1 : 0);
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
        style={[
          horizontal ? styles.horizontalScrollView : styles.scrollView,
          style,
        ]}
      />
      {horizontal ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.leftEdge, { width: edgeSize, opacity: leftOpacity }]}
          >
            <LinearGradient
              colors={[edgeColor, transparentEdge]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.rightEdge, { width: edgeSize, opacity: rightOpacity }]}
          >
            <LinearGradient
              colors={[transparentEdge, edgeColor]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </>
      ) : (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.topEdge, { height: edgeSize, top: topEdgeOffset, opacity: topOpacity }]}
          >
            <LinearGradient
              colors={[edgeColor, transparentEdge]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.bottomEdge, { height: edgeSize, opacity: bottomOpacity }]}
          >
            <LinearGradient
              colors={[transparentEdge, edgeColor]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
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
