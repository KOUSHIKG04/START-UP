import { fontFamilies } from "@startup/design-tokens";

export const interFonts = {
  [fontFamilies.regular]: require("@startup/design-tokens/fonts/Inter_400Regular"),
  [fontFamilies.medium]: require("@startup/design-tokens/fonts/Inter_500Medium"),
  [fontFamilies.semibold]: require("@startup/design-tokens/fonts/Inter_600SemiBold"),
  [fontFamilies.bold]: require("@startup/design-tokens/fonts/Inter_700Bold"),
} as const;

/** @deprecated Use interFonts. Kept for existing package consumers. */
export const albertSansFonts = interFonts;
