import { colors } from "./colors";
import { shadows } from "./shadows";

export const surfaces = {
  card: {
    borderWidth: 0.4,
    borderColor: colors.border,
    ...shadows.card,
  },
} as const;

export type Surfaces = typeof surfaces;
