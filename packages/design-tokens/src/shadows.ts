export const shadows = {
  card: {
    boxShadow: "0px 3px 10px rgba(0, 0, 0, 0.08)",
  },
} as const;

export type Shadows = typeof shadows;
