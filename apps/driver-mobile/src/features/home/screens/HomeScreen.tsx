import { ModalSurface } from "@startup/mobile-ui";
import { colors } from "@startup/design-tokens";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ambulance, CircleAlert, User } from "lucide-react-native";
import {
  listMyAmbulanceFleet,
  listMyDriverOffers,
  listMyDriverTrips,
  respondMyDriverOffer,
  setMyDriverAvailability,
} from "@startup/data-access";
import { Button, useToast, useToastFeedback } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
  PageHeader,
} from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";

export function HomeScreen() {
  const { profile } = useMobileSession();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [responding, setResponding] = useState<boolean | null>(null);
  const client = useQueryClient();
  const { showToast } = useToast();
  const driverId = profile?.driver?.id;
  
  const fleet = useQuery({
    queryKey: ["driver-fleet", driverId],
    queryFn: () => listMyAmbulanceFleet(supabase!),
    enabled: Boolean(supabase && driverId),
  });

  const offers = useQuery({
    queryKey: ["driver-offers", driverId],
    queryFn: () => listMyDriverOffers(supabase!),
    enabled: Boolean(supabase && driverId),
    refetchInterval: 15000,
  });

  const trips = useQuery({
    queryKey: ["my-driver-trips", driverId],
    queryFn: () => listMyDriverTrips(supabase!),
    enabled: Boolean(supabase && driverId),
    refetchInterval: 15000,
  });
  useToastFeedback({ error: offers.isError || trips.isError || fleet.isError ? "Could not refresh requests or status." : "" });

  const vehicle =
    fleet.data?.find((item) => item.desired_availability === "online") ??
    fleet.data?.find((item) => item.ready_to_go_available);
  
  const online = vehicle?.desired_availability === "online";
  
  const active = trips.data?.find(
    (item) => !["completed", "cancelled"].includes(item.status)
  );

  const completedToday =
    trips.data?.filter(
      (item) =>
        item.status === "completed" &&
        item.completed_at &&
        new Date(item.completed_at).toDateString() === new Date().toDateString()
    ).length ?? 0;

  const offer = offers.data?.find(
    (item) =>
      item.status === "pending" && new Date(item.expires_at).getTime() > now
  );


  const remaining = offer
    ? Math.max(
        0,
        Math.ceil((new Date(offer.expires_at).getTime() - now) / 1000)
      )
    : 0;

  useEffect(() => {
    
    if (!offer) return;
    
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [offer?.id]);

  async function changeAvailability(value: boolean) {
    if (!supabase || !vehicle || busy) return;
   
    setBusy(true);

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (value) {
        const permission = await Location.requestForegroundPermissionsAsync();
        
        if (!permission.granted)
          throw new Error("Allow location to go Available.");
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        
        try {
          await Location.requestBackgroundPermissionsAsync();
        } catch {
          /* Foreground dispatch remains available when background access is denied. */
        }
      }

      await setMyDriverAvailability(supabase, {
        vehicleId: vehicle.vehicle_id,
        online: value,
        latitude,
        longitude,
      });

      await client.invalidateQueries({ queryKey: ["driver-fleet", driverId] });
      showToast({ title: value ? "You are available" : "You are offline", type: "success" });
    } catch (cause) {
      const feedback = cause instanceof Error ? cause.message : "Could not update availability.";
      showToast({ title: "Availability update failed", message: feedback, type: "error" });
    } finally {
      setBusy(false); setResponding(null);
    }
  }

  async function respond(accept: boolean) {
    if (!supabase || !offer || busy) return;
    setBusy(true); setResponding(accept);
    try {
      await respondMyDriverOffer(supabase, offer.id, accept);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      await Promise.all([
        client.invalidateQueries({ queryKey: ["driver-offers", driverId] }),
        client.invalidateQueries({ queryKey: ["my-driver-trips", driverId] }),
      ]);
      showToast({ title: accept ? "Request accepted" : "Request declined", type: "success" });
      if (accept) router.push("/trip");
    } catch {
      const feedback = "The request expired or is no longer available. Refresh and try again.";
      showToast({ title: "Request unavailable", message: feedback, type: "error" });
    } finally {
      setBusy(false); setResponding(null);
    }
  }
  
  return (
    <View style={ui.screen}>
      <PageHeader
        title="CLINZO Driver"
        right={
          <Switch
            accessibilityLabel="Receive emergency requests"
            value={online}
            disabled={
              busy || !vehicle?.ready_to_go_available || Boolean(active)
            }
            onValueChange={(value) => void changeAvailability(value)}
            trackColor={{ false: "#075c65", true: "#075c65" }}
            thumbColor="white"
          />
        }
      />
      <Body>
        {active ? (
          <Button
            theme="driver"
            label="Return to active trip"
            onPress={() => router.push("/trip")}
          />
        ) : null}
        {online ? (
          <>
            <View style={styles.wait}>
              <View style={styles.dot} />
              <Copy style={{ color: palette.primary }}>
                Waiting for requests...
              </Copy>
            </View>
            <Image
              accessibilityLabel="Reference map; live route navigation is not connected"
              source={require("../../../../assets/figma/online-map.png")}
              style={styles.map}
            />
            <Copy style={ui.caption}>
              Reference map · live navigation is not connected
            </Copy>
          </>
        ) : null}
        <Card>
          <Copy style={{ color: palette.muted }}>
            {online ? "TODAY’S WORK SUMMARY" : "TODAY’S SUMMARY"}
          </Copy>
          <View style={ui.between}>
            <View>
              <Copy style={styles.total}>—</Copy>
              <Copy style={ui.caption}>Total Earnings</Copy>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Copy style={styles.total}>{completedToday}</Copy>
              <Copy style={ui.caption}>Completed Trips</Copy>
            </View>
          </View>
        </Card>
        <Metrics
          items={[
            ["—", "Acceptance"],
            ["—", "Rating"],
            ["—", "Online Hrs"],
          ]}
        />
        {!online && completedToday === 0 ? (
          <Card>
            <View style={[ui.center, { paddingVertical: 10 }]}>
              <Ambulance size={42} color={palette.border} />
              <Heading>No trips yet today</Heading>
              <Copy style={[ui.caption, { textAlign: "center" }]}>
                Your completed ambulance trips for today will appear here.
              </Copy>
            </View>
          </Card>
        ) : null}
        {!vehicle ? (
          <Card>
            <Heading>Vehicle review required</Heading>
            <Copy>
              Add a vehicle and documents in Profile, then wait for company
              approval before going Available.
            </Copy>
          </Card>
        ) : null}
      </Body>
      <ModalSurface layout="custom"
        visible={Boolean(offer)}
        transparent
        animationType="fade"
        onClose={() => void respond(false)}
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
              <Heading>
                {offer?.booking_type === "sos"
                  ? "SOS request"
                  : "Ambulance request"}
              </Heading>
              <Copy style={[ui.badge, { marginLeft: "auto", maxWidth: 140 }]}>
                {offer?.capability_code}
              </Copy>
            </View>
            <Address
              label="PICKUP"
              text={offer?.pickup_address ?? "Location provided in request"}
            />
            <Address
              label="HOSPITAL"
              text={offer?.destination_address ?? "Destination to be confirmed"}
            />
            <Metrics
              items={[
                [
                  offer
                    ? `${(offer.distance_meters / 1000).toFixed(1)} km`
                    : "—",
                  "Distance",
                ],
                ["—", "ETA"],
                ["—", "Est. fare"],
              ]}
            />
            <View style={[ui.row, { marginTop: 20 }]}>
              <Button loading={busy && responding === false}
                theme="driver"
                variant="outline"
                label="Reject"
                style={ui.grow}
                disabled={busy}
                onPress={() => void respond(false)}
              />
              <Button loading={busy && responding === true}
                theme="driver"
                label="Accept"
                style={ui.grow}
                disabled={busy}
                onPress={() => void respond(true)}
              />
            </View>
          </View>
        </View>
      </ModalSurface>
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
  overlay: {
    flex: 1,
    backgroundColor: colors.ui.overlay,
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
