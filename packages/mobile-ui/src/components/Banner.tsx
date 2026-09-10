import React, { type PropsWithChildren } from "react";
import { StyleSheet, View, Text, type ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "@startup/design-tokens";
import { cn } from "cn";

export type BannerVariant = "patient" | "doctor" | "driver" | "sos";

export type BannerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  variant?: BannerVariant;
  /** Alias for variant */
  app?: BannerVariant;
  className?: string;
  style?: ViewStyle;
}>;

// Map directly to design token colors
const variantBackgrounds: Record<BannerVariant, string> = {
  patient: colors.patient.primaryDark,
  doctor: colors.doctor.header,
  driver: colors.driver.dark,
  sos: colors.patient.sos.header,
};

export function Banner({
  title,
  subtitle,
  variant,
  app,
  className,
  style,
  children,
}: BannerProps) {
  const activeVariant = variant ?? app ?? "patient";
  const backgroundColor = variantBackgrounds[activeVariant];

  return <View></View>;
}

const styles = StyleSheet.create({});
