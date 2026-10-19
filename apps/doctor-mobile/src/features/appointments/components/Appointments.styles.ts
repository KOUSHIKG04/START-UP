import { StyleSheet } from "react-native";
import { fontFamilies } from "@startup/design-tokens";
import { palette } from "../../../components/theme";
export const styles = StyleSheet.create({
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dateHeading: { fontSize: 18, fontFamily: fontFamilies.medium },
  monthDropdown: { width: 180, maxWidth: "75%" },
  dateControls: { gap: 24 },
  emptyState: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { textAlign: "center" },
  dateStrip: { height: 72, flexGrow: 0, flexShrink: 0 },
  filterStrip: { height: 48, flexGrow: 0, flexShrink: 0 },
  horizontalScroll: { flexGrow: 0 },
  filterPill: { alignSelf: "center" },
  monthTrigger: { minHeight: 44, height: 44, paddingHorizontal: 10 },
  monthLabel: { fontSize: 13, fontFamily: fontFamilies.semibold },
  filters: { gap: 8, paddingVertical: 4, alignItems: "center" },
  daysList: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  dayPill: {
    width: 54,
    height: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: "#D2D2D2",
    gap: 2,
  },
  dayPillSelected: {
    backgroundColor: palette.dark,
    borderColor: palette.dark,
  },
  dayText: {
    fontSize: 17,
    lineHeight: 22,
    color: palette.text,
  },
  dayTextSelected: {
    fontSize: 17,
    lineHeight: 22,
    color: "white",
  },
  dayLabel: {
    fontSize: 11,
    color: palette.muted,
  },
  dayLabelSelected: {
    fontSize: 11,
    color: "white",
  },
});
