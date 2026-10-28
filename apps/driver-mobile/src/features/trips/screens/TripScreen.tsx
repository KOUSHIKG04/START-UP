import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Check, MessageCircle, Phone, User } from "lucide-react-native";
import { Button, Input, Loader } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
  PageHeader,
} from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";
import { useDriverTrip } from "../hooks/useDriverTrip";
import { tripStageLabels, tripNextActions } from "../utils/tripConstants";
import { TripPayment } from "../components/TripPayment";

export function TripScreen() {
  const {
    showToast,
    pin,
    setPin,
    busy,
    setCompletedId,
    trips,
    trip,
    transition,
    complete,
  } = useDriverTrip();
  if (!trip || trip.status === "cancelled")
    return (
      <View style={ui.screen}>
        <PageHeader title="Current trip" />
        <Body onRefresh={() => trips.refetch({ throwOnError: true })}>
          {trips.isLoading ? (
            <Loader theme="driver" style={{ minHeight: 96 }} />
          ) : (
            <Heading>No active trip</Heading>
          )}
          {!trips.isLoading ? (
            <Button
              theme="driver"
              label="Back to Home"
              onPress={() => router.replace("/home")}
            />
          ) : null}
        </Body>
      </View>
    );
  const title = tripStageLabels[trip.status];
  return (
    <View style={ui.screen}>
      <PageHeader title={title} />
      <Body onRefresh={() => trips.refetch({ throwOnError: true })}>
        {trip.status !== "completed" ? (
          <>
            <Image
              source={require("../../../../assets/figma/trip-map.png")}
              alt="Reference route map; live navigation is not connected"
              style={styles.map}
            />
            {trip.status === "arrived_at_destination" ? (
              <View style={styles.pin}>
                <Heading>Enter Patient’s PIN to Complete</Heading>
                <Input
                  accessibilityLabel="Patient PIN"
                  value={pin}
                  onChangeText={(value) =>
                    setPin(value.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="— — — —"
                  secureTextEntry
                  style={styles.pinInput}
                />
                <View style={styles.notice}>
                  <Copy style={{ color: palette.primary }}>
                    Ask the patient for the PIN shown in their app.
                  </Copy>
                </View>
              </View>
            ) : null}
            <Card>
              {trip.status === "in_progress" ||
              trip.status === "arrived_at_destination" ? (
                <>
                  <Copy style={ui.caption}>DESTINATION HOSPITAL</Copy>
                  <Heading>
                    {trip.destination_address ?? "Destination to be confirmed"}
                  </Heading>
                  <View style={ui.divider} />
                </>
              ) : null}
              <View style={ui.row}>
                <View style={styles.avatar}>
                  <User color={palette.primary} size={24} />
                </View>
                <View style={ui.grow}>
                  <Heading>{trip.patient_name_snapshot ?? "Patient"}</Heading>
                  <Copy style={ui.caption}>
                    {trip.capability_code ?? "Service pending"}
                  </Copy>
                </View>
                {trip.status !== "in_progress" ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Call patient"
                      style={styles.action}
                      onPress={() => {
                        if (trip.contact_phone_snapshot)
                          void Linking.openURL(
                            `tel:${trip.contact_phone_snapshot}`
                          );
                        else
                          showToast({
                            title: "Patient phone unavailable",
                            type: "info",
                          });
                      }}
                    >
                      <Phone color={palette.primary} size={20} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Chat with patient"
                      style={styles.action}
                      onPress={() =>
                        showToast({
                          title:
                            "In-app messaging is not connected for this trip yet.",
                          type: "info",
                        })
                      }
                    >
                      <MessageCircle color={palette.primary} size={20} />
                    </Pressable>
                  </>
                ) : null}
              </View>
              {trip.status !== "in_progress" ? (
                <>
                  <View style={ui.divider} />
                  <Copy style={ui.caption}>PICKUP ADDRESS</Copy>
                  <Copy>
                    {trip.pickup_address ?? "Pickup location in request"}
                  </Copy>
                  {trip.status === "arrived_at_pickup" ||
                  trip.status === "arrived_at_destination" ? (
                    <>
                      <Copy style={ui.caption}>HOSPITAL DESTINATION</Copy>
                      <Copy>
                        {trip.destination_address ??
                          "Destination to be confirmed"}
                      </Copy>
                    </>
                  ) : null}
                </>
              ) : null}
            </Card>
            <Metrics
              items={
                trip.status === "heading_to_pickup"
                  ? [
                      ["—", "ETA to Patient"],
                      ["—", "Distance"],
                      ["—", "Est. Fare"],
                    ]
                  : trip.status === "arrived_at_pickup"
                    ? [
                        [trip.capability_code ?? "—", "Service Type"],
                        ["—", "Drop Distance"],
                        ["—", "Est. Time"],
                      ]
                    : [
                        ["—", "ETA"],
                        ["—", "Remaining"],
                        ["—", "Speed"],
                      ]
              }
            />
            {tripNextActions[trip.status] ? (
              <Button
                loading={busy}
                theme="driver"
                label={busy ? "Updating…" : tripNextActions[trip.status]!.label}
                style={ui.button}
                disabled={busy}
                onPress={() =>
                  void transition(trip, tripNextActions[trip.status]!.action)
                }
              />
            ) : null}
            {trip.status === "arrived_at_destination" ? (
              <Button
                loading={busy}
                theme="driver"
                label={busy ? "Verifying…" : "Verify PIN & complete trip"}
                style={ui.button}
                disabled={busy || !/^\d{4}$/.test(pin)}
                onPress={() => void complete(trip)}
              />
            ) : null}
            <Copy style={[ui.caption, { textAlign: "center" }]}>
              Route map is a reference image until live navigation is connected.
            </Copy>
          </>
        ) : (
          <>
            <View style={[ui.center, { paddingVertical: 16 }]}>
              <View style={styles.check}>
                <Check size={32} color={palette.primary} />
              </View>
              <Heading>Trip Completed Successfully!</Heading>
              <Copy style={ui.caption}>Your trip summary is ready</Copy>
            </View>
            <Card>
              <Copy style={ui.caption}>TRIP SUMMARY RECEIPT</Copy>
              <View style={ui.divider} />
              {[
                ["Pickup Location", trip.pickup_address ?? "—"],
                ["Drop-off Location", trip.destination_address ?? "—"],
                [
                  "Total Distance",
                  trip.distance_meters === null
                    ? "Pending"
                    : `${(Number(trip.distance_meters) / 1000).toFixed(1)} km`,
                ],
                [
                  "Ride Duration",
                  trip.started_at && trip.completed_at
                    ? `${Math.max(0, Math.round((new Date(trip.completed_at).getTime() - new Date(trip.started_at).getTime()) / 60000))} min`
                    : "—",
                ],
                ["Ambulance Service", trip.capability_code ?? "—"],
              ].map(([label, value]) => (
                <View key={label} style={ui.between}>
                  <Copy style={{ color: palette.muted }}>{label}</Copy>
                  <Copy style={{ fontWeight: "600" }}>{value}</Copy>
                </View>
              ))}
            </Card>
            <TripPayment bookingId={trip.booking_id} />
            <Button
              theme="driver"
              label="Back to Home"
              onPress={() => {
                setCompletedId(null);
                router.replace("/home");
              }}
            />
            <Button
              theme="driver"
              variant="outline"
              label="View earnings"
              onPress={() => router.navigate("/earnings")}
            />
          </>
        )}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", height: 303, borderRadius: 12, resizeMode: "cover" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  pin: { alignItems: "center", gap: 14, paddingVertical: 8 },
  pinInput: { textAlign: "center", fontSize: 24, letterSpacing: 12 },
  notice: {
    width: "100%",
    padding: 14,
    backgroundColor: palette.soft,
    borderRadius: 12,
  },
  check: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: palette.soft,
    alignItems: "center",
    justifyContent: "center",
  },
});
