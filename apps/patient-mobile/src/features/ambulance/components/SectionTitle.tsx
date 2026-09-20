import type { ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { fontFamilies } from "@startup/design-tokens";

export function SectionTitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
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
