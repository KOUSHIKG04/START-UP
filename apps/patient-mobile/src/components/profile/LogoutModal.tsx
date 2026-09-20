import { Modal, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";

export function LogoutModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
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
              style={styles.logoutCancelBtn}
            />
            <Button
              label="Log Out"
              variant="primary"
              onPress={() => {
                onClose();
                router.replace("/login");
              }}
              style={styles.logoutConfirmBtn}
              labelStyle={styles.logoutConfirmLabel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(12, 36, 52, 0.45)",
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
