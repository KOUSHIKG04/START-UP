import { StyleSheet } from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

// One control size for profile fields, dropdowns, and the address drawer.
export const PROFILE_FIELD_HEIGHT = 54;
export const PROFILE_PLACEHOLDER_COLOR = "#9CA3AF";

export const profileFormStyles = StyleSheet.create({
  label: {
    fontFamily: fontFamilies.medium,
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    marginLeft: 6,
    marginBottom: 8,
  },
  control: {
    height: PROFILE_FIELD_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  text: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  iconControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    paddingHorizontal: 0,
  },
});
