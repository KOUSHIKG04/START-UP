import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, ShieldCheck, X } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";
import { privacyHighlights } from "../../utils/profileConstants";

export function PrivacyModal({
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
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <ShieldCheck color={colors.patient.primaryDark} size={20} />
              <Text style={styles.modalTitle}>Privacy & Security</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}
            >
              <X color={colors.patient.textSecondary} size={18} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalDescription}>
              Your medical history, prescriptions, and consult notes are
              end-to-end encrypted and HIPAA compliant.
            </Text>

            {privacyHighlights.map((point) => (
              <View key={point} style={styles.privacyBullet}>
                <CheckCircle2 color="#059669" size={16} />
                <Text style={styles.privacyBulletText}>{point}</Text>
              </View>
            ))}
          </View>

          <Button
            label="Understood"
            variant="primary"
            theme="patient"
            onPress={onClose}
            style={styles.modalButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  modalBody: {
    gap: 12,
  },
  modalDescription: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  privacyBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 2,
  },
  privacyBulletText: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  modalButton: {
    minHeight: 46,
    borderRadius: radius.md,
  },
});
