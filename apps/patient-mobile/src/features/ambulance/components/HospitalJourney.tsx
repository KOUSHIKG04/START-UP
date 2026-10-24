import { SafetyCard } from "./SafetyCard";
import { TripControls } from "./TripControls";
import { TripCard } from "./TripCard";
import { DriverCard } from "./DriverCard";
import { styles } from "./Tracking.styles";

import type { HospitalJourneyProps } from "../types/hospital-journey";
import { AppText as Text } from "@startup/mobile-ui";
import { ScrollView, View } from "react-native";
import { Button } from "@startup/mobile-ui";
import { DriverTrackingMap } from "./DriverTrackingMap";
import { EmergencyModeCard } from "./EmergencyModeCard";

export function HospitalJourney({
  emergency,
  onEmergencyChange,
  onProceedToPayment,
  booking,
  location,
}: HospitalJourneyProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.reachingHeader}>
        <View style={styles.reachingTitleRow}>
          <View style={styles.liveDot} />
          <Text variant="cardHeading" style={styles.reachingTitle}>
            Reaching Hospital
          </Text>
        </View>
        <Text variant="cardHeading" style={styles.reachingSubtitle}>
          Patient onboard • Driver is en route to emergency ward
        </Text>
      </View>

      <View style={styles.liveMapWrap}>
        <DriverTrackingMap location={location} style={styles.liveMap} />
        <View style={styles.liveBadge}>
          <View style={styles.liveWhiteDot} />
          <Text variant="body" style={styles.liveText}>
            {location ? "LOCATION RECEIVED" : "LOCATION PENDING"}
          </Text>
        </View>
      </View>

      <EmergencyModeCard
        emergency={emergency}
        onEmergencyChange={onEmergencyChange}
        style={styles.emergencyCardReset}
      />

      <TripCard booking={booking} title="Hospital Destination" />

      <DriverCard
        name={booking.driver_name ?? "Driver assignment pending"}
        vehicle={booking.vehicle_registration}
        service={booking.capability_code}
        rating={booking.driver_rating}
      />

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
