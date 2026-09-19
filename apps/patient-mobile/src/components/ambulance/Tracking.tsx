import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Clock3,
  Info,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, Card } from "@startup/mobile-ui";
import type { TrackingStage } from "../../types/ambulance";
import {
  ambulanceTrip,
  trackingMapImage,
} from "../../utils/ambulanceConstants";
import { EmergencyModeCard } from "./EmergencyModeCard";

export function Tracking({
  stage,
  emergency,
  onEmergencyChange,
  onCancel,
  onProceedToPayment,
}: {
  stage: TrackingStage;
  emergency: boolean;
  onEmergencyChange: (value: boolean) => void;
  onCancel: () => void;
  onProceedToPayment?: () => void;
}) {
  if (stage === "hospital") {
    return (
      <HospitalJourney
        emergency={emergency}
        onEmergencyChange={onEmergencyChange}
        onProceedToPayment={onProceedToPayment}
      />
    );
  }
  const arrived = stage === "arrived";

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.trackingTitle}>
        {arrived ? "Ambulance Arrived" : "Ambulance on the Way"}
      </Text>

      <View style={styles.mapFrame}>
        <Image
          source={trackingMapImage}
          resizeMode="cover"
          style={styles.trackingMap}
        />
      </View>

      <View
        style={[
          styles.statusBanner,
          arrived ? styles.statusBannerArrived : styles.statusBannerWay,
        ]}
      >
        {arrived ? (
          <MapPin color={colors.patient.primaryDark} size={18} />
        ) : (
          <Clock3 color={colors.patient.primaryDark} size={18} />
        )}
        <Text style={styles.statusText}>
          {arrived
            ? "Ambulance reached your pickup location"
            : "Driver is on the way • Arriving in 5 min"}
        </Text>
      </View>

      <EmergencyModeCard
        emergency={emergency}
        onEmergencyChange={onEmergencyChange}
        style={styles.emergencyCardReset}
      />

      <PinRow />

      <DriverCard name={ambulanceTrip.driver} />

      <TripCard eta="9 min" distance="4.6 km" title="Trip Details" />

      {arrived ? <TripControls /> : null}

      <SafetyCard />

      <Button
        label="Cancel Booking"
        onPress={onCancel}
        variant="secondary"
        style={styles.cancelButton}
        labelStyle={styles.cancelLabel}
      />
    </ScrollView>
  );
}

function HospitalJourney({
  emergency,
  onEmergencyChange,
  onProceedToPayment,
}: {
  emergency: boolean;
  onEmergencyChange: (value: boolean) => void;
  onProceedToPayment?: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.reachingHeader}>
        <View style={styles.reachingTitleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.reachingTitle}>Reaching Hospital</Text>
        </View>
        <Text style={styles.reachingSubtitle}>
          Patient onboard • Driver is en route to emergency ward
        </Text>
      </View>

      <View style={styles.liveMapWrap}>
        <Image
          source={trackingMapImage}
          resizeMode="cover"
          style={styles.liveMap}
        />
        <View style={styles.liveBadge}>
          <View style={styles.liveWhiteDot} />
          <Text style={styles.liveText}>LIVE ROUTE</Text>
        </View>
      </View>

      <EmergencyModeCard
        emergency={emergency}
        onEmergencyChange={onEmergencyChange}
        style={styles.emergencyCardReset}
      />

      <TripCard
        eta="7 min"
        distance="3.2 km"
        title="Hospital Destination"
      />

      <DriverCard name={ambulanceTrip.driver} />

      <TripControls />

      <SafetyCard />

      {onProceedToPayment ? (
        <Button
          label="Arrived at Hospital • View Emergency Handover"
          variant="primary"
          theme="patient"
          onPress={onProceedToPayment}
          style={styles.proceedButton}
        />
      ) : null}
    </ScrollView>
  );
}

