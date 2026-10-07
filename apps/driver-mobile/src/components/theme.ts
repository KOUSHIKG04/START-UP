import { StyleSheet } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export const palette = {
  primary: colors.driver.primary,
  ink: colors.driver.text,
  muted: colors.driver.textSecondary,
  soft: colors.driver.surface,
  border: colors.borderDefault,
  green: colors.driver.statusReady,
};

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  copy: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    color: palette.ink,
  },
  heading: { fontFamily: fontFamilies.semibold, fontSize: 15, lineHeight: 21 },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    color: "white",
  },
  header: { backgroundColor: palette.primary },
  headerRow: {
    minHeight: 96,
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  grow: { flex: 1 },
  body: { padding: 16, gap: 16, paddingBottom: 118, flexGrow: 1 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: "white",
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricBorder: { borderLeftWidth: 1, borderLeftColor: palette.border },
  metricValue: {
    fontFamily: fontFamilies.bold,
    color: palette.primary,
    fontSize: 18,
    lineHeight: 24,
  },
  caption: { fontSize: 11, lineHeight: 16, color: palette.muted },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: palette.soft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    color: palette.primary,
    fontSize: 11,
    fontFamily: fontFamilies.semibold,
  },
  divider: { height: 1, backgroundColor: palette.border },
  center: { alignItems: "center", gap: 8 },
  button: { minHeight: 52 },
});
