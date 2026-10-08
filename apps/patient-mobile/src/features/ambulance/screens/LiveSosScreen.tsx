import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMyAmbulanceBooking,
  getMyActiveAmbulanceTracking,
  getMyPatientVerificationPin,
  listMyAmbulanceBookings,
  refreshMyAmbulanceDispatch,
  requestMySos,
  requestOnboardingSos,
} from "@startup/data-access";
import { Button, Header, Input, Loader, SafeAreaView, useToast, type ToastType } from "@startup/mobile-ui";
import { mobileSession, supabase, useMobileSession } from "../../../services/supabase";

const sosDispatchEnabled = process.env.EXPO_PUBLIC_ENABLE_SOS_DISPATCH === "true";

export function LiveSosScreen({ onBackPress, onboarding = false }: { onBackPress: () => void; onboarding?: boolean }) {
  const { profile, session } = useMobileSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  const [summary, setSummary] = useState("");
  const [fullName, setFullName] = useState(profile?.display_name ?? "");
  const [contactPhone, setContactPhone] = useState(session?.user.phone ?? "");
  const [requestKey, setRequestKey] = useState(() => Crypto.randomUUID());
  const [locating, setLocating] = useState(false);
  const report = (text: string, type: ToastType) => showToast({ title: type === "error" ? "SOS action failed" : text, message: type === "error" ? text : undefined, type });
  const bookings = useQuery({ queryKey: ["my-ambulance-bookings"],
    queryFn: () => listMyAmbulanceBookings(supabase!), enabled: Boolean(supabase && sosDispatchEnabled && profile?.patient_id), refetchInterval: 15000 });
  const active = bookings.data?.find((booking) => booking.booking_type === "sos" &&
    ["awaiting_location", "searching", "assigned"].includes(booking.status));
  const pinVisible = active?.trip_status === "in_progress" ||
    active?.trip_status === "arrived_at_destination";
  const verificationPin = useQuery({
    queryKey: ["patient-completion-pin", profile?.patient_id, active?.id],
    queryFn: () => getMyPatientVerificationPin(supabase!, profile!.patient_id!),
    enabled: Boolean(supabase && profile?.patient_id && pinVisible),
  });
  const tracking = useQuery({
    queryKey: ["active-ambulance-tracking", active?.id],
    queryFn: () => getMyActiveAmbulanceTracking(supabase!, active!.id),
    enabled: Boolean(supabase && active?.status === "assigned"),
    refetchInterval: 15000,
  });

  async function locate() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("permission denied");
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPickup({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      setRequestKey(Crypto.randomUUID());
    } catch { report("Current location is required for app dispatch. Call 112 if location access is unavailable.", "error"); }
    finally { setLocating(false); }
  }

  const request = useMutation({
    mutationFn: () => {
      if (!sosDispatchEnabled || !supabase || !pickup) throw new Error("SOS dispatch unavailable");
      if (onboarding) return requestOnboardingSos(supabase, {
        fullName, contactPhone, pickupLatitude: pickup.latitude, pickupLongitude: pickup.longitude,
        pickupAddress: address, summary, idempotencyKey: requestKey,
      });
      if (!profile?.patient_id) throw new Error("Patient profile unavailable");
      return requestMySos(supabase, { patientId: profile.patient_id,
        pickupLatitude: pickup.latitude, pickupLongitude: pickup.longitude,
        pickupAddress: address, summary, idempotencyKey: requestKey });
    },
    onSuccess: async () => {
      report("Emergency request received. Searching for an approved ALS ambulance.", "success");
      if (onboarding) await mobileSession.refresh();
      setRequestKey(Crypto.randomUUID());
      void queryClient.invalidateQueries({ queryKey: ["my-ambulance-bookings"] });
    },
    onError: (cause) => report(cause instanceof Error ? cause.message : "App dispatch is unavailable. Call emergency services now.", "error"),
  });
  const cancel = useMutation({
    mutationFn: () => cancelMyAmbulanceBooking(supabase!, {
      bookingId: active!.id, expectedVersion: Number(active!.row_version),
    }),
    onSuccess: () => { report("SOS request cancelled.", "success"); void bookings.refetch(); },
    onError: () => report("Could not cancel. Refresh the request or call emergency services.", "error"),
  });
  const refreshDispatch = useMutation({
    mutationFn: () => refreshMyAmbulanceDispatch(supabase!, active!.id),
    onSuccess: () => {
      report("Search refreshed.", "info");
      void bookings.refetch();
    },
    onError: () => report("Could not refresh dispatch. Call emergency services if you still need help.", "error"),
  });

  return <SafeAreaView style={styles.screen}>
    <Header title="SOS Emergency" app="patient" onBackPress={onBackPress} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Emergency help</Text>
      <Text>For immediate voice assistance, call your local emergency service. In India, dial 112.</Text>
      <Button label="Call emergency 112" onPress={() => void Linking.openURL("tel:112")} />
      {!sosDispatchEnabled ? <Text accessibilityRole="alert">In-app SOS dispatch is not active yet. Use the emergency call button above.</Text> : null}
      {sosDispatchEnabled ? <>
      {active ? <View style={styles.card}>
        <Text style={styles.subtitle}>Active SOS · {active.status}</Text>
        <Text>{active.public_code}</Text>
        <Text>{active.driver_name ? `Driver: ${active.driver_name} · ${active.vehicle_registration}` : "No driver assigned yet."}</Text>
        {active.trip_status ? <Text>Trip: {active.trip_status}</Text> : null}
        {active.status === "assigned" ? tracking.data ? (
          <Text>Driver location: {tracking.data.latitude.toFixed(5)}, {tracking.data.longitude.toFixed(5)} · updated {new Date(tracking.data.received_at).toLocaleTimeString()}</Text>
        ) : <Text>Waiting for a current driver location.</Text> : null}
        {pinVisible ? <View style={styles.card}>
          <Text style={styles.subtitle}>Your completion PIN</Text>
          {verificationPin.isLoading ? <Loader theme="patient" style={{ minHeight: 36 }} /> : null}
          {verificationPin.data ? <Text accessibilityLabel="Four-digit completion PIN" style={styles.pin}>{verificationPin.data}</Text> : null}
          <Text>Give this PIN to the driver only when you reach your destination.</Text>
        </View> : null}
        {active.status === "searching" ? <>
          <Button loading={refreshDispatch.isPending} label="Search again" variant="outline" disabled={refreshDispatch.isPending}
            onPress={() => refreshDispatch.mutate()} />
          <Button loading={cancel.isPending} label="Cancel unassigned SOS" variant="outline"
            disabled={cancel.isPending} onPress={() => cancel.mutate()} />
        </> : null}
      </View> : <>
        <Text style={styles.subtitle}>Request an ALS ambulance</Text>
        {onboarding ? <>
          <Input label="Patient name" value={fullName} autoComplete="name"
            onChangeText={value => { setFullName(value); setRequestKey(Crypto.randomUUID()); }} />
          <Input label="Contact phone" value={contactPhone} keyboardType="phone-pad" autoComplete="tel"
            placeholder="+91 98765 43210"
            onChangeText={value => { setContactPhone(value.replace(/[\s()-]/g, "")); setRequestKey(Crypto.randomUUID()); }} />
        </> : null}
        <Button loading={locating} label={pickup ? "Refresh location" : "Use my current location"} accessibilityLabel={locating ? "Locating pickup" : pickup ? "Refresh location" : "Use my current location"} leftIcon={locating ? <Loader theme="patient" /> : undefined}
          disabled={locating} variant="outline" onPress={() => void locate()} />
        <Input label="Pickup address or landmark" value={address}
          onChangeText={(value) => { setAddress(value); setRequestKey(Crypto.randomUUID()); }} />
        <Input label="What happened?" value={summary}
          onChangeText={(value) => { setSummary(value); setRequestKey(Crypto.randomUUID()); }} />
        <Button loading={request.isPending} label="Hold to send SOS" variant="danger" labelStyle={styles.sosText} accessibilityRole="button" accessibilityLabel="Hold to send SOS request"
          disabled={request.isPending || !pickup || address.trim().length < 5 || summary.trim().length < 5 || (onboarding && (fullName.trim().length < 2 || !/^\+[1-9][0-9]{7,14}$/.test(contactPhone)))}
          delayLongPress={2300} accessibilityHint="Hold for 2.3 seconds to send the SOS request."
          onLongPress={() => request.mutate()} style={styles.sosButton}>
          <Text style={styles.sosText}>{request.isPending ? "Sending…" : "Hold to send SOS"}</Text>
        </Button>
        <Text>The destination hospital can be chosen after emergency assessment.</Text>
      </>}
      <Button loading={bookings.isFetching} label="Refresh status" variant="outline" disabled={!profile?.patient_id || bookings.isFetching} onPress={() => void bookings.refetch()} />
      </> : null}
      {onboarding ? <Button label="Continue profile setup" variant="outline" onPress={onBackPress} /> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, gap: 16 },
  title: { fontSize: 27, fontWeight: "700" }, subtitle: { fontSize: 19, fontWeight: "700" },
  card: { padding: 16, borderWidth: 1, borderColor: "#DAE0E5", borderRadius: 12, gap: 12 },
  sosButton: { backgroundColor: "#BB1D27", minHeight: 68, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sosText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  pin: { fontSize: 30, letterSpacing: 8, fontWeight: "700" },
});
