import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  LogOut,
  MessageCircle,
  Plus,
  ShieldCheck,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import {
  Button,
  Card,
  CardSeparator,
  FadedScrollView,
  Header,
  Input,
} from "@startup/mobile-ui";
import type { PatientScreenProps } from "../types";

export function ProfileScreen({ onBackPress }: PatientScreenProps) {
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState(["", "", "", ""]);

  const updatePin = (index: number, value: string) => {
    setPin((current) =>
      current.map((digit, digitIndex) =>
        digitIndex === index ? value.replace(/\D/g, "").slice(-1) : digit
      )
    );
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Profile"
        app="patient"
        onBackPress={onBackPress}
        style={styles.header}
      />
      <FadedScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>AS</Text>
          </View>
          <Text style={styles.name}>Aditya Subramanya</Text>
        </View>

        <View style={styles.stats}>
          <ProfileStat label="Age" value="28 yrs" />
          <ProfileStat label="Blood" value="A+" />
          <ProfileStat label="Bookings" value="12" />
        </View>

        <Card borderRadius={radius.lg} gap={12} padding={16}>
          <View style={styles.familyHeading}>
            <Text style={styles.sectionTitle}>Family Members</Text>
            <Pressable accessibilityRole="button" style={styles.addButton}>
              <Plus color={colors.patient.primaryDark} size={16} />
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          </View>
          <CardSeparator />
          <Text style={styles.emptyFamily}>No family members added yet.</Text>
        </Card>

        <Card borderRadius={radius.lg} gap={0} padding={16}>
          <SettingsRow
            icon={<CalendarDays color={colors.patient.primaryDark} size={18} />}
            label="My Bookings"
            badge="12"
            onPress={() => router.navigate("/appointments")}
          />
          <SettingsRow
            icon={<Bell color={colors.patient.primaryDark} size={18} />}
            label="Notifications"
          />
          <SettingsRow
            icon={<MessageCircle color={colors.patient.primaryDark} size={18} />}
            label="Help and Support"
          />
          <SettingsRow
            icon={<ShieldCheck color={colors.patient.primaryDark} size={18} />}
            label="Privacy and Security"
          />
          <SettingsRow
            icon={<ShieldCheck color={colors.patient.primaryDark} size={18} />}
            label="Set security PIN"
            expanded={showPin}
            onPress={() => setShowPin((value) => !value)}
            last={!showPin}
          />

          {showPin ? (
            <View style={styles.pinSection}>
              <View style={styles.pinRow}>
                {pin.map((digit, index) => (
                  <Input
                    key={index}
                    accessibilityLabel={`PIN digit ${index + 1}`}
                    containerStyle={styles.pinContainer}
                    keyboardType="number-pad"
                    maxLength={1}
                    onChangeText={(value) => updatePin(index, value)}
                    secureTextEntry
                    style={styles.pinInput}
                    value={digit}
                  />
                ))}
              </View>
              <Button
                disabled={pin.some((digit) => !digit)}
                label="Save PIN"
                style={styles.savePinButton}
                labelStyle={styles.savePinLabel}
                variant="secondary"
              />
            </View>
          ) : null}
        </Card>

        <Card
          accessibilityLabel="Log out"
          borderRadius={radius.lg}
          onPress={() => undefined}
          orientation="horizontal"
          padding={16}
          style={styles.logoutCard}
        >
          <View style={styles.logoutIcon}>
            <LogOut color={colors.danger} size={18} />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
        </Card>
      </FadedScrollView>
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  badge,
  expanded,
  last = false,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  expanded?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        !last && styles.settingsBorder,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.settingsIcon}>{icon}</View>
      <Text style={styles.settingsLabel}>{label}</Text>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      {expanded === undefined ? (
        <ChevronRight color="#8EA0B4" size={17} />
      ) : (
        <ChevronDown
          color="#8EA0B4"
          size={17}
          style={expanded ? styles.chevronOpen : undefined}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  header: { paddingBottom: 26 },
  content: { gap: 16, paddingHorizontal: spacing.lg, paddingBottom: 126 },
  identity: { alignItems: "center", gap: 8, marginTop: -28 },
  avatar: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.patient.background,
    borderRadius: 38,
    backgroundColor: "#C8EDE9",
  },
  initials: {
    color: "#1A3A6B",
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: "700",
  },
  name: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700",
  },
  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
    borderRadius: radius.md,
    backgroundColor: "#F0FAF9",
  },
  statLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  statValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
  familyHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
  },
  addButton: { flexDirection: "row", alignItems: "center", gap: 3 },
  addText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
  },
  emptyFamily: {
    color: colors.patient.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  settingsRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#EDF9F7",
  },
  settingsLabel: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  badge: {
    minWidth: 23,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: colors.patient.accent,
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  pressed: { opacity: 0.72 },
  pinSection: { alignItems: "center", gap: 16, paddingTop: 10 },
  pinRow: { flexDirection: "row", gap: 12 },
  pinContainer: { width: 48 },
  pinInput: {
    minHeight: 42,
    paddingHorizontal: 0,
    paddingVertical: 8,
    textAlign: "center",
  },
  savePinButton: { width: 150, minHeight: 40 },
  savePinLabel: { fontSize: 11 },
  logoutCard: { marginTop: 70 },
  logoutIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFF1F2",
  },
  logoutText: {
    color: colors.danger,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
  },
});
