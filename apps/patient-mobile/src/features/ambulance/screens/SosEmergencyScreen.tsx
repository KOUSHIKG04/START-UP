import { useSosEmergency } from "../hooks/useSosEmergency";
import { Hotline } from "../components/Hotline";
import { DarkButton } from "../components/DarkButton";
import { ActivatingSos } from "../components/ActivatingSos";
import { s } from "../components/SosEmergency.styles";
import { AppText as Text } from "@startup/mobile-ui";

import { Linking, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  AlertCircle,
  ArrowRight,
  Phone,
  PhoneCall,
  Siren,
  Star,
} from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { SafeAreaView } from "@startup/mobile-ui";
import type { SosEmergencyScreenProps } from "../types/sos";

export function SosEmergencyScreen({
  onCancel,
  onCallEmergency,
}: SosEmergencyScreenProps) {
  const { dispatched } = useSosEmergency({ onCancel, onCallEmergency });
  if (!dispatched) return <ActivatingSos />;

  return (
    <LinearGradient colors={["#3A0508", "#1A0102"]} style={s.screen}>
      <SafeAreaView edges={["top", "bottom"]} style={s.safeArea}>
        <View style={s.header}>
          <View style={s.sirenCircle}>
            <Siren color="#FFFFFF" size={20} />
          </View>
          <Text variant="screenTitle" style={s.headerTitle}>
            EMERGENCY ACTIVATED
          </Text>
        </View>

        <View style={s.content}>
          <View style={s.driverCard}>
            <View style={s.driverTop}>
              <View style={s.avatar}>
                <Text variant="body" style={s.avatarText}>
                  SN
                </Text>
              </View>
              <View style={s.driverCopy}>
                <Text variant="body" style={s.driverName}>
                  Suresh Nair
                </Text>
                <Text variant="body" style={s.driverMeta}>
                  KA02CD5678 • BLS Ambulance
                </Text>
              </View>
              <View style={s.rating}>
                <Star color="#C0392B" size={11} />
                <Text variant="bodyEmphasis" style={s.ratingText}>
                  4.6
                </Text>
              </View>
            </View>
            <View style={s.etaRow}>
              <View>
                <Text variant="caption" style={s.caption}>
                  DISTANCE
                </Text>
                <Text variant="bodyEmphasis" style={s.etaValue}>
                  5.1 km
                </Text>
              </View>
              <View>
                <Text variant="caption" style={s.caption}>
                  TRAFFIC ETA
                </Text>
                <Text variant="bodyEmphasis" style={s.etaValue}>
                  8 mins away
                </Text>
              </View>
            </View>
            <DarkButton
              label="Call Driver Now"
              icon={<PhoneCall color="#FFFFFF" size={16} />}
              onPress={() => void Linking.openURL("tel:9876543210")}
            />
          </View>

          <View style={s.hospitalCard}>
            <Text variant="caption" style={s.hospitalBadge}>
              NEAREST EMERGENCY HOSPITAL
            </Text>
            <Text variant="cardHeading" style={s.hospitalName}>
              Victoria Government Hospital
            </Text>
            <Text variant="body" style={s.hospitalAddress}>
              Ft. Victoria Rd, Shivajinagar, Bengaluru
            </Text>
            <View style={s.capacityPill}>
              <View style={s.openDot} />
              <Text variant="body" style={s.capacityStrong}>
                ER Open
              </Text>
              <Text variant="body" style={s.capacityText}>
                •
              </Text>
              <Text variant="body" style={s.capacityText}>
                200 Beds Available
              </Text>
              <Text variant="body" style={s.capacityText}>
                •
              </Text>
              <Text variant="body" style={s.capacityText}>
                ~1 min drive
              </Text>
            </View>
            <View style={s.hospitalActions}>
              <DarkButton
                compact
                label="Call ER"
                icon={<Phone color="#FFFFFF" size={14} />}
                onPress={() => void Linking.openURL("tel:108")}
              />
              <Pressable style={s.directionButton}>
                <ArrowRight color="#0C2434" size={15} />
                <Text variant="body" style={s.directionText}>
                  Directions
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={s.warning}>
            <AlertCircle color="rgba(255,255,255,0.63)" size={16} />
            <Text variant="body" style={s.warningText}>
              Emergency contacts will be updated automatically with your active
              status, location details and hospital route map.
            </Text>
          </View>
        </View>

        <View style={s.bottomActions}>
          <View style={s.hotlineRow}>
            <Hotline
              label="Ambulance 108"
              onPress={() => void Linking.openURL("tel:108")}
            />
            <Hotline label="Emergency 112" onPress={onCallEmergency} />
          </View>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [s.cancel, pressed && s.pressed]}
          >
            <Text variant="body" style={s.cancelText}>
              I'm Safe — Cancel Emergency
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
