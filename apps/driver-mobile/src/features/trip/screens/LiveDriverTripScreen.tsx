import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { completeMyDriverTrip, listMyDriverTrips, transitionMyDriverTrip } from "@startup/data-access";
import type { MyDriverTrip, TransitionDriverTripInput } from "@startup/contracts";
import { Button, SafeAreaView } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";

const nextAction: Partial<Record<MyDriverTrip["status"], { action: TransitionDriverTripInput["action"]; label: string }>> = {
  heading_to_pickup: { action: "arrive_pickup", label: "Arrived at pickup" },
  arrived_at_pickup: { action: "start", label: "Start trip" },
  in_progress: { action: "arrive_destination", label: "Arrived at destination" },
};

export function LiveDriverTripScreen() {
  const { profile } = useMobileSession();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const trips = useQuery({ queryKey: ["my-driver-trips", profile?.driver?.id],
    queryFn: () => listMyDriverTrips(supabase!), enabled: Boolean(supabase && profile?.driver?.id), refetchInterval: 15000 });
  const active = trips.data?.find((trip) => !["completed", "cancelled"].includes(trip.status));

  async function transition(trip: MyDriverTrip, action: TransitionDriverTripInput["action"]) {
    if (!supabase || busy) return;
    setBusy(true); setMessage("");
    try {
      await transitionMyDriverTrip(supabase, { tripId: trip.id, expectedVersion: Number(trip.row_version), action });
      await trips.refetch();
      setMessage(action === "start" ? "Trip started. Ask for the patient PIN only at completion." : "Trip status updated.");
    } catch { setMessage("Trip could not be updated. Refresh and check the current status."); }
    finally { setBusy(false); }
  }

  async function complete(trip: MyDriverTrip) {
    if (!supabase || busy) return;
    setBusy(true); setMessage("");
    try {
      const verified = await completeMyDriverTrip(supabase, { tripId: trip.id, patientPin: pin });
      if (verified) { setPin(""); await trips.refetch(); setMessage("Patient PIN verified. Trip completed."); }
      else setMessage("PIN did not match, or verification is temporarily locked. Ask the patient to check their app.");
    } catch { setMessage("Could not complete the trip. Check the four-digit PIN and trip status."); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>My trip</Text>
    {trips.isPending ? <Text>Loading trip…</Text> : trips.isError ? <Text>Could not load trip.</Text> : null}
    {!active && !trips.isPending ? <Text>No active trip. Accepted requests will appear here.</Text> : null}
    {active ? <View style={styles.card}>
      <Text style={styles.heading}>{active.public_code} · {active.status.replaceAll("_", " ")}</Text>
      <Text>Patient: {active.patient_name_snapshot ?? "Guest"}</Text>
      <Text>Pickup: {active.pickup_address ?? "Location in request"}</Text>
      <Text>Destination: {active.destination_address ?? "Confirm destination with patient"}</Text>
      {nextAction[active.status] ? <Button label={nextAction[active.status]!.label} disabled={busy}
        onPress={() => void transition(active, nextAction[active.status]!.action)} /> : null}
      {active.status === "arrived_at_destination" ? <>
        <Text>Ask the patient for the four-digit verification PIN shown in their app. It is required to complete the trip.</Text>
        <TextInput style={styles.input} placeholder="Patient PIN" value={pin} onChangeText={setPin}
          keyboardType="number-pad" maxLength={4} secureTextEntry accessibilityLabel="Patient verification PIN" />
        <Button label={busy ? "Verifying…" : "Verify PIN and complete"} disabled={busy || !/^[0-9]{4}$/.test(pin)}
          onPress={() => void complete(active)} />
      </> : null}
    </View> : null}
    <Button label="Refresh trip" variant="outline" onPress={() => void trips.refetch()} />
    {message ? <Text accessibilityRole="alert">{message}</Text> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "700" }, heading: { fontSize: 18, fontWeight: "700" },
  card: { borderWidth: 1, borderColor: "#D7DFE5", borderRadius: 12, padding: 16, gap: 14 },
  input: { borderWidth: 1, borderColor: "#BAC7D2", borderRadius: 8, padding: 12, minHeight: 48 },
});
