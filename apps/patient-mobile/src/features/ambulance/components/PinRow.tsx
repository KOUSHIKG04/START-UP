import type { PinRowProps } from "../types/tracking";
import { styles } from "./Tracking.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { Info } from "lucide-react-native";
import { colors, radius } from "@startup/design-tokens";
import { Card } from "@startup/mobile-ui";

export function PinRow({ pin }: PinRowProps) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      backgroundColor={colors.white}
      gap={16}
      padding={18}
      style={styles.centeredCard}
    >
      <View style={styles.otpNotice}>
        <Info color={colors.patient.primaryDark} size={20} />
        <Text variant="body" style={styles.infoText}>
          Share this PIN with the driver only when you reach your destination.
        </Text>
      </View>
      <View style={styles.otpRow}>
        {Array.from({ length: 4 }, (_, index) => pin?.[index] ?? "").map(
          (digit, index) => (
            <View key={index} style={styles.otpCell}>
              <Text variant="body" style={styles.otpText}>
                {digit}
              </Text>
            </View>
          )
        )}
      </View>
    </Card>
  );
}
