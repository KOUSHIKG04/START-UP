import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, HelpCircle, Mail, Phone, X } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";
import { supportContacts } from "../utils/profileConstants";

export function HelpModal({
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
              <HelpCircle color={colors.patient.primaryDark} size={20} />
              <Text style={styles.modalTitle}>Help & Support</Text>
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
              We are here 24/7 to assist with your medical appointments, emergency
              dispatch, and account queries.
            </Text>

            <Pressable
              onPress={() => void Linking.openURL(`tel:${supportContacts.phone.replace(/-/g, "")}`)}
              style={({ pressed }) => [styles.contactCard, pressed && styles.pressed]}
            >
              <Phone color={colors.patient.primaryDark} size={18} />
              <View style={styles.contactTextCol}>
                <Text style={styles.contactLabel}>{supportContacts.hours}</Text>
                <Text style={styles.contactValue}>{supportContacts.phone}</Text>
              </View>
              <ChevronRight color="#8EA0B4" size={16} />
            </Pressable>

            <Pressable
              onPress={() => void Linking.openURL(`mailto:${supportContacts.email}`)}
              style={({ pressed }) => [styles.contactCard, pressed && styles.pressed]}
            >
              <Mail color={colors.patient.primaryDark} size={18} />
              <View style={styles.contactTextCol}>
                <Text style={styles.contactLabel}>Email Support</Text>
                <Text style={styles.contactValue}>{supportContacts.email}</Text>
              </View>
              <ChevronRight color="#8EA0B4" size={16} />
            </Pressable>
          </View>

          <Button
            label="Close"
            variant="secondary"
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
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contactTextCol: {
    flex: 1,
    gap: 1,
  },
  contactLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  contactValue: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: "700",
  },
  modalButton: {
    minHeight: 46,
    borderRadius: radius.md,
  },
});
