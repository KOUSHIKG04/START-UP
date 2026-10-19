import { PinRow } from "./PinRow";
import { SafetyCard } from "./SafetyCard";
import { TripControls } from "./TripControls";
import { TripCard } from "./TripCard";
import { DriverCard } from "./DriverCard";
import { HospitalJourney } from "./HospitalJourney";
import { styles } from "./Tracking.styles";

import type { TrackingProps } from "../types/tracking";
import { AppText as Text } from "@startup/mobile-ui";
import { ScrollView, View } from "react-native";
import { Clock3, MapPin } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { Button } from "@startup/mobile-ui";

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
}: TrackingProps) {
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
      <Text variant="cardHeading" style={styles.trackingTitle}>
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
        <Text variant="body" style={styles.statusText}>
          {arrived
            ? "Ambulance reached your pickup location"
            : location
              ? `Driver location updated ${new Date(location.received_at).toLocaleTimeString()}`
              : "Driver is on the way • Location pending"}
        </Text>
      </View>

      <EmergencyModeCard
        emergency={emergency}
        onEmergencyChange={onEmergencyChange}
        style={styles.emergencyCardReset}
      />

      <PinRow pin={completionPin} />

      <DriverCard
        name={booking.driver_name ?? "Driver assignment pending"}
        vehicle={booking.vehicle_registration}
        service={booking.capability_code}
        rating={booking.driver_rating}
      />

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
