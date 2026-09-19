import type { ReactNode } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  Info,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react-native";
import { fontFamilies, shadows } from "@startup/design-tokens";
import type { TrackingStage } from "../../types/ambulance";
import {
  ambulanceTrip,
  trackingMapImage,
} from "../../utils/ambulanceConstants";

export function Tracking({
  stage,
  emergency,
  onEmergencyChange,
  onCancel,
}: {
  stage: TrackingStage;
  emergency: boolean;
  onEmergencyChange: (value: boolean) => void;
  onCancel: () => void;
}) {
  if (stage === "hospital") return <HospitalJourney />;
  const arrived = stage === "arrived";
  return (
    <ScrollView
      contentContainerStyle={styles.trackingContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.trackingTitle}>
        {arrived ? "Arrived at the location" : "Ambulance on the way"}
      </Text>
      <Image
        source={trackingMapImage}
        resizeMode="cover"
        style={styles.trackingMap}
      />
      <Text style={styles.blueStatus}>
        {arrived
          ? "Reached your location"
          : "Driver is on the way, Will reach in 5 min"}
      </Text>
      <View style={styles.trackEmergencyRow}>
        <View style={styles.trackEmergencyPill}>
          <Text style={styles.emergencyText}>Emergency</Text>
        </View>
        <Switch
          value={emergency}
          onValueChange={onEmergencyChange}
          trackColor={{ false: "#D8E3E6", true: "#8DCFC8" }}
          thumbColor="#FFFFFF"
        />
      </View>
      <PinRow />
      <DriverCard name="Driver" />
      <TripCard eta="9 min" distance="4.6 km" title="Trip Details" />
      {arrived ? <TripControls /> : null}
      <Pressable onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel Appointment</Text>
      </Pressable>
      {arrived ? <SafetyCard /> : null}
    </ScrollView>
  );
}

