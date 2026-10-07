import { StyleSheet, Text, View } from "react-native";
import { Button, Loader, useToastFeedback } from "@startup/mobile-ui";
import type { MyAmbulanceBooking } from "@startup/contracts";

export function LiveAmbulanceRequestsList({
  bookings,
  isLoading,
  error,
  onRefresh,
  activeBookingId,
  trackingData,
  pinVisible,
  isPinLoading,
  pinData,
  isRefreshPending,
  onRefreshDispatch,
  isCancelPending,
  onCancel,
}: {
  bookings?: MyAmbulanceBooking[];
  isLoading: boolean;
  error: unknown;
  onRefresh: () => void;
  activeBookingId?: string;
  trackingData?: { latitude: number; longitude: number; received_at: string } | null;
  pinVisible: boolean;
  isPinLoading: boolean;
  pinData?: string | null;
  isRefreshPending: boolean;
  onRefreshDispatch: (bookingId: string) => void;
  isCancelPending: boolean;
  onCancel: (booking: MyAmbulanceBooking) => void;
}) {
  useToastFeedback({ error: error ? "Could not load your ambulance requests." : "" });
  return (
    <>
      <Text style={styles.title}>My requests</Text>
      <Button
        label="Refresh status"
        variant="outline"
        onPress={onRefresh}
      />
      {isLoading ? <Loader theme="patient" style={{ minHeight: 44 }} /> : null}
      {bookings?.map((booking) => (
        <View key={booking.id} style={styles.card}>
          <Text style={styles.name}>
            {booking.public_code} · {booking.status}
          </Text>
          <Text>
            {booking.capability_code} · {booking.pickup_address} →{" "}
            {booking.destination_address}
          </Text>
          {booking.driver_name ? (
            <Text>
              Driver: {booking.driver_name} · {booking.vehicle_registration}
            </Text>
          ) : null}
          {booking.trip_status ? (
            <Text>Trip: {booking.trip_status}</Text>
          ) : null}
          {booking.id === activeBookingId &&
          booking.status === "assigned" ? (
            trackingData ? (
              <Text>
                Driver location: {trackingData.latitude.toFixed(5)},{" "}
                {trackingData.longitude.toFixed(5)} · updated{" "}
                {new Date(trackingData.received_at).toLocaleTimeString()}
              </Text>
            ) : (
              <Text>Waiting for a current driver location.</Text>
            )
          ) : null}
          {booking.id === activeBookingId && pinVisible ? (
            <View style={styles.card}>
              <Text style={styles.subtitle}>Your completion PIN</Text>
              {isPinLoading ? (
                <Loader theme="patient" style={{ minHeight: 36 }} />
              ) : null}
              {pinData ? (
                <Text
                  accessibilityLabel="Four-digit completion PIN"
                  style={styles.pin}
                >
                  {pinData}
                </Text>
              ) : null}
              <Text>
                Give this PIN to the driver only when you reach your
                destination.
              </Text>
            </View>
          ) : null}
          {booking.status === "searching" ? (
            <View style={styles.options}>
              <Button
                label="Search again"
                variant="outline"
                disabled={isRefreshPending}
                onPress={() => onRefreshDispatch(booking.id)}
              />
              <Button
                label="Cancel request"
                variant="outline"
                disabled={isCancelPending}
                onPress={() => onCancel(booking)}
              />
            </View>
          ) : null}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 18, fontWeight: "600" },
  options: { flexDirection: "row", gap: 8 },
  card: {
    padding: 16,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8E4E8",
  },
  name: { fontSize: 17, fontWeight: "600" },
  pin: { fontSize: 30, letterSpacing: 8, fontWeight: "700" },
});
