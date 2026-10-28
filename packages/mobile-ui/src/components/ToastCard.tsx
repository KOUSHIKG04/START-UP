import { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
} from "lucide-react-native";
import { colors, fontFamilies, toastTokens } from "@startup/design-tokens";
import { AppText as Text } from "../primitives/AppText";
import { useSoundEffects } from "../primitives/Sound";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { toastCopy } from "../utils/toast";
import type { Note, StackSlot } from "../types/toast";

type ToastCardProps = {
  note: Note;
  layer: number;
  slot: StackSlot;
  behind: boolean;
  bottom: boolean;
  exiting: boolean;
  reducedMotion: boolean;
  colorScheme: "light" | "dark";
  capHeight?: number;
  style?: StyleProp<ViewStyle>;
  onHeight: (id: string, height: number) => void;
  onExit: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction: (note: Note) => void;
  onInteraction: (reason: string, active: boolean) => void;
  onExpand: () => void;
};

export function ToastCard({
  note,
  layer,
  slot,
  behind,
  bottom,
  exiting,
  reducedMotion,
  colorScheme,
  capHeight,
  style,
  onHeight,
  onExit,
  onDismiss,
  onAction,
  onInteraction,
  onExpand,
}: ToastCardProps) {
  const theme = useMobileTheme();
  const palette = toastTokens[colorScheme];
  const { width } = useWindowDimensions();
  const feedback = useSoundEffects();
  const latest = useRef({ onDismiss, onInteraction, onExit });
  latest.current = { onDismiss, onInteraction, onExit };
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const y = useRef(
    new Animated.Value((slot.y - 8) * (bottom ? -1 : 1))
  ).current;
  const scale = useRef(new Animated.Value(slot.scale * 0.98)).current;
  const drag = useRef(new Animated.ValueXY()).current;
  const copy = toastCopy(note);
  const state = note.state ?? note.type;
  const ink =
    state === "error"
      ? palette.error
      : state === "warning"
        ? palette.warning
        : colorScheme === "dark"
          ? toastTokens.dark.accent
          : theme.primaryText;
  const soft =
    state === "error"
      ? palette.errorSoft
      : state === "warning"
        ? palette.warningSoft
        : colorScheme === "dark"
          ? palette.track
          : theme.soft;
  const Icon =
    state === "error"
      ? CircleAlert
      : state === "warning"
        ? TriangleAlert
        : state === "success"
          ? CircleCheck
          : Info;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: exiting ? 0 : slot.opacity,
        duration: reducedMotion
          ? 0
          : exiting
            ? 180
            : toastTokens.motionDuration,
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: (slot.y - (exiting ? 8 : 0)) * (bottom ? -1 : 1),
        duration: reducedMotion ? 0 : toastTokens.motionDuration,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: slot.scale * (exiting ? 0.96 : 1),
        duration: reducedMotion ? 0 : toastTokens.motionDuration,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished && exiting) latest.current.onExit(note.id);
    });
    return () => animation.stop();
  }, [
    exiting,
    bottom,
    note.id,
    opacity,
    reducedMotion,
    scale,
    slot.opacity,
    slot.scale,
    slot.y,
    y,
  ]);

  useEffect(
    () => () => {
      latest.current.onInteraction(`gesture:${note.id}`, false);
      latest.current.onInteraction(`touch:${note.id}`, false);
      latest.current.onInteraction(`focus:${note.id}`, false);
      drag.stopAnimation();
    },
    [drag, note.id]
  );

  const gesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, value) =>
          !behind &&
          !exiting &&
          Math.abs(value.dx) > 8 &&
          Math.abs(value.dx) > Math.abs(value.dy),
        onPanResponderGrant: () => {
          latest.current.onInteraction(`gesture:${note.id}`, true);
          drag.stopAnimation();
        },
        onPanResponderMove: (_, value) =>
          drag.setValue({ x: value.dx, y: value.dy }),
        onPanResponderRelease: (_, value) => {
          if (
            Math.hypot(value.dx, value.dy) > 44 ||
            Math.hypot(value.vx, value.vy) > 0.38
          )
            latest.current.onDismiss(note.id);
          Animated.spring(drag, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
          latest.current.onInteraction(`gesture:${note.id}`, false);
          latest.current.onInteraction(`touch:${note.id}`, false);
        },
        onPanResponderTerminate: () => {
          Animated.spring(drag, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
          latest.current.onInteraction(`gesture:${note.id}`, false);
          latest.current.onInteraction(`touch:${note.id}`, false);
        },
      }),
    [behind, drag, exiting, note.id]
  );

  return (
    <Animated.View
      {...gesture.panHandlers}
      pointerEvents={behind || exiting ? "none" : "auto"}
      accessibilityElementsHidden={behind || exiting}
      importantForAccessibility={
        behind || exiting ? "no-hide-descendants" : "auto"
      }
      style={[
        styles.slot,
        styles.shadow,
        bottom ? { bottom: 0 } : { top: 0 },
        {
          backgroundColor: palette.background,
          zIndex: exiting ? 0 : layer,
          opacity,
          transform: [{ translateY: y }, { scale }],
        },
      ]}
    >
      <Animated.View
        style={{
          transform: drag.getTranslateTransform(),
          width: "100%",
          maxHeight: capHeight,
          overflow: "hidden",
          borderRadius: toastTokens.radius,
        }}
      >
        <View
          testID={`toast-${note.id}`}
          onLayout={(event) =>
            onHeight(note.id, event.nativeEvent.layout.height)
          }
          onTouchStart={() => onInteraction(`touch:${note.id}`, true)}
          onTouchEnd={() => onInteraction(`touch:${note.id}`, false)}
          onTouchCancel={() => onInteraction(`touch:${note.id}`, false)}
          accessibilityLiveRegion="none"
          accessibilityActions={[
            { name: "dismiss", label: "Dismiss notification" },
            { name: "expand", label: "Show all notifications" },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "dismiss") onDismiss(note.id);
            else onExpand();
          }}
          style={[
            styles.card,
            {
              backgroundColor: palette.background,
              maxWidth: Math.min(toastTokens.maxWidth, width - 32),
            },
            style,
          ]}
        >
          <View style={[styles.content, behind && { opacity: 0 }]}>
            <View style={styles.row}>
              {state ? (
                <View
                  style={[styles.glyph, { backgroundColor: soft }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {state === "pending" ? (
                    <ActivityIndicator size="small" color={ink} />
                  ) : (
                    <Icon size={18} color={ink} strokeWidth={2} />
                  )}
                </View>
              ) : null}
              <View style={styles.copy}>
                <Text
                  variant="inherit"
                  style={[styles.title, { color: palette.text }]}
                >
                  {copy.title}
                </Text>
                {copy.description ? (
                  <Text
                    variant="inherit"
                    style={[styles.description, { color: palette.muted }]}
                  >
                    {copy.description}
                  </Text>
                ) : null}
              </View>
              <Pressable
                testID="toast-close"
                accessibilityRole="button"
                accessibilityLabel={`Dismiss ${copy.title}`}
                onFocus={() => onInteraction(`focus:${note.id}`, true)}
                onBlur={() => onInteraction(`focus:${note.id}`, false)}
                onPress={() => {
                  feedback();
                  onDismiss(note.id);
                }}
                style={({ pressed }) => [
                  styles.close,
                  { backgroundColor: pressed ? soft : "transparent" },
                ]}
              >
                <X size={16} color={palette.muted} />
              </Pressable>
            </View>
            {note.action ? (
              <Pressable
                testID="toast-action"
                accessibilityRole="button"
                accessibilityLabel={note.action.label}
                onFocus={() => onInteraction(`focus:${note.id}`, true)}
                onBlur={() => onInteraction(`focus:${note.id}`, false)}
                onPress={() => {
                  feedback();
                  onAction(note);
                }}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: soft, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text
                  variant="inherit"
                  style={[styles.actionLabel, { color: ink }]}
                >
                  {note.action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { position: "absolute", width: "100%" },
  shadow: {
    borderRadius: toastTokens.radius,
    shadowColor: colors.ui.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    minHeight: toastTokens.minHeight,
    width: "100%",
    borderRadius: toastTokens.radius,
    overflow: "hidden",
  },
  content: { paddingStart: 12, paddingEnd: 8, paddingBottom: 8 },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  copy: { flex: 1, gap: 3, paddingTop: 8, paddingBottom: 4 },
  glyph: {
    marginTop: 7,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "auto",
  },
  close: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    paddingEnd: 10,
    paddingBottom: 4,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "auto",
  },
  action: {
    minHeight: 44,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    marginTop: 6,
    marginEnd: 4,
    marginBottom: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    lineHeight: 19,
  },
});
