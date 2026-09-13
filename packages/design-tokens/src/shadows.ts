export const shadows = {
  card: {
    shadowColor: "#002429",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export type Shadows = typeof shadows;
