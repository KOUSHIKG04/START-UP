import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  ChevronRight,
  LogOut,
  MessageCircle,
  Moon,
  ShieldCheck,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Card, FadedScrollView, Header } from "@startup/mobile-ui";
import { HelpModal } from "./HelpModal";
import { LogoutModal } from "./LogoutModal";
import { PrivacyModal } from "./PrivacyModal";

export function SettingsView({ onBack }: { onBack: () => void }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <Header
        title="Settings"
        app="patient"
        onBackPress={onBack}
      />
      <FadedScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Option 1: Theme Toggle (DISABLED) */}
        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          backgroundColor={colors.white}
          padding={16}
          style={styles.cardNoShadow}
        >
          <View style={styles.settingItemRow}>
            <View style={styles.iconCircle}>
              <Moon color={colors.patient.primaryDark} size={18} />
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.rowTitle}>Dark Mode</Text>
              <Text style={styles.rowSubtitle}>
                System default • Dark mode coming soon
              </Text>
            </View>
            <View style={styles.themeToggleArea}>
              <View style={styles.disabledPill}>
                <Text style={styles.disabledPillText}>Disabled</Text>
              </View>
              <Switch
                disabled={true}
                value={false}
                trackColor={{ false: "#E2E8F0", true: "#087F78" }}
                thumbColor="#CBD5E1"
              />
            </View>
          </View>
        </Card>

        {/* Option 2: Help and Support */}
        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          backgroundColor={colors.white}
          padding={16}
          style={styles.cardNoShadow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Help and Support"
            onPress={() => setHelpOpen(true)}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.iconCircle}>
              <MessageCircle color={colors.patient.primaryDark} size={18} />
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.rowTitle}>Help and Support</Text>
              <Text style={styles.rowSubtitle}>
                FAQs, 24/7 helpline & contact care
              </Text>
            </View>
            <ChevronRight color="#8EA0B4" size={18} />
          </Pressable>
        </Card>

        {/* Option 3: Privacy Policy */}
        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          backgroundColor={colors.white}
          padding={16}
          style={styles.cardNoShadow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Privacy Policy"
            onPress={() => setPrivacyOpen(true)}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.iconCircle}>
              <ShieldCheck color={colors.patient.primaryDark} size={18} />
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.rowTitle}>Privacy Policy</Text>
              <Text style={styles.rowSubtitle}>
                Data protection, HIPAA & security terms
              </Text>
            </View>
            <ChevronRight color="#8EA0B4" size={18} />
          </Pressable>
        </Card>

        {/* Option 4: Log Out */}
        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          backgroundColor={colors.white}
          padding={16}
          style={styles.cardNoShadow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log Out"
            onPress={() => setLogoutOpen(true)}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.logoutIconCircle}>
              <LogOut color="#DC2626" size={18} />
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.logoutItemTitle}>Log Out</Text>
              <Text style={styles.rowSubtitle}>
                Sign out of your Clinzo patient account
              </Text>
            </View>
            <ChevronRight color="#DC2626" size={18} />
          </Pressable>
        </Card>
      </FadedScrollView>

      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
      <PrivacyModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <LogoutModal visible={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 60,
  },
  cardNoShadow: {
    elevation: 0,
    shadowOpacity: 0,
  },
  actionRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingItemRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#EDF9F7",
  },
  logoutIconCircle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
  },
  copyCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
  },
  logoutItemTitle: {
    color: "#DC2626",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
  },
  rowSubtitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  themeToggleArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabledPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  disabledPillText: {
    color: "#64748B",
    fontFamily: fontFamilies.medium,
    fontSize: 10,
  },
  pressed: { opacity: 0.72 },
});
