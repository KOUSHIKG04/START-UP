import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import {
  listMyAmbulanceFleet,
  listMyDriverOffers,
  registerMyAmbulanceVehicle,
  respondMyDriverOffer,
  setMyDriverAvailability,
} from "@startup/data-access";
import type { MyAmbulanceFleet } from "@startup/contracts";
import { Button, SafeAreaView } from "@startup/mobile-ui";
import { mobileSession, supabase, useMobileSession } from "../../../services/supabase";

const capabilities = ["BLS", "ALS", "NICU"] as const;

export function LiveDriverStatusScreen() {
  const { profile } = useMobileSession();
  const [registration, setRegistration] = useState("");
  const [label, setLabel] = useState("");
  const [inspectionExpiry, setInspectionExpiry] = useState("");
  const [capability, setCapability] =
    useState<(typeof capabilities)[number]>("BLS");
  const [equipmentNotes, setEquipmentNotes] = useState("");
  const [crewNotes, setCrewNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fleet = useQuery({
    queryKey: ["driver-fleet", profile?.driver?.id],
    queryFn: () => listMyAmbulanceFleet(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
  });
  const offers = useQuery({
    queryKey: ["driver-offers", profile?.driver?.id],
    queryFn: () => listMyDriverOffers(supabase!),
    enabled: Boolean(supabase && profile?.driver?.id),
    refetchInterval: 15000,
  });

  async function respondToOffer(offerId: string, accept: boolean) {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await respondMyDriverOffer(supabase, offerId, accept);
      await offers.refetch();
      setMessage(
        accept
          ? "Assignment accepted. Open the Trip tab for trip status."
          : "Offer declined."
      );
    } catch {
      setMessage("Offer expired or is no longer available. Refresh the list.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshReview() {
    setMessage("");
    try {
      await Promise.all([
        mobileSession.refresh(),
        fleet.refetch({ throwOnError: true }),
        offers.refetch({ throwOnError: true }),
      ]);
      setMessage("Review and offer status refreshed.");
    } catch {
      setMessage("Could not refresh review status. Try again.");
    }
  }

  async function submitVehicle() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await registerMyAmbulanceVehicle(supabase, {
        registrationNumber: registration,
        displayLabel: label,
        inspectionExpiresOn: inspectionExpiry,
        capabilityCode: capability,
        equipmentNotes,
        crewNotes,
      });
      setRegistration("");
      setLabel("");
      setInspectionExpiry("");
      setEquipmentNotes("");
      setCrewNotes("");
      await fleet.refetch();
      setMessage(
        "Vehicle submitted. Company operations must review its equipment and crew before you can go Available."
      );
    } catch {
      setMessage(
        "Could not submit the vehicle. Check the details and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeAvailability(
    vehicle: MyAmbulanceFleet,
    online: boolean
  ) {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (online) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted)
          throw new Error("Location permission required");
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
      await setMyDriverAvailability(supabase, {
        vehicleId: vehicle.vehicle_id,
        online,
        latitude,
        longitude,
      });
      await fleet.refetch();
      setMessage(
        online
          ? "You are Available for reviewed ambulance capabilities."
          : "You are Offline."
      );
    } catch {
      setMessage(
        "Availability could not be changed. Check your location permission and review status."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Clinzo Driver</Text>
        <Text>{profile?.display_name}</Text>
        <Text>
          Driver credential status: {profile?.driver?.status ?? "pending"}
        </Text>
        <Button
          label="Refresh review status"
          variant="outline"
          onPress={() => void refreshReview()}
        />
        <Text style={styles.heading}>Ambulance offers</Text>
        {offers.isPending ? (
          <Text>Loading offers…</Text>
        ) : offers.isError ? (
          <Text>Could not load offers.</Text>
        ) : null}
        {offers.data?.length === 0 ? (
          <Text>
            No active offers. Go Available after company review to receive
            nearby requests.
          </Text>
        ) : null}
        {offers.data?.map((offer) => (
          <View key={offer.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {offer.booking_type === "sos" ? "Emergency · " : ""}
              {offer.capability_code} request
            </Text>
            <Text>Pickup: {offer.pickup_address ?? "Location in request"}</Text>
            <Text>
              Destination: {offer.destination_address ?? "To be confirmed"}
            </Text>
            <Text>
              {(offer.distance_meters / 1000).toFixed(1)} km from your reported
              position
            </Text>
            <Text>
              Offer expires: {new Date(offer.expires_at).toLocaleTimeString()}
            </Text>
            <View style={styles.choices}>
              <Button
                label="Accept"
                disabled={busy}
                onPress={() => void respondToOffer(offer.id, true)}
              />
              <Button
                label="Decline"
                variant="outline"
                disabled={busy}
                onPress={() => void respondToOffer(offer.id, false)}
              />
            </View>
          </View>
        ))}
        <Text style={styles.heading}>My vehicles</Text>
        {fleet.isPending ? (
          <Text>Loading fleet…</Text>
        ) : fleet.isError ? (
          <Text>Could not load fleet.</Text>
        ) : null}
        {fleet.data?.length === 0 ? (
          <Text>No vehicle submitted yet.</Text>
        ) : null}
        {fleet.data?.map((vehicle) => (
          <View
            key={`${vehicle.vehicle_id}:${vehicle.capability_code}`}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>
              {vehicle.display_label} · {vehicle.registration_number}
            </Text>
            <Text>
              {vehicle.capability_code} · Company review:{" "}
              {vehicle.review_status}
            </Text>
            <Text>Inspection expires: {vehicle.inspection_expires_on}</Text>
            <Text>
              {vehicle.desired_availability === "online"
                ? "Available"
                : "Offline"}
            </Text>
            {vehicle.ready_to_go_available ||
            vehicle.desired_availability === "online" ? (
              <Button
                label={
                  vehicle.desired_availability === "online"
                    ? "Go Offline"
                    : "Go Available"
                }
                disabled={busy}
                onPress={() =>
                  void changeAvailability(
                    vehicle,
                    vehicle.desired_availability !== "online"
                  )
                }
              />
            ) : (
              <Text>
                Available after driver credential, vehicle equipment, crew and
                inspection approval.
              </Text>
            )}
          </View>
        ))}
        <Text style={styles.heading}>Submit a vehicle for company review</Text>
        <TextInput
          style={styles.input}
          placeholder="Registration number"
          value={registration}
          onChangeText={setRegistration}
          autoCapitalize="characters"
        />
        <TextInput
          style={styles.input}
          placeholder="Vehicle label"
          value={label}
          onChangeText={setLabel}
        />
        <TextInput
          style={styles.input}
          placeholder="Inspection expiry (YYYY-MM-DD)"
          value={inspectionExpiry}
          onChangeText={setInspectionExpiry}
        />
        <Text>Capability requested</Text>
        <View style={styles.choices}>
          {capabilities.map((code) => (
            <Button
              key={code}
              label={code}
              variant={capability === code ? "primary" : "outline"}
              onPress={() => setCapability(code)}
            />
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Equipment details for review"
          value={equipmentNotes}
          onChangeText={setEquipmentNotes}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Clinical crew details for review"
          value={crewNotes}
          onChangeText={setCrewNotes}
          multiline
        />
        <Button
          label={busy ? "Submitting…" : "Submit for review"}
          disabled={busy}
          onPress={() => void submitVehicle()}
        />
        {message ? <Text accessibilityRole="alert">{message}</Text> : null}
        <Button
          label="Sign out"
          variant="outline"
          onPress={() => void supabase?.auth.signOut()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "700" },
  heading: { fontSize: 20, fontWeight: "700", marginTop: 12 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#D7DFE5",
    borderRadius: 12,
    gap: 10,
  },
  cardTitle: { fontWeight: "700", fontSize: 17 },
  input: {
    borderWidth: 1,
    borderColor: "#BAC7D2",
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
