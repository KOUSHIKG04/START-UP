import { AppText as Text } from "@startup/mobile-ui";
import { StyleSheet, View } from "react-native";
import { Navigation } from "lucide-react-native";
import { colors, fontFamilies, radius, surfaces } from "@startup/design-tokens";
import { Button, Card } from "@startup/mobile-ui";
import type { HomeVisitAddressProps } from "../types/doctor-profile";

export function HomeVisitAddress({
  onConfirm,
  verifiedAddress,
}: HomeVisitAddressProps) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      backgroundColor={colors.white}
      gap={12}
      padding={14}
      style={styles.addressCard}
    >
      <View style={styles.pinnedLocation}>
        <Navigation
          color={colors.patient.primaryDark}
          size={19}
          strokeWidth={1.9}
        />
        <View style={styles.pinnedLocationCopy}>
          <Text variant="cardHeading" style={styles.pinnedLocationTitle}>
            Home visit address
          </Text>
          <Text
            variant="body"
            numberOfLines={2}
            style={styles.pinnedLocationAddress}
          >
            {verifiedAddress || "Choose a saved address with a map pin"}
          </Text>
        </View>
      </View>
      <Button
        label={
          verifiedAddress ? "Change visit address" : "Choose visit address"
        }
        onPress={onConfirm}
        style={styles.locationButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  addressCard: {
    ...surfaces.card,
    borderRadius: radius.md,
  },
  locationButton: {
    minHeight: 44,
    borderRadius: radius.md,
  },
  pinnedLocation: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  pinnedLocationCopy: {
    flex: 1,
    gap: 2,
  },
  pinnedLocationTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  pinnedLocationAddress: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
  },
});
