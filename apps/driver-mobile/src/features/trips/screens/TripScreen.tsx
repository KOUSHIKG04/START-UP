import { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Check, MessageCircle, Phone, User } from "lucide-react-native";
import { completeMyDriverTrip, listMyDriverTrips, transitionMyDriverTrip } from "@startup/data-access";
import type { MyDriverTrip, TransitionDriverTripInput } from "@startup/contracts";
import { Button, Input } from "@startup/mobile-ui";
import { Body, Card, Copy, Heading, Metrics, PageHeader } from "../../../components/DriverUI";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";

const stages: Record<Exclude<MyDriverTrip["status"], "cancelled">, [string, string]> = {
  heading_to_pickup: ["Navigate to Patient", "Heading to pickup"], arrived_at_pickup: ["At Pickup Location", "Arrived at pickup"],
  in_progress: ["Trip in Progress", "En route to destination"], arrived_at_destination: ["At Destination", "Ask for patient verification"],
  completed: ["Trip Complete", "Patient delivered safely"],
};
const next: Partial<Record<MyDriverTrip["status"], { action: TransitionDriverTripInput["action"]; label: string }>> = {
  heading_to_pickup: { action: "arrive_pickup", label: "I’ve arrived at pickup" }, arrived_at_pickup: { action: "start", label: "Start trip" },
  in_progress: { action: "arrive_destination", label: "I’ve arrived at destination" },
};
export function TripScreen() {
  const { profile } = useMobileSession();
  const [pin, setPin] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [completedId, setCompletedId] = useState<string | null>(null);
  const trips = useQuery({ queryKey: ["my-driver-trips", profile?.driver?.id], queryFn: () => listMyDriverTrips(supabase!), enabled: Boolean(supabase && profile?.driver?.id), refetchInterval: 15000 });
  const trip = trips.data?.find(item => !["completed", "cancelled"].includes(item.status)) ?? trips.data?.find(item => item.id === completedId);
  async function transition(item: MyDriverTrip, action: TransitionDriverTripInput["action"]) {
    if (!supabase || busy) return;
    setBusy(true); setMessage("");
    try { await transitionMyDriverTrip(supabase, { tripId: item.id, expectedVersion: Number(item.row_version), action }); await trips.refetch(); }
    catch { setMessage("Trip could not be updated. Refresh and check its status."); }
    finally { setBusy(false); }
  }
  async function complete(item: MyDriverTrip) {
    if (!supabase || busy) return;
    setBusy(true); setMessage("");
    try { const verified = await completeMyDriverTrip(supabase, { tripId: item.id, patientPin: pin }); if (verified) { setCompletedId(item.id); setPin(""); await trips.refetch(); } else setMessage("PIN did not match, or verification is temporarily locked. Ask the patient to check their app."); }
    catch { setMessage("Could not complete the trip. Check the PIN and trip status."); }
    finally { setBusy(false); }
  }
  if (!trip || trip.status === "cancelled") return <View style={ui.screen}><PageHeader title="Current trip" /><Body>{trips.isLoading ? <Copy>Loading trip…</Copy> : <Heading>No active trip</Heading>}{trips.isError ? <Copy accessibilityRole="alert">Could not load trip.</Copy> : null}<Button theme="driver" label="Back to Home" onPress={() => router.replace("/home")} /></Body></View>;
  const [title, subtitle] = stages[trip.status];
  return <View style={ui.screen}><PageHeader title={title} subtitle={subtitle} /><Body>
    {trip.status !== "completed" ? <>
      <Image source={require("../../../../assets/figma/trip-map.png")} accessibilityLabel="Reference route map; live navigation is not connected" style={styles.map} />
      {trip.status === "arrived_at_destination" ? <View style={styles.pin}><Heading>Enter Patient’s PIN to Complete</Heading><Input accessibilityLabel="Patient PIN" value={pin} onChangeText={value => { setPin(value.replace(/\D/g, "").slice(0, 4)); setMessage(""); }} keyboardType="number-pad" maxLength={4} placeholder="— — — —" secureTextEntry error={message} style={styles.pinInput} /><View style={styles.notice}><Copy style={{ color: palette.primary }}>Ask the patient for the PIN shown in their app.</Copy></View></View> : null}
      <Card>
        {trip.status === "in_progress" || trip.status === "arrived_at_destination" ? <>
          <Copy style={ui.caption}>DESTINATION HOSPITAL</Copy>
          <Heading>{trip.destination_address ?? "Destination to be confirmed"}</Heading>
          <View style={ui.divider} />
        </> : null}
        <View style={ui.row}>
          <View style={styles.avatar}><User color={palette.primary} size={24} /></View>
          <View style={ui.grow}>
            <Heading>{trip.patient_name_snapshot ?? "Patient"}</Heading>
            <Copy style={ui.caption}>{trip.capability_code ?? "Service pending"}</Copy>
          </View>
          {trip.status !== "in_progress" ? <>
            <Pressable accessibilityRole="button" accessibilityLabel="Call patient" style={styles.action} onPress={() => { if (trip.contact_phone_snapshot) void Linking.openURL(`tel:${trip.contact_phone_snapshot}`); else setMessage("No patient phone number is available for this trip."); }}><Phone color={palette.primary} size={20} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Chat with patient" style={styles.action} onPress={() => setMessage("In-app messaging is not connected for this trip yet.")}><MessageCircle color={palette.primary} size={20} /></Pressable>
          </> : null}
        </View>
        {trip.status !== "in_progress" ? <>
          <View style={ui.divider} />
          <Copy style={ui.caption}>PICKUP ADDRESS</Copy>
          <Copy>{trip.pickup_address ?? "Pickup location in request"}</Copy>
          {trip.status === "arrived_at_pickup" || trip.status === "arrived_at_destination" ? <>
            <Copy style={ui.caption}>HOSPITAL DESTINATION</Copy>
            <Copy>{trip.destination_address ?? "Destination to be confirmed"}</Copy>
          </> : null}
        </> : null}
      </Card>
      <Metrics items={trip.status === "heading_to_pickup"
        ? [["—", "ETA to Patient"], ["—", "Distance"], ["—", "Est. Fare"]]
        : trip.status === "arrived_at_pickup"
          ? [[trip.capability_code ?? "—", "Service Type"], ["—", "Drop Distance"], ["—", "Est. Time"]]
          : [["—", "ETA"], ["—", "Remaining"], ["—", "Speed"]]} />
      {next[trip.status] ? <Button theme="driver" label={busy ? "Updating…" : next[trip.status]!.label} style={ui.button} disabled={busy} onPress={() => void transition(trip, next[trip.status]!.action)} /> : null}
      {trip.status === "arrived_at_destination" ? <Button theme="driver" label={busy ? "Verifying…" : "Verify PIN & complete trip"} style={ui.button} disabled={busy || !/^\d{4}$/.test(pin)} onPress={() => void complete(trip)} /> : null}
      <Copy style={[ui.caption, { textAlign: "center" }]}>Route map is a reference image until live navigation is connected.</Copy>
    </> : <><View style={[ui.center, { paddingVertical: 16 }]}><View style={styles.check}><Check size={32} color={palette.primary} /></View><Heading>Trip Completed Successfully!</Heading><Copy style={ui.caption}>Your trip summary is ready</Copy></View><Card><Copy style={ui.caption}>TRIP SUMMARY RECEIPT</Copy><View style={ui.divider} />{[["Pickup Location", trip.pickup_address ?? "—"], ["Drop-off Location", trip.destination_address ?? "—"], ["Total Distance", trip.distance_meters === null ? "Pending" : `${(Number(trip.distance_meters) / 1000).toFixed(1)} km`], ["Ride Duration", trip.started_at && trip.completed_at ? `${Math.max(0, Math.round((new Date(trip.completed_at).getTime() - new Date(trip.started_at).getTime()) / 60000))} min` : "—"], ["Ambulance Service", trip.capability_code ?? "—"]].map(([label, value]) => <View key={label} style={ui.between}><Copy style={{ color: palette.muted }}>{label}</Copy><Copy style={{ fontWeight: "600" }}>{value}</Copy></View>)}<View style={ui.divider} /><View style={ui.between}><Heading>Total Fare</Heading><Copy style={ui.metricValue}>Pending</Copy></View></Card><Button theme="driver" label="Back to Home" onPress={() => { setCompletedId(null); router.replace("/home"); }} /><Button theme="driver" variant="outline" label="View earnings" onPress={() => router.navigate("/earnings")} /></>}
    {message ? <Copy accessibilityRole="alert" style={{ color: palette.muted }}>{message}</Copy> : null}
  </Body></View>;
}
const styles = StyleSheet.create({ map: { width: "100%", height: 303, borderRadius: 12, resizeMode: "cover" }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center" }, action: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center" }, pin: { alignItems: "center", gap: 14, paddingVertical: 8 }, pinInput: { textAlign: "center", fontSize: 24, letterSpacing: 12 }, notice: { width: "100%", padding: 14, backgroundColor: palette.soft, borderRadius: 12 }, check: { height: 64, width: 64, borderRadius: 32, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center" } });
