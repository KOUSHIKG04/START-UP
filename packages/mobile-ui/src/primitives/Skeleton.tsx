import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import type { AppTheme } from "../utils/appTheme";

export function Skeleton({
  theme,
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: {
  theme?: AppTheme;
  width?: ViewStyle["width"];
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useMobileTheme(theme);
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
        ]),
      );
      animation.start();
    }).catch(() => {});
    return () => { active = false; animation?.stop(); };
  }, [opacity]);

  return <Animated.View accessible={false} style={[styles.base, { width, height, borderRadius: radius, backgroundColor: palette.soft, opacity }, style]} />;
}

const styles = StyleSheet.create({ base: { flexShrink: 0 } });
