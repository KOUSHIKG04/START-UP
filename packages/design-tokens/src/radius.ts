export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
  full: 9999,
} as const;

export type Radius = typeof radius;