function PinRow() {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      borderWidth={1}
      borderColor="#E0E5EB"
      backgroundColor={colors.white}
      gap={16}
      padding={18}
      style={styles.centeredCard}
    >
      <View style={styles.otpNotice}>
        <Info color={colors.patient.primaryDark} size={20} />
        <Text style={styles.infoText}>
          Share this OTP when the ambulance driver arrives.
        </Text>
      </View>
      <View style={styles.otpRow}>
        {ambulanceTrip.pin.split("").map((digit, index) => (
          <View key={`${digit}-${index}`} style={styles.otpCell}>
            <Text style={styles.otpText}>{digit}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function DriverCard({ name }: { name: string }) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      borderWidth={1}
      borderColor="#E0E5EB"
      backgroundColor={colors.white}
      padding={16}
      style={styles.driverCard}
    >
      <View style={styles.avatar}>
        <UserRound color={colors.white} size={24} />
      </View>
      <View style={styles.driverCopy}>
        <View style={styles.driverNameRow}>
          <Text style={styles.driverName}>{name}</Text>
          <View style={styles.ratingBadge}>
            <Star color="#F59E0B" fill="#F59E0B" size={11} />
            <Text style={styles.driverRating}>{ambulanceTrip.rating}</Text>
          </View>
        </View>
        <Text style={styles.vehicle}>
          {ambulanceTrip.vehicle} • {ambulanceTrip.service}
        </Text>
      </View>
      <Pressable
        onPress={() => void Linking.openURL("tel:9876543210")}
        style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Call driver"
      >
        <Phone color={colors.white} size={18} />
      </Pressable>
    </Card>
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
    <Card
      variant="outlined"
      borderRadius={radius.md}
      borderWidth={1}
      borderColor="#E0E5EB"
      backgroundColor={colors.white}
      padding={16}
      gap={14}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.tripTitle}>{title}</Text>
        <Info color={colors.patient.textSecondary} size={16} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{eta}</Text>
          <Text style={styles.statLabel}>ETA</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{distance}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>₹{ambulanceTrip.fare}</Text>
          <Text style={styles.statLabel}>Est. Fare</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.routeContainer}>
        {/* Pickup Row */}
        <View style={styles.routeStopRow}>
          <View style={styles.stopIndicatorWrapper}>
            <View style={styles.pickupHalo}>
              <View style={styles.pickupCore} />
            </View>
            <View style={styles.connectorLine} />
          </View>
          <View style={styles.stopTextContent}>
            <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
            <Text style={styles.routeAddress}>{ambulanceTrip.pickup}</Text>
            <Text style={styles.routeSubtext}>Current patient location</Text>
          </View>
        </View>

        {/* Dropoff Row */}
        <View style={styles.routeStopRow}>
          <View style={styles.stopIndicatorWrapper}>
            <View style={styles.dropHalo}>
              <View style={styles.dropCore} />
            </View>
          </View>
          <View style={styles.stopTextContent}>
            <Text style={styles.routeLabel}>HOSPITAL DESTINATION</Text>
            <Text style={styles.routeAddress}>{ambulanceTrip.dropoff}</Text>
            <Text style={styles.routeSubtext}>
              Emergency & Trauma Care Entrance
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.serviceRow}>
        <Text style={styles.serviceLabel}>Ambulance Service</Text>
        <Text style={styles.serviceValue}>{ambulanceTrip.service}</Text>
      </View>
    </Card>
  );
}

function TripControls() {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      borderWidth={1}
      borderColor="#E0E5EB"
      backgroundColor={colors.white}
      padding={16}
      gap={10}
    >
      <Text style={styles.cardTitle}>Trip Controls</Text>
      <Button
        label="Share Live Location"
        variant="secondary"
        theme="patient"
        leftIcon={<Share2 color={colors.patient.primaryDark} size={16} />}
        onPress={() => {}}
        style={styles.shareButton}
        labelStyle={styles.shareText}
      />
    </Card>
  );
}

