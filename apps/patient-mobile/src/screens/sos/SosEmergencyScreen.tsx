import { useEffect, useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  AlertCircle,
  Ambulance,
  ArrowRight,
  Phone,
  PhoneCall,
  Siren,
  Star,
} from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { SafeAreaView } from "@startup/mobile-ui";
import type { SosEmergencyScreenProps } from "../../types/sos";

export function SosEmergencyScreen({
  onCancel,
  onCallEmergency,
}: SosEmergencyScreenProps) {
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDispatched(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  if (!dispatched) return <ActivatingSos />;

  return (
    <LinearGradient colors={["#3A0508", "#1A0102"]} style={s.screen}>
      <SafeAreaView edges={["top", "bottom"]} style={s.safeArea}>
        <View style={s.header}>
          <View style={s.sirenCircle}>
            <Siren color="#FFFFFF" size={20} />
          </View>
          <Text style={s.headerTitle}>EMERGENCY ACTIVATED</Text>
        </View>

        <View style={s.content}>
          <View style={s.driverCard}>
            <View style={s.driverTop}>
              <View style={s.avatar}><Text style={s.avatarText}>SN</Text></View>
              <View style={s.driverCopy}>
                <Text style={s.driverName}>Suresh Nair</Text>
                <Text style={s.driverMeta}>KA02CD5678 • BLS Ambulance</Text>
              </View>
              <View style={s.rating}><Star color="#C0392B" size={11} /><Text style={s.ratingText}>4.6</Text></View>
            </View>
            <View style={s.etaRow}>
              <View><Text style={s.caption}>DISTANCE</Text><Text style={s.etaValue}>5.1 km</Text></View>
              <View><Text style={s.caption}>TRAFFIC ETA</Text><Text style={s.etaValue}>8 mins away</Text></View>
            </View>
            <DarkButton
              label="Call Driver Now"
              icon={<PhoneCall color="#FFFFFF" size={16} />}
              onPress={() => void Linking.openURL("tel:9876543210")}
            />
          </View>

          <View style={s.hospitalCard}>
            <Text style={s.hospitalBadge}>NEAREST EMERGENCY HOSPITAL</Text>
            <Text style={s.hospitalName}>Victoria Government Hospital</Text>
            <Text style={s.hospitalAddress}>
              Ft. Victoria Rd, Shivajinagar, Bengaluru
            </Text>
            <View style={s.capacityPill}>
              <View style={s.openDot} />
              <Text style={s.capacityStrong}>ER Open</Text>
              <Text style={s.capacityText}>•</Text>
              <Text style={s.capacityText}>200 Beds Available</Text>
              <Text style={s.capacityText}>•</Text>
              <Text style={s.capacityText}>~1 min drive</Text>
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
                <Text style={s.directionText}>Directions</Text>
              </Pressable>
            </View>
          </View>

          <View style={s.warning}>
            <AlertCircle color="rgba(255,255,255,0.63)" size={16} />
            <Text style={s.warningText}>
              Emergency contacts will be updated automatically with your active
              status, location details and hospital route map.
            </Text>
          </View>
        </View>

        <View style={s.bottomActions}>
          <View style={s.hotlineRow}>
            <Hotline label="Ambulance 108" onPress={() => void Linking.openURL("tel:108")} />
            <Hotline label="Emergency 112" onPress={onCallEmergency} />
          </View>
          <Pressable onPress={onCancel} style={({ pressed }) => [s.cancel, pressed && s.pressed]}>
            <Text style={s.cancelText}>I'm Safe — Cancel Emergency</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ActivatingSos() {
  return (
    <LinearGradient colors={["#F23F47", "#C9161D"]} style={s.activation}>
      <View style={s.activationGraphic}>
        <View style={s.activationOuter}>
          <View style={s.activationInner}>
            <Ambulance color="#FFFFFF" size={44} />
          </View>
        </View>
      </View>
      <Text style={s.activationTitle}>EMERGENCY ACTIVATED</Text>
      <Text style={s.activationCopy}>Getting your precise location...</Text>
    </LinearGradient>
  );
}

function DarkButton({
  label,
  icon,
  onPress,
  compact,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.darkButton,
        compact && s.darkButtonCompact,
        pressed && s.pressed,
      ]}
    >
      {icon}
      <Text style={s.darkButtonText}>{label}</Text>
    </Pressable>
  );
}

