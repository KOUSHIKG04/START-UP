import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

  const dismissToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);
  const showToast = useCallback((input: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(input);
    timer.current = setTimeout(
      () => {
        setToast(null);
        timer.current = null;
      },
      input.type === "error" ? 15000 : 10000
    );
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.overlay, { top: insets.top + 12 }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${toast.title}${toast.message ? `. ${toast.message}` : ""}. Dismiss message`}
            accessibilityLiveRegion="polite"
            onPress={dismissToast}
            style={[
              styles.toast,
              {
                backgroundColor: theme.surface,
                borderColor:
                  toast.type === "error" ? theme.danger : theme.primary,
              },
            ]}
          >
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
            <Text style={[styles.dismiss, { color: theme.primaryText }]}>
              Dismiss
            </Text>
          </Pressable>
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
  dismiss: { fontFamily: fontFamilies.semibold, fontSize: 13 },
});
