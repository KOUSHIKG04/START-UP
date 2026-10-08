import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, ModalSurface } from "@startup/mobile-ui";
import { mobileSession, supabase } from "../../../services/supabase";
import { signOutWithPushCleanup } from "../../notifications/deviceNotifications";

export function LogoutModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });

  async function signOut() {
    if (!supabase) {
      setError("Supabase is not configured on this device.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: signOutError } = (await signOutWithPushCleanup())!;
      if (signOutError) throw signOutError;
      queryClient.clear();
      await mobileSession.refresh();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not sign out. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalSurface visible={visible} onClose={onClose} contentStyle={styles.modalCard}>
          <View style={styles.logoutModalHero}>
            <View style={styles.logoutModalIconWrap}>
              <LogOut color="#DC2626" size={26} />
            </View>
            <Text style={styles.logoutModalTitle}>Log Out</Text>
            <Text style={styles.logoutModalSub}>
              Are you sure you want to log out of your Clinzo patient account?
            </Text>

          </View>

          <View style={styles.logoutActions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={onClose}
              disabled={busy}
              style={styles.logoutCancelBtn}
            />
            <Button loading={busy}
              label={busy ? "Signing out…" : "Log Out"}
              variant="primary"
              onPress={() => void signOut()}
              disabled={busy}
              style={styles.logoutConfirmBtn}
              labelStyle={styles.logoutConfirmLabel}
            />
          </View>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.ui.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    padding: 18,
    gap: 16,
    elevation: 0,
    shadowOpacity: 0,
  },
  logoutModalHero: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  logoutModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoutModalTitle: {
    color: "#0C2434",
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700",
  },
  logoutModalSub: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: "center",
  },
  logoutActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  logoutCancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
  },
  logoutConfirmBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  logoutConfirmLabel: {
    color: colors.white,
  },
});
