import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
  Alert,
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
import type { TrackingStage } from "../types/ambulance";
import type { ActiveAmbulanceTracking, MyAmbulanceBooking } from "@startup/contracts";
import { DriverTrackingMap } from "./DriverTrackingMap";
import { EmergencyModeCard } from "./EmergencyModeCard";

export function Tracking({
  stage,
  emergency,
  onEmergencyChange,
  onCancel,
  onProceedToPayment,
  booking,
  location,
  completionPin,
}: {
  stage: TrackingStage;
  emergency: boolean;
  onEmergencyChange: (value: boolean) => void;
  onCancel: () => void;
  onProceedToPayment?: () => void;
  booking: MyAmbulanceBooking;
  location: ActiveAmbulanceTracking | null;
  completionPin: string | null;
}) {
  if (stage === "hospital") {
    return (
      <HospitalJourney
        emergency={emergency}
        onEmergencyChange={onEmergencyChange}
        onProceedToPayment={onProceedToPayment}
        booking={booking}
        location={location}
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
        <DriverTrackingMap location={location} style={styles.trackingMap} />
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
            : location ? `Driver location updated ${new Date(location.received_at).toLocaleTimeString()}` : "Driver is on the way • Location pending"}
        </Text>
      </View>

      <EmergencyModeCard
        emergency={emergency}
        onEmergencyChange={onEmergencyChange}
        style={styles.emergencyCardReset}
      />

      <PinRow pin={completionPin} />

      <DriverCard name={booking.driver_name ?? "Driver assignment pending"} vehicle={booking.vehicle_registration} service={booking.capability_code} rating={booking.driver_rating} />

      <TripCard booking={booking} title="Trip Details" />

      {arrived ? <TripControls location={location} /> : null}

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
  booking,
  location,
}: {
  emergency: boolean;
  onEmergencyChange: (value: boolean) => void;
  onProceedToPayment?: () => void;
  booking: MyAmbulanceBooking;
  location: ActiveAmbulanceTracking | null;
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
        <DriverTrackingMap location={location} style={styles.liveMap} />
        <View style={styles.liveBadge}>
          <View style={styles.liveWhiteDot} />
          <Text style={styles.liveText}>{location ? "LOCATION RECEIVED" : "LOCATION PENDING"}</Text>
        </View>
      </View>

      <EmergencyModeCard
        emergency={emergency}
        onEmergencyChange={onEmergencyChange}
        style={styles.emergencyCardReset}
      />

      <TripCard booking={booking} title="Hospital Destination" />

      <DriverCard name={booking.driver_name ?? "Driver assignment pending"} vehicle={booking.vehicle_registration} service={booking.capability_code} rating={booking.driver_rating} />

      <TripControls location={location} />

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

function PinRow({ pin }: { pin: string | null }) {
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
          Share this PIN with the driver only when you reach your destination.
        </Text>
      </View>
      <View style={styles.otpRow}>
        {Array.from({ length: 4 }, (_, index) => pin?.[index] ?? "").map((digit, index) => (
          <View key={index} style={styles.otpCell}>
            <Text style={styles.otpText}>{digit}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function DriverCard({ name, vehicle, service, rating }: { name: string; vehicle: string | null; service: string; rating: string | null }) {
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
            <Text style={styles.driverRating}>{rating ?? "—"}</Text>
          </View>
        </View>
        <Text style={styles.vehicle}>
          {vehicle ?? "Vehicle details pending"} • {service}
        </Text>
      </View>
      <Pressable
        onPress={() => Alert.alert("Driver contact unavailable", "The driver phone number is not available for this booking yet.")}
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
  booking,
}: {
  title: string;
  booking: MyAmbulanceBooking;
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
          <Text style={styles.statValue}>Pending</Text>
          <Text style={styles.statLabel}>ETA</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>Pending</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>Pending</Text>
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
            <Text style={styles.routeAddress}>{booking.pickup_address ?? "Pickup location pending"}</Text>
            <Text style={styles.routeSubtext}>Confirmed pickup</Text>
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
            <Text style={styles.routeAddress}>{booking.destination_address ?? "Hospital pending"}</Text>
            <Text style={styles.routeSubtext}>Selected destination</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.serviceRow}>
        <Text style={styles.serviceLabel}>Ambulance Service</Text>
        <Text style={styles.serviceValue}>{booking.capability_code}</Text>
      </View>
    </Card>
  );
}

function TripControls({ location }: { location: ActiveAmbulanceTracking | null }) {
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
        onPress={() => {
          if (!location) { Alert.alert("Location pending", "A current driver location is not available yet."); return; }
          void Share.share({ message: `Ambulance location: https://maps.google.com/?q=${location.latitude},${location.longitude}` });
        }}
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
    boxShadow: "none",
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
    boxShadow: "none",
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
    boxShadow: "none",
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
    boxShadow: "none",
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
    boxShadow: "none",
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
    boxShadow: "none",
  },
  cancelLabel: {
    fontSize: 15,
  },
  proceedButton: {
    minHeight: 52,
    borderRadius: radius.md,
    boxShadow: "none",
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
    boxShadow: "none",
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
