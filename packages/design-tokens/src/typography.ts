export const fontFamilies = {
  regular: "AlbertSans_400Regular",
  medium: "AlbertSans_500Medium",
  semibold: "AlbertSans_600SemiBold",
  bold: "AlbertSans_700Bold",
} as const;

export const typography = {
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
  },
  heading: {
    fontFamily: fontFamilies.semibold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
  },
  subheading: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  bodySmall: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  button: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  headerText:{
    fontFamily: fontFamilies.medium,
    fontSize: 21,
    fontWeight: "500",
  }
} as const;

export type Typography = typeof typography;
export type FontFamilies = typeof fontFamilies;
