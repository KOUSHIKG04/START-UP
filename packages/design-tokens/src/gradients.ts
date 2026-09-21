/**
 * Startup Design System - Gradients
 */

const bannerColors = ["#0A4A47", "#087F78"] as const;
const banner = {
  colors: bannerColors,
  css: `linear-gradient(90deg, ${bannerColors[0]} 0%, ${bannerColors[1]} 100%)`,
} as const;
const sosColors = ["#3A0508", "#C0392B"] as const;

export const gradients = {
  // Linear gradient for Patient App banner and Admin Web banner (Stop 0%: #0A4A47, Stop 100%: #087F78)
  patientBanner: banner,
  adminBanner: banner,
  // Emergency SOS Header
  sosHeader: {
    colors: sosColors,
    css: `linear-gradient(90deg, ${sosColors[0]} 0%, ${sosColors[1]} 100%)`,
  },
} as const;

export const patientBannerGradient = gradients.patientBanner;
export const adminBannerGradient = gradients.adminBanner;
export const sosHeaderGradient = gradients.sosHeader;