function Hotline({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.hotline, pressed && s.pressed]}>
      <Text style={s.hotlineText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  safeArea: { flex: 1, justifyContent: "space-between" },
  pressed: { opacity: 0.72 },
  header: { height: 63, flexDirection: "row", alignItems: "center", paddingHorizontal: 66, gap: 16 },
  sirenCircle: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#EF3B43" },
  headerTitle: { color: "#FFFFFF", fontFamily: fontFamilies.bold, fontSize: 16, fontWeight: "700" },
  content: { flex: 1, gap: 23, paddingHorizontal: 20, paddingTop: 16 },
  driverCard: { height: 209, padding: 16, borderRadius: 16, backgroundColor: "#FFFFFF" },
  driverTop: { height: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 7 },
  avatar: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "#EEF4F5" },
  avatarText: { color: "#0C2434", fontFamily: fontFamilies.semibold, fontSize: 14 },
  driverCopy: { flex: 1, gap: 3 },
  driverName: { color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 14 },
  driverMeta: { color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 12 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: "#EEF4F5" },
  ratingText: { color: "#0C2434", fontFamily: fontFamilies.semibold, fontSize: 11 },
  etaRow: { height: 55, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 7 },
  caption: { color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 11 },
  etaValue: { marginTop: 3, color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 14 },
  darkButton: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, backgroundColor: "#07595D" },
  darkButtonCompact: { flex: 1, height: 40 },
  darkButtonText: { color: "#FFFFFF", fontFamily: fontFamilies.bold, fontSize: 13 },
  hospitalCard: { height: 216, paddingHorizontal: 16, paddingTop: 27, borderRadius: 16, backgroundColor: "#FFFFFF" },
  hospitalBadge: { marginLeft: 9, color: "#C0392B", fontFamily: fontFamilies.bold, fontSize: 10, letterSpacing: 0.5 },
  hospitalName: { marginTop: 16, marginLeft: 9, color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 15 },
  hospitalAddress: { marginTop: 5, marginLeft: 9, color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 12 },
  capacityPill: { height: 32, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 17, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#FDF2F2" },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF3B43" },
  capacityStrong: { color: "#0C2434", fontFamily: fontFamilies.semibold, fontSize: 12 },
  capacityText: { color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 11 },
  hospitalActions: { flexDirection: "row", gap: 9, marginTop: 17 },
  directionButton: { flex: 1, height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#D7E3E5", borderRadius: 10 },
  directionText: { color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 13 },
  warning: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 10 },
  warningText: { flex: 1, color: "rgba(255,255,255,0.63)", fontFamily: fontFamilies.regular, fontSize: 11, lineHeight: 16 },
  bottomActions: { gap: 16, paddingHorizontal: 20, paddingBottom: 16 },
  hotlineRow: { flexDirection: "row", gap: 12 },
  hotline: { flex: 1, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#EF3B43" },
  hotlineText: { color: "#FFFFFF", fontFamily: fontFamilies.semibold, fontSize: 12 },
  cancel: { height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#C0392B", borderRadius: 12 },
  cancelText: { color: "#C0392B", fontFamily: fontFamilies.bold, fontSize: 14 },
  activation: { flex: 1, alignItems: "center", paddingTop: 107 },
  activationGraphic: { width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  activationOuter: { width: 120, height: 120, alignItems: "center", justifyContent: "center", borderRadius: 60, backgroundColor: "rgba(255,255,255,0.08)" },
  activationInner: { width: 92, height: 90, alignItems: "center", justifyContent: "center", borderRadius: 45, backgroundColor: "rgba(255,255,255,0.13)" },
  activationTitle: { marginTop: 80, color: colors.white, fontFamily: fontFamilies.bold, fontSize: 24, fontWeight: "800", letterSpacing: 0.5, textAlign: "center" },
  activationCopy: { marginTop: 16, color: "rgba(255,255,255,0.8)", fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 22, textAlign: "center" },
});
