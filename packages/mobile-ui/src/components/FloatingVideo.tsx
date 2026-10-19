import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Animated, PanResponder, StyleSheet } from "react-native";
import { clampCallPreview } from "../utils/callPreview";
export function FloatingVideo({
  children,
  width,
  height,
  frame,
}: {
  children: ReactNode;
  width: number;
  height: number;
  frame: { width: number; height: number };
}) {
  const position = useRef(new Animated.ValueXY({ x: 8, y: 8 })).current;
  const current = useRef({ x: 8, y: 8 });
  const origin = useRef(current.current);
  const initialized = useRef(false);
  const bounds = useRef({
    ...frame,
    previewWidth: width,
    previewHeight: height,
  });
  useEffect(() => {
    bounds.current = { ...frame, previewWidth: width, previewHeight: height };
    if (!frame.width || !frame.height) return;
    const next = initialized.current
      ? current.current
      : { x: frame.width - width - 16, y: 16 };
    current.current = clampCallPreview(
      next.x,
      next.y,
      frame.width,
      frame.height,
      width,
      height
    );
    position.setValue(current.current);
    initialized.current = true;
  }, [frame.width, frame.height, width, height, position]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > 8,
        onPanResponderGrant: () => {
          origin.current = current.current;
        },
        onPanResponderMove: (_, gesture) => {
          const b = bounds.current;
          current.current = clampCallPreview(
            origin.current.x + gesture.dx,
            origin.current.y + gesture.dy,
            b.width,
            b.height,
            b.previewWidth,
            b.previewHeight
          );
          position.setValue(current.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [position]
  );
  return (
    <Animated.View
      {...pan.panHandlers}
      accessibilityLabel="Video preview. Drag to reposition"
      style={[
        styles.floating,
        { width, height, transform: position.getTranslateTransform() },
      ]}
    >
      {children}
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  floating: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#173B4A",
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
});
