import { StyleSheet, Text, View } from "react-native";
import { Navigation } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, Card, Input } from "@startup/mobile-ui";
import type { HomeVisitAddressProps } from "../../types/doctor-profile";

export function HomeVisitAddress({
  address,
  onAddressChange,
  onConfirm,
  verifiedAddress,
}: HomeVisitAddressProps) {
  return (
    <Card borderRadius={radius.md} gap={12} padding={14}>
      <Input
        accessibilityLabel="Home visit address"
        label="Your address"
        placeholder="Enter your address here..."
        value={address}
        onChangeText={onAddressChange}
      />
      <Button
        label="Update your location"
        disabled={!address.trim()}
        onPress={onConfirm}
        style={styles.locationButton}
      />
      <View style={styles.pinnedLocation}>
        <Navigation
          color={colors.patient.primaryDark}
          size={19}
          strokeWidth={1.9}
        />
        <View style={styles.pinnedLocationCopy}>
          <Text style={styles.pinnedLocationTitle}>
            Verified visit location
          </Text>
          <Text numberOfLines={2} style={styles.pinnedLocationAddress}>
            {verifiedAddress || "Add an address for the doctor’s visit"}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
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
