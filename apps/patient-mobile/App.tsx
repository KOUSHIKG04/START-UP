import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Screen, BottomNavBar, type NavItem } from "@startup/mobile-ui";
import { Home, Calendar, FileText, User } from "lucide-react-native";
import { colors, spacing, radius } from "@startup/design-tokens";

const patientNavItems: NavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "appointments", label: "Appointments", icon: Calendar },
  { key: "records", label: "Records", icon: FileText },
  { key: "profile", label: "Profile", icon: User },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <Screen edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}></ScrollView>

      <BottomNavBar
        items={patientNavItems}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key)}
        showSOS
        onSOSPress={() => {
          setActiveTab("sos");
        }}
      />

      <StatusBar style="dark" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
    backgroundColor: colors.patient.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: 110,
  },
  homeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.patient.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.patient.textSecondary,
    marginTop: spacing.xs,
  },
  emergencyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.patient.sos.primary,
    alignItems: "center",
  },
  emergencyTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.patient.sos.primary,
  },
  emergencySubtitle: {
    fontSize: 14,
    color: colors.patient.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  backBtn: {
    backgroundColor: "#F3F4F6",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  backBtnText: {
    color: colors.patient.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
});
