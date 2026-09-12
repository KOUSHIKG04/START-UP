export const gradients = {
  // Linear gradient for Patient App banner and Admin Web banner (Stop 0%: #0A4A47, Stop 100%: #087F78)
  patientBanner: {
    colors: ["#0A4A47", "#087F78"] as const,
    css: "linear-gradient(90deg, #0A4A47 0%, #087F78 100%)",
  },
  adminBanner: {
    colors: ["#0A4A47", "#087F78"] as const,
    css: "linear-gradient(90deg, #0A4A47 0%, #087F78 100%)",
  },
  // Emergency SOS Header
  sosHeader: {
    colors: ["#3A0508", "#C0392B"] as const,
    css: "linear-gradient(90deg, #3A0508 0%, #C0392B 100%)",
  },
} as const;

export const patientBannerGradient = gradients.patientBanner;
export const adminBannerGradient = gradients.adminBanner;
export const sosHeaderGradient = gradients.sosHeader;
