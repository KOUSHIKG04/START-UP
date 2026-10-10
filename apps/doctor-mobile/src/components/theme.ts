import { StyleSheet } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export const palette = {
  ...colors.doctor,
  white: colors.white,
  muted: "#71818F",
  card: "#0A8C84",
  subtle: "#F2F7F7",
  danger: colors.danger,
};

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.white },
  content: { padding: 16, gap: 16, flexGrow: 1 },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  text: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: palette.text,
  },
  heading: {
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    lineHeight: 22,
    color: palette.header,
  },
  header: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  panel: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  choice: {
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: palette.surface,
  },
  divider: { height: 1, backgroundColor: palette.border },
  error: {
    color: palette.danger,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 19,
  },
  success: {
    color: palette.dark,
    backgroundColor: palette.surface,
    padding: 12,
    borderRadius: 10,
  },
  field: { maxWidth: "100%" },
});
