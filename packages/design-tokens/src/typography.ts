export const fontFamilies = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
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
  headerText: {
    fontFamily: fontFamilies.medium,
    fontSize: 21,
    fontWeight: "500",
  },
} as const;

export type Typography = typeof typography;
export type FontFamilies = typeof fontFamilies;

/** Proposed readable mobile scale; legacy tokens remain unchanged during the Patient trial. */
export const mobileTypography = {
  pageHeadline: {
    fontFamily: fontFamilies.semibold,
    fontSize: 28,
    // fontSize: 32,
    lineHeight: 40,
    fontWeight: "600",
  },
  screenTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 22,
    // fontSize: 28,
    lineHeight: 36,
    fontWeight: "600",
  },
  sectionHeading: {
    fontFamily: fontFamilies.semibold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
  },
  cardHeading: {
    fontFamily: fontFamilies.semibold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
  },
  bodyEmphasis: {
    fontFamily: fontFamilies.medium,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "500",
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  button: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
} as const;
export type MobileTypographyRole = keyof typeof mobileTypography;
