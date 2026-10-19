import { s } from "./SosEmergency.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ambulance } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
export function ActivatingSos() {
  return (
    <LinearGradient colors={["#F23F47", "#C9161D"]} style={s.activation}>
      <View style={s.activationGraphic}>
        <View style={s.activationOuter}>
          <View style={s.activationInner}>
            <Ambulance color="#FFFFFF" size={44} />
          </View>
        </View>
      </View>
      <Text variant="cardHeading" style={s.activationTitle}>
        EMERGENCY ACTIVATED
      </Text>
      <Text variant="body" style={s.activationCopy}>
        Getting your precise location...
      </Text>
    </LinearGradient>
  );
}
