import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@startup/design-tokens";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { ModalSurface } from "../primitives/ModalSurface";
import { AppText } from "../primitives/AppText";
import { Button } from "../primitives/Button";
import type { AppDialogProps } from "../types/appDialog";

export function AppDialog({
  visible,
  title,
  description,
  theme,
  busy = false,
  children,
  actions,
  confirmLabel = "Got it",
  onConfirm,
  cancelLabel = "Cancel",
  onClose,
}: AppDialogProps) {
  const palette = useMobileTheme(theme);
  const insets = useSafeAreaInsets();
  return (
    <ModalSurface
      visible={visible}
      layout="custom"
      transparent
      onClose={busy ? undefined : onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View
          style={[
            styles.center,
            {
              paddingTop: Math.max(20, insets.top),
              paddingBottom: Math.max(20, insets.bottom),
            },
          ]}
        >
          <View
            accessibilityViewIsModal
            style={[
              styles.dialog,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <View style={styles.header}>
              <AppText
                accessibilityRole="header"
                variant="inherit"
                style={[
                  typography.subheading,
                  styles.title,
                  { color: palette.text },
                ]}
              >
                {title}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={onClose}
                style={styles.close}
              >
                <X size={22} color={palette.text} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
              bounces={false}
            >
              {description ? (
                <AppText
                  variant="inherit"
                  style={[typography.bodySmall, { color: palette.text }]}
                >
                  {description}
                </AppText>
              ) : null}
              {children}
            </ScrollView>
            <View style={[styles.actions, { borderColor: palette.border }]}>
              {actions ?? (
                <>
                  {onConfirm ? (
                    <Button
                      theme={theme}
                      variant="outline"
                      label={cancelLabel}
                      onPress={onClose}
                      disabled={busy}
                    />
                  ) : null}
                  <Button
                    theme={theme}
                    label={confirmLabel}
                    onPress={onConfirm ?? onClose}
                    disabled={busy}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.ui.overlay },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "100%",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  title: { flex: 1 },
  close: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 16 },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
});
