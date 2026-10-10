import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { CircleCheck, CircleAlert, Info } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontFamilies } from "@startup/design-tokens";
import { useMobileTheme } from "../theme/MobileThemeProvider";

export type ToastType = "success" | "error" | "info";
export type ToastInput = { title: string; message?: string; type?: ToastType };

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
  dismissToast: () => void;
};
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastInput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useMobileTheme();

  const { width } = useWindowDimensions();
  const translation = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const generation = useRef(0);
  const reducedMotion = useRef(false);
  const toastHeight = useRef(80);
  const expiresAt = useRef(0);
  const remaining = useRef(10000);
  const dismiss = useCallback(
    (direction: -1 | 0 | 1 = 0) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const current = generation.current;
      Animated.parallel([
        Animated.timing(translation, {
          toValue: direction
            ? { x: direction * width, y: 0 }
            : { x: 0, y: -(insets.top + toastHeight.current + 24) },
          duration: reducedMotion.current ? 0 : 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: reducedMotion.current ? 0 : 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && generation.current === current) setToast(null);
      });
    },
    [insets.top, opacity, translation, width]
  );
  const dismissToast = useCallback(() => dismiss(), [dismiss]);
  const showToast = useCallback(
    (input: ToastInput) => {
      generation.current += 1;
      if (timer.current) clearTimeout(timer.current);
      translation.stopAnimation();
      opacity.stopAnimation();
      translation.setValue({ x: 0, y: 0 });
      opacity.setValue(1);
      setToast(input);
      remaining.current = input.type === "error" ? 15000 : 10000;
      expiresAt.current = Date.now() + remaining.current;
      timer.current = setTimeout(() => dismiss(), remaining.current);
    },
    [dismiss, opacity, translation]
  );
  const restoreAfterSwipe = useCallback(() => {
    Animated.spring(translation, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
    expiresAt.current = Date.now() + remaining.current;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(), remaining.current);
  }, [dismiss, translation]);
  const gesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, state) =>
          Math.abs(state.dx) > 8 && Math.abs(state.dx) > Math.abs(state.dy),
        onPanResponderGrant: () => {
          remaining.current = Math.max(0, expiresAt.current - Date.now());
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          translation.stopAnimation();
        },
        onPanResponderMove: (_, state) =>
          translation.setValue({ x: state.dx, y: 0 }),
        onPanResponderRelease: (_, state) => {
          if (Math.abs(state.dx) > 60 || Math.abs(state.vx) > 0.5)
            dismiss((state.dx || state.vx) < 0 ? -1 : 1);
          else restoreAfterSwipe();
        },
        onPanResponderTerminate: restoreAfterSwipe,
      }),
    [dismiss, restoreAfterSwipe, translation]
  );
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) reducedMotion.current = value;
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        reducedMotion.current = value;
      }
    );
    return () => {
      active = false;
      generation.current += 1;
      if (timer.current) clearTimeout(timer.current);
      translation.stopAnimation();
      opacity.stopAnimation();
      subscription.remove();
    };
  }, [opacity, translation]);
  const Icon =
    toast?.type === "error"
      ? CircleAlert
      : toast?.type === "info"
        ? Info
        : CircleCheck;

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { top: insets.top + 12 }]}
        >
          <Animated.View
            {...gesture.panHandlers}
            onLayout={(event) => {
              toastHeight.current = event.nativeEvent.layout.height;
            }}
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`${toast.title}${toast.message ? `. ${toast.message}` : ""}`}
            accessibilityLiveRegion="polite"
            accessibilityActions={[
              { name: "dismiss", label: "Dismiss message" },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "dismiss") dismissToast();
            }}
            style={[
              styles.toast,
              { opacity, transform: translation.getTranslateTransform() },
              {
                backgroundColor: theme.surface,
                borderColor:
                  toast.type === "error" ? theme.danger : theme.primary,
              },
            ]}
          >
            <Icon
              size={22}
              color={toast.type === "error" ? theme.danger : theme.primary}
            />
            <View style={styles.copy}>
              <Text style={[styles.title, { color: theme.text }]}>
                {toast.title}
              </Text>
              {toast.message ? (
                <Text style={[styles.message, { color: theme.textMuted }]}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

/** Presents existing action feedback as a toast without changing the form layout. */
export function useToastFeedback({
  error,
  success,
  info,
}: {
  error?: string;
  success?: string;
  info?: string;
}) {
  const { showToast } = useToast();
  const previous = useRef({ error: "", success: "", info: "" });
  useEffect(() => {
    if (success && success !== previous.current.success)
      showToast({ title: success, type: "success" });
    previous.current.success = success ?? "";
  }, [showToast, success]);
  useEffect(() => {
    if (info && info !== previous.current.info)
      showToast({ title: info, type: "info" });
    previous.current.info = info ?? "";
  }, [info, showToast]);
  useEffect(() => {
    if (error && error !== previous.current.error)
      showToast({ title: "Action failed", message: error, type: "error" });
    previous.current.error = error ?? "";
  }, [error, showToast]);
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 12,
  },
  toast: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: colors.ui.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: fontFamilies.semibold, fontSize: 15, lineHeight: 21 },
  message: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 20 },
});
