import { StyleSheet } from "react-native";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  onlineHeaderTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
  },
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  tabSection: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: 14,
    overflow: "hidden",
  },
  page: {},
  message: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  locations: { gap: 10 },
  confirmationActions: { gap: 10 },
  confirmationButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  confirmationButtonLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  location: {
    gap: 6,
    padding: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.patient.surfaceBorder,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  selectedLocation: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.surface,
  },
  profileSkeleton: {
    minHeight: 120,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#E6F4F3",
  },
});
