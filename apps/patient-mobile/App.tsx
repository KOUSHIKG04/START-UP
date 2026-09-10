import React from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Screen, Banner, AppText } from "@startup/mobile-ui";
import { colors, spacing, radius } from "@startup/design-tokens";

export default function App() {
  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
       
        <Banner
          variant="patient"
          title="Patient Portal"
          subtitle="MedCab Booking, Consultations & Records"
        />

      </ScrollView>
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
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.patient.text,
  },
  cardSubtitle: {
    color: colors.patient.textSecondary,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.patient.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
  },
  statusCard: {
    backgroundColor: colors.driver.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.driver.primary,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: colors.driver.dark,
    fontWeight: "600",
  },
  statusPill: {
    backgroundColor: colors.driver.statusReady,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statusPillText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  sosButton: {
    backgroundColor: colors.patient.sos.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    shadowColor: colors.patient.sos.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
