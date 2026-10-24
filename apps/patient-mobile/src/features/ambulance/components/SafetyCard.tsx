import { styles } from "./Tracking.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { colors } from "@startup/design-tokens";

export function SafetyCard() {
  return (
    <View style={styles.wellnessBanner}>
      <View style={styles.wellnessIcon}>
        <ShieldCheck color={colors.white} size={20} />
      </View>
      <View style={styles.wellnessCopy}>
        <Text variant="cardHeading" style={styles.wellnessTitle}>
          Your safety is our priority
        </Text>
        <Text variant="body" style={styles.infoText}>
          GPS tracked with certified paramedic crew on standby.
        </Text>
      </View>
    </View>
  );
}
