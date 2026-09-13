import { fontFamilies } from "@startup/design-tokens";

export const albertSansFonts = {
  [fontFamilies.regular]: require("../../../design-tokens/assets/fonts/AlbertSans_400Regular.ttf"),
  [fontFamilies.medium]: require("../../../design-tokens/assets/fonts/AlbertSans_500Medium.ttf"),
  [fontFamilies.semibold]: require("../../../design-tokens/assets/fonts/AlbertSans_600SemiBold.ttf"),
  [fontFamilies.bold]: require("../../../design-tokens/assets/fonts/AlbertSans_700Bold.ttf"),
} as const;
