import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelMyAmbulanceBooking,
  getMyPatientVerificationPin,
  getMyActiveAmbulanceTracking,
  listMyAmbulanceBookings,
  listPublicHospitals,
  refreshMyAmbulanceDispatch,
  requestAmbulanceBooking,
} from "@startup/data-access";
import type { RequestAmbulanceBookingInput } from "@startup/contracts";
import { Button, Header, Input, Loader, SafeAreaView } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";
import { LiveAmbulanceRequestsList } from "../components/LiveAmbulanceRequestsList";

export function LiveAmbulanceBookingScreen({
  onBackPress,
}: {
  onBackPress: () => void;
}) {
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [capabilityCode, setCapabilityCode] =
    useState<RequestAmbulanceBookingInput["capabilityCode"]>("BLS");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    Crypto.randomUUID()
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const hospitals = useQuery({
    queryKey: ["public-hospitals", pickup],
    queryFn: () => listPublicHospitals(supabase!, pickup ?? undefined),
    enabled: !!supabase,
  });
  useToastFeedback({ error: error || (hospitals.isError ? "Could not load hospitals. Try again." : ""), success: message });
  const bookings = useQuery({
    queryKey: ["my-ambulance-bookings"],
    queryFn: () => listMyAmbulanceBookings(supabase!),
    enabled: !!supabase,
    refetchInterval: 15000,
  });
  const activeBooking = bookings.data?.find(
    (booking) => booking.status === "searching" || booking.status === "assigned"
  );
  const pinVisible =
    activeBooking?.trip_status === "in_progress" ||
    activeBooking?.trip_status === "arrived_at_destination";
  const verificationPin = useQuery({
    queryKey: [
      "patient-completion-pin",
      profile?.patient_id,
      activeBooking?.id,
    ],
    queryFn: () => getMyPatientVerificationPin(supabase!, profile!.patient_id!),
    enabled: Boolean(supabase && profile?.patient_id && pinVisible),
    staleTime: 0,
  });
  const tracking = useQuery({
    queryKey: ["active-ambulance-tracking", activeBooking?.id],
    queryFn: () => getMyActiveAmbulanceTracking(supabase!, activeBooking!.id),
    enabled: Boolean(supabase && activeBooking?.status === "assigned"),
    refetchInterval: 15000,
  });

  async function locatePickup() {
    setLocating(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Allow location access to request an ambulance from your current position."
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setPickup({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setIdempotencyKey(Crypto.randomUUID());
    } catch {
      setError(
        "Could not get your current location. Check device location settings and try again."
      );
    } finally {
      setLocating(false);
    }
  }

  const request = useMutation({
    mutationFn: () => {
      if (!profile?.patient_id || !pickup || !hospitalId)
        throw new Error("Complete the booking details.");
      return requestAmbulanceBooking(supabase!, {
        patientId: profile.patient_id,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        pickupAddress,
        destinationFacilityId: hospitalId,
        capabilityCode,
        idempotencyKey,
      });
    },
    onSuccess: () => {
      setError("");
      setMessage("Ambulance request received. Assignment is pending.");
      setIdempotencyKey(Crypto.randomUUID());
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
    },
    onError: () =>
      setError(
        "Could not request an ambulance. Check your details or existing active request."
      ),
  });
  const cancel = useMutation({
    mutationFn: (booking: NonNullable<typeof bookings.data>[number]) =>
      cancelMyAmbulanceBooking(supabase!, {
        bookingId: booking.id,
        expectedVersion: Number(booking.row_version),
      }),
    onSuccess: () => {
      setError("");
      setMessage("Ambulance request cancelled.");
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
    },
    onError: () =>
      setError(
        "Could not cancel this request. Refresh its status and try again."
      ),
  });
  const refreshDispatch = useMutation({
    mutationFn: (bookingId: string) =>
      refreshMyAmbulanceDispatch(supabase!, bookingId),
    onSuccess: () => {
      setError("");
      setMessage("Search refreshed.");
      void queryClient.invalidateQueries({
        queryKey: ["my-ambulance-bookings"],
      });
    },
    onError: () =>
      setError(
        "Could not refresh matching. Try again after the current search round ends."
      ),
  });

  return (
    <SafeAreaView style={styles.screen}>
      <Header title="Ambulance" app="patient" onBackPress={onBackPress} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Request an ambulance</Text>
        <Text>
          Choose a hospital and required ambulance type. We will show assignment
          status here.
        </Text>
        <Button loading={locating}
          label={pickup ? "Refresh pickup location" : "Use current pickup location"}
          accessibilityLabel={locating ? "Locating pickup" : pickup ? "Refresh pickup location" : "Use current pickup location"}
          leftIcon={locating ? <Loader theme="patient" /> : undefined}
          disabled={locating}
          variant="outline"
          onPress={() => void locatePickup()}
        />
        {pickup ? (
          <Text>
            Pickup coordinates confirmed. Enter a landmark so the driver can
            find you.
          </Text>
        ) : null}
        <Input
          label="Pickup address or landmark"
          value={pickupAddress}
          onChangeText={(value) => {
            setPickupAddress(value);
            setIdempotencyKey(Crypto.randomUUID());
          }}
        />
        <Text style={styles.subtitle}>Ambulance type</Text>
        <View style={styles.options}>
          {(["BLS", "ALS", "NICU"] as const).map((code) => (
            <Button
              key={code}
              label={code}
              variant={capabilityCode === code ? "primary" : "outline"}
              onPress={() => {
                setCapabilityCode(code);
                setIdempotencyKey(Crypto.randomUUID());
              }}
            />
          ))}
        </View>
        <Text style={styles.subtitle}>Destination hospital</Text>
        {hospitals.isLoading ? <Loader theme="patient" style={{ minHeight: 44 }} /> : null}
        {hospitals.data?.length === 0 ? (
          <Text>No active hospitals are available in the directory yet.</Text>
        ) : null}
        {hospitals.data?.map((hospital) => (
          <View key={hospital.id} style={styles.card}>
            <Text style={styles.name}>{hospital.name}</Text>
            <Text>{hospital.address}</Text>
            {hospital.distance_meters !== null ? (
              <Text>
                {(hospital.distance_meters / 1000).toFixed(1)} km from pickup
              </Text>
            ) : null}
            <Button
              label={
                hospitalId === hospital.id ? "Selected" : "Choose hospital"
              }
              variant={hospitalId === hospital.id ? "primary" : "outline"}
              onPress={() => {
                setHospitalId(hospital.id);
                setIdempotencyKey(Crypto.randomUUID());
              }}
            />
          </View>
        ))}
        <Button loading={request.isPending}
          label="Request ambulance"
          disabled={
            request.isPending ||
            !!activeBooking ||
            !pickup ||
            !hospitalId ||
            pickupAddress.trim().length < 5
          }
          onPress={() => request.mutate()}
        />
        {activeBooking ? (
          <Text>You already have an active ambulance request.</Text>
        ) : null}
        <LiveAmbulanceRequestsList
          bookings={bookings.data}
          isLoading={bookings.isLoading}
          error={bookings.error}
          onRefresh={() => void bookings.refetch()}
          activeBookingId={activeBooking?.id}
          trackingData={tracking.data}
          pinVisible={pinVisible}
          isPinLoading={verificationPin.isLoading}
          pinData={verificationPin.data}
          isRefreshPending={refreshDispatch.isPending}
          onRefreshDispatch={(id) => refreshDispatch.mutate(id)}
          isCancelPending={cancel.isPending}
          onCancel={(b) => cancel.mutate(b)}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 120, gap: 14 },
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
  error: { color: "#B42318" },
});
