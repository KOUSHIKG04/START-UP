const { colors } = require("../design-tokens/src/colors.ts"); const { spacing } = require("../design-tokens/src/spacing.ts"); const { radius } = require("../design-tokens/src/radius.ts"); const { typography } = require("../design-tokens/src/typography.ts");

const px = (value) => `${value}px`;
const textStyle = ({ fontSize, lineHeight, fontWeight }) => [
  px(fontSize),
  {
    ...(lineHeight ? { lineHeight: px(lineHeight) } : {}),
    fontWeight,
  },
];

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        "app-background": colors.background,
        surface: colors.surface,
        content: colors.textPrimary,
        "content-secondary": colors.textSecondary,
        border: colors.border,
        success: colors.success,
        danger: colors.danger,
        "on-primary": colors.white,
        patient: {
          primary: colors.patient.primary,
          "primary-dark": colors.patient.primaryDark,
          accent: colors.patient.accent,
          surface: colors.patient.surface,
          text: colors.patient.text,
          "text-secondary": colors.patient.textSecondary,
          muted: colors.patient.muted,
          background: colors.patient.background,
        },
        sos: {
          primary: colors.patient.sos.primary,
          dark: colors.patient.sos.dark,
          light: colors.patient.sos.light,
          border: colors.patient.sos.border,
          "border-dark": colors.patient.sos.borderDark,
          ring: colors.patient.sos.ring,
          "ring-on-primary": colors.patient.sos.ringOnPrimary,
          surface: colors.patient.sos.surface,
          header: colors.patient.sos.header,
          safe: colors.patient.sos.safe,
          background: colors.patient.sos.background,
        },
        doctor: {
          primary: colors.doctor.primary,
          dark: colors.doctor.dark,
          accent: colors.doctor.accent,
          header: colors.doctor.header,
          chart: colors.doctor.chart,
          surface: colors.doctor.surface,
          text: colors.doctor.text,
          border: colors.doctor.border,
        },
        driver: {
          primary: colors.driver.primary,
          dark: colors.driver.dark,
          surface: colors.driver.surface,
          ready: colors.driver.statusReady,
          "surface-tint": colors.driver.surfaceTint,
          text: colors.driver.text,
          "text-secondary": colors.driver.textSecondary,
          muted: colors.driver.muted,
        },
        navigation: {
          inactive: colors.navigation.inactive,
          border: colors.navigation.border,
        },
      },
      spacing: {
        xs: px(spacing.xs),
        sm: px(spacing.sm),
        md: px(spacing.md),
        lg: px(spacing.lg),
        xl: px(spacing.xl),
        "2xl": px(spacing.xxl),
        "3xl": px(spacing.xxxl),
        "bottom-nav-clearance": "110px",
      },
      borderRadius: {
        xs: px(radius.xs),
        sm: px(radius.sm),
        md: px(radius.md),
        lg: px(radius.lg),
        xl: px(radius.xl),
        pill: px(radius.pill),
        full: px(radius.full),
        card: px(radius.xl),
      },
      fontSize: {
        "app-title": textStyle(typography.title),
        "app-heading": textStyle(typography.heading),
        "app-subheading": textStyle(typography.subheading),
        "app-body": textStyle(typography.body),
        "app-body-small": textStyle(typography.bodySmall),
        "app-caption": textStyle(typography.caption),
        "app-button": textStyle(typography.button),
        "app-header": textStyle(typography.headerText),
      },
    },
  },
};
