export * from "./colors";
export * from "./gradients";
export * from "./spacing";
export * from "./radius";
export * from "./typography";

import { colors } from "./colors";
import { gradients } from "./gradients";
import { spacing } from "./spacing";
import { radius } from "./radius";
import { typography } from "./typography";

export const tokens = {
  colors,
  gradients,
  spacing,
  radius,
  typography,
} as const;

export default tokens;
