import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Check, MessageCircle, Phone, User } from "lucide-react-native";
import { Button, Input } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
  PageHeader,
  palette,
  ui,
} from "../../components/DriverUI";
import { emergency, useDriver } from "../../store/driver";

export function TripScreen() {
  const d = useDriver();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const stage = d.stage;
  const titles = {
    pickup: ["Navigate to Patient", "Heading to Sriramapura"],
    arrived: ["At Pickup Location", "Arrived at Sriramapura"],
    progress: ["Trip in Progress", "En Route to Manipal Hospital"],
    complete: ["Trip Complete", "Patient delivered safely"],
  };
  if (stage === "idle" || stage === "request")
    return (
      <View style={ui.screen}>
        <PageHeader title="Current trip" />
        <Body>
          <Heading>No active trip</Heading>
          <Button
            theme="driver"
            label="Back to Home"
            onPress={() => router.replace("/home")}
          />
        </Body>
      </View>
    );
  const [title, subtitle] = titles[stage];
  return (
    <View style={ui.screen}>
      <PageHeader title={title} subtitle={subtitle} />
      <Body>
        {stage !== "complete" ? (
          <>
            <Image
              source={require("../../../assets/figma/trip-map.png")}
              accessibilityLabel="Figma reference route map; live navigation is not connected"
              style={styles.map}
            />
            {stage === "arrived" && (
              <View style={styles.pin}>
                <Heading>Enter Patient’s PIN to Proceed</Heading>
                <Input
                  accessibilityLabel="Patient PIN"
                  value={pin}
                  onChangeText={(v) => {
                    setPin(v.replace(/\D/g, "").slice(0, 4));
                    setError("");
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="— — — —"
                  secureTextEntry
                  error={error}
                  style={styles.pinInput}
                />
                <Copy style={ui.caption}>Preview PIN: 1234</Copy>
                <View style={styles.notice}>
                  <Copy style={{ color: palette.primary }}>
                    Waiting for patient...
                  </Copy>
                </View>
              </View>
            )}
            {stage === "progress" && (
              <Copy style={styles.success}>PIN verified successfully!</Copy>
            )}
            <Card>
              {stage === "progress" && (
                <>
                  <Copy style={ui.caption}>DESTINATION HOSPITAL</Copy>
                  <Heading>{emergency.hospital}</Heading>
                  <View style={ui.divider} />
                </>
              )}
              <View style={ui.row}>
                <View style={styles.avatar}>
                  <User color={palette.primary} size={24} />
                </View>
                <View style={ui.grow}>
                  <Heading>{emergency.patient}</Heading>
                  <Copy style={ui.caption}>
                    {stage === "progress"
                      ? "Severity Indicator: Moderate Alert"
                      : "Advanced Life Support"}
                  </Copy>
                </View>
                {stage !== "progress" && (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Patient call information"
                      style={styles.action}
                      onPress={() =>
                        setError(
                          "Patient calling becomes available when a live dispatch is connected."
                        )
                      }
                    >
                      <Phone color={palette.primary} size={20} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Chat with patient"
                      style={styles.action}
                      onPress={() => router.push("/chat")}
                    >
                      <MessageCircle color={palette.primary} size={20} />
                    </Pressable>
                  </>
                )}
              </View>
              {stage !== "progress" && (
                <>
                  <View style={ui.divider} />
                  <Copy style={ui.caption}>PICKUP ADDRESS</Copy>
                  <Copy>{emergency.pickup}</Copy>
                  {stage === "arrived" && (
                    <>
                      <Copy style={ui.caption}>HOSPITAL DESTINATION</Copy>
                      <Copy>{emergency.hospital}</Copy>
                    </>
                  )}
                </>
              )}
            </Card>
            <Metrics
              items={
                stage === "pickup"
                  ? [
                      ["9 mins", "ETA to Patient"],
                      ["4.6 km", "Distance"],
                      ["₹1,200", "Est. Fare"],
                    ]
                  : stage === "arrived"
                    ? [
                        ["ALS", "Service Type"],
                        ["8.2 km", "Drop Distance"],
                        ["12 mins", "Est. Time"],
                      ]
                    : [
                        ["12 mins", "ETA"],
                        ["8.2 km", "Remaining"],
                        ["45 km/h", "Speed"],
                      ]
              }
            />
            {error && stage !== "arrived" && (
              <Copy accessibilityRole="alert" style={{ color: palette.muted }}>
                {error}
              </Copy>
            )}
            <Button
              theme="driver"
              label={
                stage === "pickup"
                  ? "I’ve arrived at pickup"
                  : stage === "arrived"
                    ? "Verify PIN & start trip"
                    : "Complete trip"
              }
              style={ui.button}
              onPress={() => {
                if (stage === "pickup") d.arrive();
                else if (stage === "arrived") {
                  if (!d.startTrip(pin))
                    setError(
                      "That PIN doesn’t match. Use 1234 in this preview."
                    );
                } else d.complete();
              }}
            />
            <Copy style={[ui.caption, { textAlign: "center" }]}>
              Preview trip · route and trip metrics are illustrative
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
                ["Pickup Location", "Sriramapura"],
                ["Drop-off Location", "Manipal Hospital"],
                ["Total Distance", emergency.distance],
                ["Ride Duration", emergency.duration],
                ["Ambulance Service", "ALS"],
              ].map(([label, value]) => (
                <View key={label} style={ui.between}>
                  <Copy style={{ color: palette.muted }}>{label}</Copy>
                  <Copy style={{ fontWeight: "600" }}>{value}</Copy>
                </View>
              ))}
              <View style={ui.divider} />
              <View style={ui.between}>
                <Heading>Total Fare</Heading>
                <Copy style={ui.metricValue}>₹1,200</Copy>
              </View>
            </Card>
            <Button
              theme="driver"
              label="Back to Home"
              onPress={() => {
                d.finish();
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
  success: {
    color: palette.primary,
    fontSize: 18,
    textAlign: "center",
    paddingVertical: 16,
  },
  check: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.soft,
    alignItems: "center",
    justifyContent: "center",
  },
});
