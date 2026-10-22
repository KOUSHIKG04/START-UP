import { styles } from "./Tracking.styles";

import type { TripCardProps } from "../types/trip-card";
import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { Info } from "lucide-react-native";
import { colors, radius } from "@startup/design-tokens";
import { Card } from "@startup/mobile-ui";
export function TripCard({ title, booking }: TripCardProps) {
  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      backgroundColor={colors.white}
      padding={16}
      gap={14}
    >
      <View style={styles.tripHeader}>
        <Text variant="cardHeading" style={styles.tripTitle}>
          {title}
        </Text>
        <Info color={colors.patient.textSecondary} size={16} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="bodyEmphasis" style={styles.statValue}>
            Pending
          </Text>
          <Text variant="label" style={styles.statLabel}>
            ETA
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text variant="bodyEmphasis" style={styles.statValue}>
            Pending
          </Text>
          <Text variant="label" style={styles.statLabel}>
            Distance
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text variant="bodyEmphasis" style={styles.statValue}>
            Pending
          </Text>
          <Text variant="label" style={styles.statLabel}>
            Est. Fare
          </Text>
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
            <Text variant="label" style={styles.routeLabel}>
              PICKUP LOCATION
            </Text>
            <Text variant="body" style={styles.routeAddress}>
              {booking.pickup_address ?? "Pickup location pending"}
            </Text>
            <Text variant="body" style={styles.routeSubtext}>
              Confirmed pickup
            </Text>
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
            <Text variant="label" style={styles.routeLabel}>
              HOSPITAL DESTINATION
            </Text>
            <Text variant="body" style={styles.routeAddress}>
              {booking.destination_address ?? "Hospital pending"}
            </Text>
            <Text variant="body" style={styles.routeSubtext}>
              Selected destination
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.serviceRow}>
        <Text variant="label" style={styles.serviceLabel}>
          Ambulance Service
        </Text>
        <Text variant="bodyEmphasis" style={styles.serviceValue}>
          {booking.capability_code}
        </Text>
      </View>
    </Card>
  );
}