function SafetyCard() {
  return (
    <View style={styles.wellnessBanner}>
      <View style={styles.wellnessIcon}>
        <ShieldCheck color={colors.white} size={20} />
      </View>
      <View style={styles.wellnessCopy}>
        <Text style={styles.wellnessTitle}>Your safety is our priority</Text>
        <Text style={styles.infoText}>
          GPS tracked with certified paramedic crew on standby.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  content: {
    gap: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 60,
  },
  trackingTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  mapFrame: {
    width: "100%",
    height: 195,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E5EB",
    backgroundColor: colors.patient.surface,
    elevation: 0,
    shadowOpacity: 0,
  },
  trackingMap: {
    width: "100%",
    height: "100%",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  statusBannerWay: {
    backgroundColor: colors.patient.surface,
    borderColor: "#C8EDE9",
  },
  statusBannerArrived: {
    backgroundColor: "#E6F7ED",
    borderColor: "#A7F3D0",
  },
  statusText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
  },
  emergencyCardReset: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  centeredCard: {
    alignItems: "center",
    elevation: 0,
    shadowOpacity: 0,
  },
  otpNotice: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  infoText: {
    flex: 1,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  otpRow: {
    flexDirection: "row",
    gap: 12,
  },
  otpCell: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F4F8F7",
    borderWidth: 1,
    borderColor: "#E0E5EB",
  },
  otpText: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    fontWeight: "700",
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    elevation: 0,
    shadowOpacity: 0,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.patient.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  driverCopy: {
    flex: 1,
    gap: 3,
  },
  driverNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  driverName: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: "#FEF3C7",
  },
  driverRating: {
    color: "#92400E",
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: "700",
  },
  vehicle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  callButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: colors.patient.primaryDark,
  },
  cardTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tripTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E0E5EB",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E5EB",
  },
  routeContainer: {
    gap: 2,
    paddingVertical: 2,
  },
  routeStopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stopIndicatorWrapper: {
    width: 24,
    alignItems: "center",
    paddingTop: 3,
  },
  pickupHalo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E6F4EA",
    borderWidth: 1.5,
    borderColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669",
  },
  connectorLine: {
    width: 2,
    height: 38,
    backgroundColor: "#CBD5E1",
    marginVertical: 3,
  },
  dropHalo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FEE2E2",
    borderWidth: 1.5,
    borderColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  dropCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  stopTextContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 6,
    gap: 2,
  },
  routeLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  routeAddress: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  routeSubtext: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  serviceValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: "700",
  },
  shareButton: {
    minHeight: 48,
    borderRadius: radius.md,
  },
  shareText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "600",
  },
  wellnessBanner: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
    borderWidth: 1,
    borderColor: "#C8EDE9",
    elevation: 0,
    shadowOpacity: 0,
  },
  wellnessIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.patient.primaryDark,
  },
  wellnessCopy: {
    flex: 1,
    gap: 2,
  },
  wellnessTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: "700",
  },
  cancelButton: {
    minHeight: 52,
    borderRadius: radius.md,
    elevation: 0,
    shadowOpacity: 0,
  },
  cancelLabel: {
    fontSize: 15,
  },
  proceedButton: {
    minHeight: 52,
    borderRadius: radius.md,
    elevation: 0,
    shadowOpacity: 0,
  },
  reachingHeader: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  reachingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  reachingTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: "700",
  },
  reachingSubtitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    textAlign: "center",
  },
  liveMapWrap: {
    position: "relative",
    width: "100%",
    height: 195,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E5EB",
    backgroundColor: colors.patient.surface,
    elevation: 0,
    shadowOpacity: 0,
  },
  liveMap: {
    width: "100%",
    height: "100%",
  },
  liveBadge: {
    position: "absolute",
    top: 11,
    left: 12,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: "#EF4444",
  },
  liveWhiteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  liveText: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
