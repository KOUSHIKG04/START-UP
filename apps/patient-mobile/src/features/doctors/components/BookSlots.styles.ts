import { StyleSheet } from "react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";

export const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 14,
  },
  bookSlotsCard: {
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: "#E0E5EB",
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  bookingSection: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  monthsStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  monthChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.patient.background,
  },
  selectedMonthChip: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  monthChipText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  selectedMonthChipText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  datesCarousel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  dateCard: {
    width: 54,
    height: 64,
    minHeight: 64,
    borderRadius: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  selectedDateCard: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  dateNumber: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  selectedDateNumber: {
    color: colors.white,
  },
  dateDay: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  selectedDateDay: {
    color: colors.white,
  },
  disabledDateText: {
    color: colors.disabledText,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availability: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    minWidth: 0,
    width: "31%",
    flexGrow: 1,
    paddingHorizontal: 5,
  },
  selectedTimeSlot: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  disabledTimeSlot: {
    backgroundColor: colors.disabledBackground,
    borderWidth: 0,
  },
  selectedTimeText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  patientRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    paddingVertical: 4,
  },
  reasonInputContainer: {
    width: "100%",
    maxWidth: "100%",
  },
  actions: { flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: 8,
  },
  loading: { minHeight: 32 },
  actionLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
