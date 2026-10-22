import type { TripControlsProps } from "../types/tracking";
import { styles } from "./Tracking.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { Share, Alert } from "react-native";
import { Share2 } from "lucide-react-native";
import { colors, radius } from "@startup/design-tokens";
import { Button, Card } from "@startup/mobile-ui";

export function TripControls({ location }: TripControlsProps) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      backgroundColor={colors.white}
      padding={16}
      gap={10}
    >
      <Text variant="cardHeading" style={styles.cardTitle}>
        Trip Controls
      </Text>
      <Button
        label="Share Live Location"
        variant="secondary"
        theme="patient"
        leftIcon={<Share2 color={colors.patient.primaryDark} size={16} />}
        onPress={() => {
          if (!location) {
            Alert.alert(
              "Location pending",
              "A current driver location is not available yet."
            );
            return;
          }
          void Share.share({
            message: `Ambulance location: https://maps.google.com/?q=${location.latitude},${location.longitude}`,
          });
        }}
        style={styles.shareButton}
        labelStyle={styles.shareText}
      />
    </Card>
  );
}
