import { StyleSheet } from "react-native";
import { colors, fontFamilies, radius, surfaces } from "@startup/design-tokens";
import type { AppTheme } from "../utils/appTheme";

export function notificationPalette(app: AppTheme) {
  if (app === "patient")
    return { ...colors.patient, dark: colors.patient.primaryDark };
  if (app === "driver")
    return { ...colors.driver, accent: colors.driver.primary };
  return colors.doctor;
}

export function createNotificationStyles(app: AppTheme) {
  const palette = notificationPalette(app);
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 999,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.ui.overlay,
    },
    drawer: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.white,
    },
    drawerSubheader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      backgroundColor: "#F8FCFB",
    },
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
    },
    swipeHint: {
      flex: 1,
      textAlign: "right",
      fontFamily: fontFamilies.regular,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    filterContainer: { width: 160, flexShrink: 0 },
    filterTrigger: {
      width: "100%",
      minHeight: 40,
      height: 40,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 10,
    },
    filterText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      includeFontPadding: false,
    },
    swipeRow: { borderRadius: radius.md, overflow: "hidden" },
    deleteAction: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 76,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.danger,
    },
    unreadCountText: {
      flex: 1,
      color: colors.textSecondary,
      fontFamily: fontFamilies.medium,
      fontSize: 14,
    },
    markReadText: {
      color: palette.primary,
      fontFamily: fontFamilies.semibold,
      fontSize: 12,
    },
    list: { flex: 1 },
    emptyList: { justifyContent: "center", alignItems: "center" },
    emptyMessage: { textAlign: "center" },
    listContent: {
      flexGrow: 1,
      padding: 12,
      gap: 10,
      paddingBottom: 40,
    },
    notificationCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 16,
      minHeight: 88,
      borderRadius: radius.md,
      backgroundColor: colors.white,
      ...surfaces.card,
      position: "relative",
    },
    unreadCard: {
      backgroundColor: "#F5FBFA",
      borderColor: "#C8E8E7",
    },
    cardPressed: {
      backgroundColor: "#F1F4F5",
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 2,
    },
    textContainer: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    itemTitle: {
      color: palette.text,
      fontFamily: fontFamilies.semibold,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "600",
      flex: 1,
    },
    unreadItemTitle: {
      color: palette.dark,
      fontFamily: fontFamilies.bold,
      fontWeight: "700",
    },
    itemTime: {
      color: colors.disabledText,
      fontFamily: fontFamilies.regular,
      fontSize: 12,
      lineHeight: 18,
    },
    itemMessage: {
      color: colors.textSecondary,
      fontFamily: fontFamilies.regular,
      fontSize: 14,
      lineHeight: 20,
    },
  });
}
