import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ambulance, CircleAlert, User } from "lucide-react-native";
import { Button } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
  PageHeader,
  palette,
  ui,
} from "../../../components/DriverUI";
import { emergency, useDriver } from "../../../stores/driver";

export function HomeScreen() {
  const d = useDriver();
  const [remaining, setRemaining] = useState(15);
  useEffect(() => {
    if (d.stage !== "request") return;
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil(((d.deadline ?? 0) - Date.now()) / 1000)
      );
      setRemaining(seconds);
      if (!seconds) d.reject();
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [d.stage, d.deadline, d.reject]);
  const active = ["pickup", "arrived", "progress", "complete"].includes(
    d.stage
  );
  const total = d.trips.reduce((sum, t) => sum + t.fare, 0);
  return (
    <View style={ui.screen}>
      <PageHeader
        title="CLINZO Driver"
        subtitle={
          d.online
            ? "Online — You will now receive rides"
            : "Offline — Switch online to receive rides"
        }
        right={
          <Switch
            accessibilityLabel="Receive emergency requests"
            value={d.online}
            disabled={active}
            onValueChange={d.setOnline}
            trackColor={{ false: "#075c65", true: "#075c65" }}
            thumbColor="white"
          />
        }
      />
      <Body>
        {active && (
          <Button
            theme="driver"
            label={
              d.stage === "complete"
                ? "View completed trip"
                : "Return to active trip"
            }
            onPress={() => router.push("/trip")}
          />
        )}
        {d.online && (
          <>
            <View style={styles.wait}>
              <View style={styles.dot} />
              <Copy style={{ color: palette.primary }}>
                Waiting for requests...
              </Copy>
            </View>
            <Image
              accessibilityLabel="Reference map of the driver location"
              source={require("../../../../assets/figma/online-map.png")}
              style={styles.map}
            />
          </>
        )}
        <Card>
          <Copy style={{ color: palette.muted }}>
            {d.online ? "TODAY’S WORK SUMMARY" : "TODAY’S SUMMARY"}
          </Copy>
          <View style={ui.between}>
            <View>
              <Copy style={styles.total}>₹{total.toLocaleString("en-IN")}</Copy>
              <Copy style={ui.caption}>Total Earnings</Copy>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Copy style={styles.total}>{d.trips.length}</Copy>
              <Copy style={ui.caption}>Completed Trips</Copy>
            </View>
          </View>
        </Card>
        <Metrics
          items={[
            [d.trips.length ? "100%" : "—", "Acceptance"],
            ["—", "Rating"],
            ["0.0h", "Online Hrs"],
          ]}
        />
        {!d.online && !d.trips.length && (
          <Card>
            <View style={[ui.center, { paddingVertical: 10 }]}>
              <Ambulance size={42} color={palette.border} />
              <Heading>No trips yet today</Heading>
              <Copy style={[ui.caption, { textAlign: "center" }]}>
                Your completed ambulance trips for today will appear here.
              </Copy>
            </View>
          </Card>
        )}
        {d.online && !active && (
          <View style={styles.preview}>
            <Copy style={ui.caption}>Local preview · sample dispatch</Copy>
            <Button
              theme="driver"
              variant="outline"
              label="Preview emergency request"
              onPress={d.request}
            />
          </View>
        )}
      </Body>
      <Modal
        visible={d.stage === "request"}
        transparent
        animationType="fade"
        onRequestClose={d.reject}
      >
        <View style={styles.overlay}>
          <View style={styles.request}>
            <View style={styles.alert}>
              <CircleAlert size={20} color="white" />
              <Copy style={styles.alertText}>New Emergency Request</Copy>
              <Copy style={styles.counter}>{remaining}s</Copy>
            </View>
            <View style={ui.row}>
              <View style={styles.avatar}>
                <User color="white" />
              </View>
              <Heading>{emergency.patient}</Heading>
              <Copy style={[ui.badge, { marginLeft: "auto", maxWidth: 140 }]}>
                Advanced Life Support
              </Copy>
            </View>
            <Address label="PICKUP" text={emergency.pickup} />
            <Address label="HOSPITAL" text={emergency.hospital} />
            <Metrics
              items={[
                ["4.6 km", "Distance"],
                ["9 mins", "ETA"],
                ["₹1,200", "Est. fare"],
              ]}
            />
            <View style={[ui.row, { marginTop: 20 }]}>
              <Button
                theme="driver"
                variant="outline"
                label="Reject"
                style={ui.grow}
                onPress={d.reject}
              />
              <Button
                theme="driver"
                label="Accept"
                style={ui.grow}
                onPress={() => {
                  d.accept();
                  if (useDriver.getState().stage === "pickup")
                    router.push("/trip");
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function Address({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.address}>
      <Copy style={ui.caption}>{label}</Copy>
      <Copy style={{ fontWeight: "600" }}>{text}</Copy>
    </View>
  );
}
const styles = StyleSheet.create({
  wait: {
    backgroundColor: palette.soft,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
  },
  map: { width: "100%", height: 211, borderRadius: 12, resizeMode: "cover" },
  total: { fontSize: 28, lineHeight: 36, fontWeight: "700" },
  preview: { gap: 8, marginTop: 12 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 16,
  },
  request: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    gap: 18,
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#BD382B",
    borderRadius: 12,
    padding: 12,
  },
  alertText: { color: "white", fontWeight: "700", flex: 1 },
  counter: { color: "white", fontWeight: "700" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  address: {
    backgroundColor: palette.soft,
    padding: 12,
    gap: 4,
    borderRadius: 12,
  },
});
