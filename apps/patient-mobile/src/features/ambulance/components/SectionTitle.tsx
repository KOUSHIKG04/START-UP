import type { SectionTitleProps } from "../types/ambulance-booking-form";
import { AppText as Text } from "@startup/mobile-ui";

import { StyleSheet } from "react-native";
import { fontFamilies } from "@startup/design-tokens";

export function SectionTitle({ children, style }: SectionTitleProps) {
  return (
    <Text variant="sectionHeading" style={[styles.sectionTitle, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
});
