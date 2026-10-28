import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  AppState,
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontFamilies, toastTokens } from "@startup/design-tokens";
import { AppText as Text } from "./AppText";
import { SoundEffects, useSoundEffects } from "./Sound";
import { ToastCard } from "../components/ToastCard";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import {
  createToastStore,
  dismissToast,
  fanSlot,
  LINE_HEIGHT,
  pileSlot,
  subscribeToasts,
  toast,
  toastCopy,
} from "../utils/toast";
import type { Note, ToastInput, ToastsProps } from "../types/toast";

export type {
  ToastType,
  ToastInput,
  ToastState,
  ToastSide,
  ToastAlign,
  ToastPosition,
  ToastAction,
  Note,
  ToastClock,
  StackSlot,
  StackCard,
  ToastsProps,
} from "../types/toast";

export {
  LINE_HEIGHT,
  toastPositions,
  toast,
  dismissToast,
  upsertToast,
  dismissDelay,
  tick,
  pileSlot,
  fanSlot,
} from "../utils/toast";

type ToastContextValue = {
  showToast: (input: ToastInput) => string;
  dismissToast: (id?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const showToast = (input: ToastInput) => toast(input);

const contextValue = { showToast, dismissToast };

/** Mounted once in each app's existing root; feedback remains native and themed. */
export function ToastProvider({
  children,
  haptics = true,
  ...props
}: ToastsProps & { children: ReactNode; haptics?: boolean }) {
  return (
    <ToastContext.Provider value={contextValue}>
      <SoundEffects enabled={haptics}>
        {children}
        <Toasts {...props} />
      </SoundEffects>
    </ToastContext.Provider>
  );
}

export function Toasts({
  position = "top-center",
  colorScheme = "light",
  style,
  cardStyle,
}: ToastsProps) {
  const [store] = useState(createToastStore);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  const [cards, setCards] = useState<{ note: Note; exiting: boolean }[]>([]);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const reasons = useRef(new Set<string>());
  const mounted = useRef(true);
  const scroll = useRef<ScrollView>(null);
  const theme = useMobileTheme();
  const palette = toastTokens[colorScheme];
  const feedback = useSoundEffects();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [side, align] = position.split("-");
  const bottom = side === "bottom";
  const cardWidth = Math.min(
    toastTokens.maxWidth,
    width - insets.left - insets.right - 32
  );
  const leftAligned =
    align === "left" ||
    (align === "start" && !I18nManager.isRTL) ||
    (align === "end" && I18nManager.isRTL);
  const rightAligned =
    align === "right" ||
    (align === "end" && !I18nManager.isRTL) ||
    (align === "start" && I18nManager.isRTL);
  const left = leftAligned
    ? insets.left + 16
    : rightAligned
      ? width - insets.right - 16 - cardWidth
      : (width - cardWidth) / 2;
  const pause = useCallback(
    (reason: string, active: boolean) => {
      if (!mounted.current) return;
      if (active) reasons.current.add(reason);
      else reasons.current.delete(reason);
      store.pause(reasons.current.size > 0);
    },
    [store]
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(
    () =>
      subscribeToasts((event) => {
        if (event.kind === "dismiss") {
          store.dismiss(event.id);
          return;
        }
        store.show(event.note);
        if (AppState.currentState === "active") {
          const copy = toastCopy(event.note);
          AccessibilityInfo.announceForAccessibility(
            [copy.title, copy.description].filter(Boolean).join(". ")
          );
        }
      }),
    [store]
  );

  useEffect(() => {
    pause("background", AppState.currentState !== "active");
    const subscription = AppState.addEventListener("change", (state) =>
      pause("background", state !== "active")
    );
    return () => subscription.remove();
  }, [pause]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReducedMotion(value);
      })
      .catch(() => {});
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (active) pause("screen-reader", value);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion
    );
    const reader = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (value) => pause("screen-reader", value)
    );
    return () => {
      active = false;
      motion.remove();
      reader.remove();
    };
  }, [pause]);

  useEffect(() => {
    if (snapshot.paused || !snapshot.notes.length) return;
    const delay = store.nextDelay();
    if (delay === undefined) return;
    const timer = setTimeout(store.advance, delay);
    return () => clearTimeout(timer);
  }, [snapshot, store]);

  useEffect(() => {
    setCards((current) => [
      ...snapshot.notes.map((note) => ({ note, exiting: false })),
      ...current
        .filter(
          (card) => !snapshot.notes.some((note) => note.id === card.note.id)
        )
        .map((card) => ({ ...card, exiting: true })),
    ]);
    if (!snapshot.notes.length) {
      setExpanded(false);
      pause("expanded", false);
    }
  }, [snapshot.notes, pause]);

  const onHeight = useCallback((id: string, measured: number) => {
    setHeights((current) =>
      current[id] === measured ? current : { ...current, [id]: measured }
    );
  }, []);
  const onExit = useCallback((id: string) => {
    setCards((current) =>
      current.filter((card) => card.note.id !== id || !card.exiting)
    );
    setHeights((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const toggle = () => {
    feedback();
    setExpanded(!expanded);
    pause("expanded", !expanded);
  };
  const sizes = cards.map(({ note }) => heights[note.id] ?? LINE_HEIGHT);
  const totalHeight = expanded
    ? sizes.reduce(
        (sum, value) => sum + value + toastTokens.gap,
        -toastTokens.gap
      )
    : (sizes[0] ?? LINE_HEIGHT) +
      Math.min(2, Math.max(0, cards.length - 1)) * toastTokens.peek;

  if (!cards.length) return null;
  return (
    <View
      pointerEvents="box-none"
      testID="toast-viewport"
      style={[
        styles.overlay,
        {
          left,
          width: cardWidth,
          ...(bottom
            ? { bottom: insets.bottom + 12 }
            : { top: insets.top + 12 }),
        },
        style,
      ]}
    >
      <ScrollView
        ref={scroll}
        scrollEnabled={
          expanded || totalHeight > height - insets.top - insets.bottom - 100
        }
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => pause("scroll", true)}
        onScrollEndDrag={() => pause("scroll", false)}
        onMomentumScrollEnd={() => pause("scroll", false)}
        onContentSizeChange={() => {
          if (bottom && expanded)
            scroll.current?.scrollToEnd({ animated: false });
        }}
        style={{
          height: Math.min(
            Math.max(LINE_HEIGHT, totalHeight),
            Math.max(LINE_HEIGHT, height - insets.top - insets.bottom - 100)
          ),
          overflow: "visible",
        }}
      >
        <View
          style={{ height: Math.max(LINE_HEIGHT, totalHeight) }}
          pointerEvents="box-none"
        >
          {cards.map(({ note, exiting }, index) => (
            <ToastCard
              key={note.id}
              note={note}
              exiting={exiting}
              layer={cards.length - index}
              slot={
                expanded
                  ? fanSlot(index, sizes)
                  : {
                      ...pileSlot(index),
                      y:
                        pileSlot(index).y +
                        (index > 0 ? Math.max(0, sizes[0] - sizes[index]) : 0),
                    }
              }
              behind={!expanded && index > 0}
              bottom={bottom}
              reducedMotion={reducedMotion}
              colorScheme={colorScheme}
              capHeight={!expanded && index > 0 ? sizes[0] : undefined}
              onHeight={onHeight}
              onExit={onExit}
              onDismiss={store.dismiss}
              onAction={store.act}
              onInteraction={pause}
              onExpand={toggle}
              style={cardStyle}
            />
          ))}
        </View>
      </ScrollView>
      {snapshot.notes.length > 1 ? (
        <Pressable
          testID="toast-expand"
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={toggle}
          style={({ pressed }) => [
            styles.expand,
            {
              backgroundColor: palette.background,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text
            variant="inherit"
            style={[
              styles.expandLabel,
              {
                color:
                  colorScheme === "dark" ? palette.text : theme.primaryText,
              },
            ]}
          >
            {expanded
              ? "Collapse notifications"
              : `Show all ${snapshot.notes.length} notifications`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

/** Presents existing action feedback without changing feature owners or drafts. */
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
  overlay: { position: "absolute", zIndex: 1000, elevation: 12 },
  expand: {
    minHeight: 44,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 6,
    borderRadius: 14,
  },
  expandLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 18,
  },
});
