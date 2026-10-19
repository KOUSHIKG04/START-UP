import { useLiveAmbulanceBooking } from "../hooks/useLiveAmbulanceBooking";
import type { LiveAmbulanceBookingScreenProps } from "../types/live-ambulance-booking-screen";
import { AppText as Text } from "@startup/mobile-ui";

import { ScrollView, StyleSheet, View } from "react-native";
import * as Crypto from "expo-crypto";

import {
  Button,
  Header,
  Input,
  Loader,
  SafeAreaView,
} from "@startup/mobile-ui";

import { LiveAmbulanceRequestsList } from "../components/LiveAmbulanceRequestsList";

export function LiveAmbulanceBookingScreen({
  onBackPress,
}: LiveAmbulanceBookingScreenProps) {
  const {
    pickup,
    pickupAddress,
    setPickupAddress,
    hospitalId,
    setHospitalId,
    capabilityCode,
    setCapabilityCode,
    setIdempotencyKey,
    locating,
    error,
    hospitals,
    bookings,
    activeBooking,
    pinVisible,
    verificationPin,
    tracking,
    locatePickup,
    request,
    cancel,
    refreshDispatch,
  } = useLiveAmbulanceBooking({ onBackPress });
  return (
    <SafeAreaView style={styles.screen}>
      <Header title="Ambulance" app="patient" onBackPress={onBackPress} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="cardHeading" style={styles.title}>
          Request an ambulance
        </Text>
        <Text variant="body">
          Choose a hospital and required ambulance type. We will show assignment
          status here.
        </Text>
        <Button
          loading={locating}
          label={
            pickup ? "Refresh pickup location" : "Use current pickup location"
          }
          accessibilityLabel={
            locating
              ? "Locating pickup"
              : pickup
                ? "Refresh pickup location"
                : "Use current pickup location"
          }
          leftIcon={locating ? <Loader theme="patient" /> : undefined}
          disabled={locating}
          variant="outline"
          onPress={() => void locatePickup()}
        />
        {pickup ? (
          <Text variant="body">
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
        <Text variant="body" style={styles.subtitle}>
          Ambulance type
        </Text>
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
        <Text variant="body" style={styles.subtitle}>
          Destination hospital
        </Text>
        {hospitals.isLoading ? (
          <Loader theme="patient" style={{ minHeight: 44 }} />
        ) : null}
        {hospitals.data?.length === 0 ? (
          <Text variant="body">
            No active hospitals are available in the directory yet.
          </Text>
        ) : null}
        {hospitals.data?.map((hospital) => (
          <View key={hospital.id} style={styles.card}>
            <Text variant="body" style={styles.name}>
              {hospital.name}
            </Text>
            <Text variant="body">{hospital.address}</Text>
            {hospital.distance_meters !== null ? (
              <Text variant="body">
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
        <Button
          loading={request.isPending}
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
          <Text variant="body">
            You already have an active ambulance request.
          </Text>
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
