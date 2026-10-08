import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View, type ModalProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@startup/design-tokens";

export type ModalSurfaceProps = Omit<ModalProps, "children" | "onRequestClose"> & {
  children: ReactNode;
  onClose?: () => void;
  layout?: "dialog" | "custom";
  dismissOnBackdrop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Shared native modal lifecycle and neutral backdrop. Custom layouts retain their own drawers/animations. */
export function ModalSurface({ children, onClose, layout = "dialog", dismissOnBackdrop = false,
  contentStyle, animationType = "fade", transparent = layout === "dialog", ...props }: ModalSurfaceProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal {...props} animationType={animationType} transparent={transparent} onRequestClose={onClose}>
      {layout === "custom" ? children : (
        <View style={[styles.backdrop, { paddingTop: Math.max(20, insets.top), paddingBottom: Math.max(20, insets.bottom) }]}>
          {dismissOnBackdrop && onClose ? <Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={onClose} style={StyleSheet.absoluteFill} /> : null}
          <View accessibilityViewIsModal style={[styles.content, contentStyle]}>{children}</View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.ui.overlay, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  content: { width: "100%", maxWidth: 360, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 16, elevation: 0, shadowOpacity: 0, boxShadow: "none" },
});
