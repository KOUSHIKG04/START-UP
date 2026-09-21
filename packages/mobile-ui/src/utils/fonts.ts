import { fontFamilies } from "@startup/design-tokens";

export const albertSansFonts = {
  [fontFamilies.regular]: require("@startup/design-tokens/fonts/AlbertSans_400Regular"),
  [fontFamilies.medium]: require("@startup/design-tokens/fonts/AlbertSans_500Medium"),
  [fontFamilies.semibold]: require("@startup/design-tokens/fonts/AlbertSans_600SemiBold"),
  [fontFamilies.bold]: require("@startup/design-tokens/fonts/AlbertSans_700Bold"),
} as const;
