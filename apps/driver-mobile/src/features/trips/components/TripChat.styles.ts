import { StyleSheet } from "react-native";
import { fontFamilies } from "@startup/design-tokens";
import { palette } from "../../../components/theme";
export const styles = StyleSheet.create({
  messages: { padding: 16, gap: 16 },
  bubble: { maxWidth: "82%", borderRadius: 12, padding: 12, gap: 4 },
  incoming: {
    alignSelf: "flex-start",
    backgroundColor: palette.soft,
    borderBottomLeftRadius: 3,
  },
  outgoing: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: palette.border,
    borderBottomRightRadius: 3,
  },
  time: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 5,
  },
  composer: { padding: 16, gap: 12 },
  quick: { gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 24,
    fontFamily: fontFamilies.regular,
    color: palette.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
});