function HospitalJourney() {
  return (
    <ScrollView
      contentContainerStyle={styles.hospitalContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.reachingRow}>
        <View style={styles.liveDot} />
        <Text style={styles.reachingTitle}>Reaching Hospital</Text>
      </View>
      <Text style={styles.reachingSubtitle}>Driver is currently en route</Text>
      <View style={styles.liveMapWrap}>
        <Image
          source={trackingMapImage}
          resizeMode="cover"
          style={styles.liveMap}
        />
        <View style={styles.liveBadge}>
          <View style={styles.liveWhiteDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <TripCard eta="7 min" distance="3.2 km" title="Estimated Arrival" />
      <DriverCard name="Rajesh Kumar" />
      <TripControls />
      <SafetyCard />
    </ScrollView>
  );
}

function PinRow() {
  return (
    <View style={styles.pinRow}>
      <View style={styles.pinLabelBox}>
        <Text style={styles.pinLabel}>PIN</Text>
      </View>
      <View style={styles.pinDigits}>
        {ambulanceTrip.pin.split("").map((digit, index) => (
          <View key={`${digit}-${index}`} style={styles.pinBox}>
            <Text style={styles.pinDigit}>{digit}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DriverCard({ name }: { name: string }) {
  return (
    <View style={styles.driverCard}>
      <View style={styles.avatar}>
        <UserRound color="#FFFFFF" size={27} />
      </View>
      <View style={styles.driverCopy}>
        <View style={styles.driverNameRow}>
          <Text style={styles.driverName}>{name}</Text>
          <Star color="#008877" size={14} />
          <Text style={styles.driverRating}>4.8</Text>
        </View>
        <Text style={styles.vehicle}>Ambulance - KA 01 AB 1234</Text>
      </View>
      <Pressable
        onPress={() => void Linking.openURL("tel:9876543210")}
        style={styles.callButton}
      >
        <Phone color="#FFFFFF" size={19} />
      </Pressable>
    </View>
  );
}

function TripCard({
  title,
  eta,
  distance,
}: {
  title: string;
  eta: string;
  distance: string;
}) {
  return (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripTitle}>{title}</Text>
        <Info color="#0C2434" size={16} />
      </View>
      <View style={styles.statsRow}>
        <Stat value={eta} label="ETA" />
        <View style={styles.statDivider} />
        <Stat value={distance} label="Distance" />
        <View style={styles.statDivider} />
        <Stat value="₹1200" label="Est. Fare" />
      </View>
      <View style={styles.divider} />
      <RoutePoint color="#009E92" label="PICKUP">
        Sriramapura, Shivamogga, Karnataka
      </RoutePoint>
      <RoutePoint color="#0C2434" label="DROP-OFF">
        Manipal Hospital, Shivamogga
      </RoutePoint>
      <View style={styles.divider} />
      <View style={styles.serviceRow}>
        <Text style={styles.serviceLabel}>Ambulance Service</Text>
        <Text style={styles.serviceValue}>Advanced Life Support</Text>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RoutePoint({
  color,
  label,
  children,
}: {
  color: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.routePoint}>
      <View style={[styles.routeDot, { backgroundColor: color }]} />
      <View style={styles.routeCopy}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.routeValue}>
          {children}
        </Text>
      </View>
    </View>
  );
}

function TripControls() {
  return (
    <View style={styles.controls}>
      <Text style={styles.controlsTitle}>Trip Controls</Text>
      <Pressable style={styles.shareButton}>
        <Share2 color="#0C2434" size={16} />
        <Text style={styles.shareText}>Share Live Location</Text>
      </Pressable>
    </View>
  );
}

function SafetyCard() {
  return (
    <View style={styles.safetyCard}>
      <ShieldCheck color="#008877" size={20} />
      <View style={styles.safetyCopy}>
        <Text style={styles.safetyTitle}>Your safety is our priority</Text>
        <Text style={styles.safetySubtitle}>Share trip status with family</Text>
      </View>
      <Share2 color="#008877" size={17} />
    </View>
  );
}

const styles = StyleSheet.create({
  emergencyText: {
    color: "#087F78",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  trackingContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 122,
  },
  trackingTitle: {
    marginBottom: 11,
    color: "#008877",
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  trackingMap: { width: "100%", height: 211, borderRadius: 12 },
  blueStatus: {
    marginTop: 10,
    color: "#3B82F6",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    textAlign: "center",
  },
  trackEmergencyRow: {
    height: 61,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  trackEmergencyPill: {
    minWidth: 117,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#D7E3E5",
  },
  pinRow: {
    height: 61,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 6,
  },
  pinLabelBox: {
    width: 119,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#07595D",
  },
  pinLabel: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  pinDigits: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  pinBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.19)",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  pinDigit: {
    color: "#000000",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  driverCard: {
    height: 84,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 6,
    marginTop: 2,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  avatar: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "#008877",
  },
  driverCopy: { flex: 1, marginLeft: 26 },
  driverNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  driverName: { color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 16 },
  driverRating: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  vehicle: {
    marginTop: 5,
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  callButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#008877",
  },
  tripCard: {
    marginHorizontal: 2,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  tripTitle: { color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 14 },
  statsRow: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  stat: { flex: 1, alignItems: "center", gap: 5 },
  statValue: { color: "#008877", fontFamily: fontFamilies.bold, fontSize: 18 },
  statLabel: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  statDivider: { width: 1, height: 32, backgroundColor: "#D7E3E5" },
  divider: { height: 1, marginVertical: 8, backgroundColor: "#E3E9EA" },
  routePoint: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 9,
  },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeCopy: { flex: 1, gap: 2 },
  routeLabel: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  routeValue: {
    color: "#0C2434",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 9,
  },
  serviceLabel: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  serviceValue: {
    color: "#0C2434",
    fontFamily: fontFamilies.bold,
    fontSize: 12,
  },
  controls: {
    gap: 12,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 16,
  },
  controlsTitle: {
    color: "#0C2434",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
  },
  shareButton: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D7E3E5",
    borderRadius: 12,
  },
  shareText: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
  },
  cancelButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0,136,119,0.1)",
  },
  cancelText: {
    color: "rgba(0,136,119,0.8)",
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  safetyCard: {
    minHeight: 69,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#E8F7F4",
  },
  safetyCopy: { flex: 1, gap: 2 },
  safetyTitle: {
    color: "#008877",
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
  },
  safetySubtitle: {
    color: "#008877",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  hospitalContent: {
    paddingHorizontal: 20,
    paddingTop: 19,
    paddingBottom: 122,
  },
  reachingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF3B43",
  },
  reachingTitle: {
    color: "#087F78",
    fontFamily: fontFamilies.bold,
    fontSize: 20,
  },
  reachingSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: "#008877",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: "center",
  },
  liveMapWrap: { position: "relative" },
  liveMap: { width: "100%", height: 191, borderRadius: 14 },
  liveBadge: {
    position: "absolute",
    top: 11,
    left: 12,
    height: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: "#D63A32",
  },
  liveWhiteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveText: { color: "#FFFFFF", fontFamily: fontFamilies.bold, fontSize: 9 },
});
