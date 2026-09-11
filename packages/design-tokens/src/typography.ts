export const typography = {
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
  },
  subheading: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  headerText:{
    fontSize: 21,
    fontWeight: "500",
  }
} as const;

export type Typography = typeof typography;
