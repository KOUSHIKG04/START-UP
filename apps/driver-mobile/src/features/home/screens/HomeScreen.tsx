import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationDrawer } from "../../../components/NotificationDrawer";
import { locationHeadline } from "../../locations/savedLocationDisplay";
import { ModalSurface } from "@startup/mobile-ui";
import { colors, fontFamilies, shadows } from "@startup/design-tokens";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ambulance, Bell, ChevronDown, MapPin, CircleAlert, User } from "lucide-react-native";
import {
  listMyDriverLocations,
  getMyDriverProfile,
  listMyAmbulanceFleet,
  listMyDriverOffers,
  listMyDriverTrips,
  respondMyDriverOffer,
  setMyDriverAvailability,
} from "@startup/data-access";
import { Button, useToast, useToastFeedback, useTimeGreeting } from "@startup/mobile-ui";
import {
  Body,
  Card,
  Copy,
  Heading,
  Metrics,
} from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";

export function HomeScreen() {
  const { profile } = useMobileSession();
  const greeting = useTimeGreeting();
  const insets = useSafeAreaInsets();
  const [showNotifications, setShowNotifications] = useState(false);
  useEffect(() => { router.prefetch("/select-location"); }, []);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [responding, setResponding] = useState<boolean | null>(null);
  const client = useQueryClient();
  const { showToast } = useToast();
  const driverId = profile?.driver?.id;
  
  const locations = useQuery({ queryKey: ["my-driver-locations", driverId], queryFn: () => listMyDriverLocations(supabase!), enabled: Boolean(supabase && driverId) });
  const selectedLocation = locations.data?.find(item => item.selected);
  const driverProfile = useQuery({ queryKey: ["my-driver-profile", driverId], queryFn: () => getMyDriverProfile(supabase!), enabled: Boolean(supabase && driverId) });
  useToastFeedback({ error: locations.isError ? "Could not load saved locations. Tap the location to retry." : "" });
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
      <StatusBar style="light" />
      <View style={[styles.header, { minHeight: Math.max(165, insets.top + 88) }]}>
        <View style={[styles.headerRow, { marginTop: insets.top + 18 }]}>
          <Text style={styles.greeting} numberOfLines={1}>{greeting}! {driverProfile.data?.full_name ?? "Driver"}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Selected location: ${locationHeadline(selectedLocation)}. Change location`} onPress={() => router.push("/select-location")} style={styles.location}>
            <MapPin size={15} strokeWidth={2} color={colors.white} />
            <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">{locationHeadline(selectedLocation)}</Text>
            <ChevronDown size={15} color={colors.white} />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={10} onPress={() => setShowNotifications(true)} style={({ pressed }) => [styles.notificationButton, { top: insets.top + 22 }, pressed && styles.notificationButtonPressed]}>
          <Bell size={20} strokeWidth={1.9} color={palette.primary} />
        </Pressable>
      </View>
      <Body>
        <View style={ui.between}><Heading>{online ? "Available" : "Offline"}</Heading>
          <Switch
            accessibilityLabel="Receive emergency requests"
            value={online}
            disabled={
              busy || !vehicle?.ready_to_go_available || Boolean(active)
            }
            onValueChange={(value) => void changeAvailability(value)}
            trackColor={{ false: colors.borderDefault, true: palette.primary }}
            thumbColor={online ? colors.white : palette.primary}
          />
        </View>
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
              Reference map Â· live navigation is not connected
            </Copy>
          </>
        ) : null}
        <Card>
          <Copy style={{ color: palette.muted }}>
            {online ? "TODAYâ€™S WORK SUMMARY" : "TODAYâ€™S SUMMARY"}
          </Copy>
          <View style={ui.between}>
            <View>
              <Copy style={styles.total}>â€”</Copy>
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
            ["â€”", "Acceptance"],
            ["â€”", "Rating"],
            ["â€”", "Online Hrs"],
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
                    : "â€”",
                  "Distance",
                ],
                ["â€”", "ETA"],
                ["â€”", "Est. fare"],
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
      <NotificationDrawer visible={showNotifications} onClose={() => setShowNotifications(false)} />
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
  header: { backgroundColor: palette.primary },
  headerRow: { height: 70, justifyContent: "center", alignItems: "flex-start", paddingHorizontal: 24 },
  greeting: { color: colors.white, fontFamily: fontFamilies.semibold, fontSize: 22, fontWeight: "600", lineHeight: 34, paddingRight: 52, maxWidth: "100%" },
  notificationButton: { position: "absolute", right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadows.card },
  notificationButtonPressed: { opacity: 0.75, transform: [{ scale: 0.95 }] },
  location: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "75%", minHeight: 26 },
  locationText: { color: colors.white, fontFamily: fontFamilies.medium, fontSize: 13, flexShrink: 1 },
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
