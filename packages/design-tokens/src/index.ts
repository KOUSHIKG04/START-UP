export * from "./colors";
export * from "./gradients";
export * from "./spacing";
export * from "./radius";
export * from "./shadows";
export * from "./typography";
export * from "./themes";
export * from "./web-colors";

import { colors } from "./colors";
import { gradients } from "./gradients";
import { spacing } from "./spacing";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { typography } from "./typography";

export const tokens = {
  colors,
  gradients,
  spacing,
  radius,
  shadows,
  typography,
} as const;

export default tokens;
