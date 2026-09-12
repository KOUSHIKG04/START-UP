export const colors = {
  // Patient Mobile App
  patient: {
    primary: "#008877",
    primaryDark: "#087F78",
    accent: "#0A9E96",
    surface: "#E6F5F4",
    text: "#0C2434",
    textSecondary: "#374151",
    muted: "#9CA3AF",
    background: "#F9FAFB",

    // Embedded SOS feature inside Patient App
    sos: {
      primary: "#EF3B43",
      dark: "#C0392B",
      light: "#FFEAEB",
      border: "#FFA4AC",
      borderDark: "#D62D35",
      ring: "rgba(239, 59, 67, 0.25)",
      ringOnPrimary: "rgba(255, 255, 255, 0.45)",
      surface: "#FDF2F2",
      header: "#3A0508",
      safe: "#07595D",
      background: "#EEF4F5",
    },
  },

  // Doctor Mobile App
  doctor: {
    primary: "#008877",
    dark: "#097F78",
    accent: "#008F83",
    header: "#0B4145",
    chart: "#D9F2EF",
    surface: "#E6F5F4",
    text: "#0C2434",
    border: "#E0E5EB",
  },

  // Driver Mobile App
  driver: {
    primary: "#087F8C",
    dark: "#173B4A",
    surface: "#EAF8F7",
    statusReady: "#36B37E",
    surfaceTint: "#E6F5F4",
    textSecondary: "#71818F",
    muted: "#9CA3AF",
    text: "#0C2434",
  },

  // 4. Admin Web App
  admin: {
    primary: "#008877",
    primaryDark: "#087F78",
    accent: "#0A9E96",
    surface: "#E6F5F4",
    text: "#0C2434",
    textSecondary: "#374151",
    border: "#E0E5EB",
    background: "#F9FAFB",
  },

  // Global shared / fallback defaults
  brand: "#008877",
  white: "#FFFFFF",
  black: "#000000",
  background: "#F9FAFB",
  surface: "#FFFFFF",
  textPrimary: "#0C2434",
  textSecondary: "#374151",
  border: "#E0E5EB",
  success: "#36B37E",
  danger: "#EF3B43",
  navigation: {
    inactive: "#8E9BAE",
    border: "#E2E8F0",
    shadow: "#0C2434",
  },
} as const;

// Convenient direct shortcuts
export const patientColors = colors.patient;
export const doctorColors = colors.doctor;
export const driverColors = colors.driver;
export const adminColors = colors.admin;
export const sosColors = colors.patient.sos;

export type Colors = typeof colors;
