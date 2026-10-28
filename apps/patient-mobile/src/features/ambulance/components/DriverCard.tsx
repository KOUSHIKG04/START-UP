import type { DriverCardProps } from "../types/tracking";
import { styles } from "./Tracking.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { Pressable, View } from "react-native";
import { useState } from "react";
import { Phone, Star, UserRound } from "lucide-react-native";
import { colors, radius } from "@startup/design-tokens";
import { AppDialog, Card } from "@startup/mobile-ui";

export function DriverCard({
  name,
  vehicle,
  service,
  rating,
}: DriverCardProps) {
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  return (
    <>
      <Card
        variant="outlined"
        borderRadius={radius.md}
        backgroundColor={colors.white}
        padding={16}
        style={styles.driverCard}
      >
        <View style={styles.avatar}>
          <UserRound color={colors.white} size={24} />
        </View>
        <View style={styles.driverCopy}>
          <View style={styles.driverNameRow}>
            <Text variant="body" style={styles.driverName}>
              {name}
            </Text>
            <View style={styles.ratingBadge}>
              <Star color="#F59E0B" fill="#F59E0B" size={11} />
              <Text variant="bodyEmphasis" style={styles.driverRating}>
                {rating ?? "—"}
              </Text>
            </View>
          </View>
          <Text variant="body" style={styles.vehicle}>
            {vehicle ?? "Vehicle details pending"} • {service}
          </Text>
        </View>
        <Pressable
          onPress={() => setContactDialogOpen(true)}
          style={({ pressed }) => [
            styles.callButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Call driver"
        >
          <Phone color={colors.white} size={18} />
        </Pressable>
      </Card>
      <AppDialog
        theme="patient"
        visible={contactDialogOpen}
        title="Driver contact unavailable"
        description="The driver phone number is not available for this booking yet."
        onClose={() => setContactDialogOpen(false)}
      />
    </>
  );
}
